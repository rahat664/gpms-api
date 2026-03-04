import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { AssignPlanLineDto } from './dto/assign-plan-line.dto';
import { CreatePlanDto } from './dto/create-plan.dto';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(factoryId: string, dto: CreatePlanDto) {
    const startDate = this.toStartOfDay(dto.startDate);
    const endDate = this.toStartOfDay(dto.endDate);

    if (startDate > endDate) {
      throw new BadRequestException('startDate cannot be after endDate');
    }

    return this.prisma.client.productionPlan.create({
      data: {
        factoryId,
        name: dto.name,
        startDate,
        endDate,
      },
    });
  }

  async assign(
    factoryId: string,
    planId: string,
    dto: AssignPlanLineDto,
    user: AuthenticatedUser,
  ) {
    const plan = await this.ensurePlanExists(factoryId, planId);
    const po = await this.ensurePoExists(factoryId, dto.poId);
    const poItem = await this.ensurePoItemExists(factoryId, dto.poItemId, dto.poId);
    await this.ensureLineExists(factoryId, dto.lineId);

    const assignmentStartDate = this.toStartOfDay(dto.startDate);
    const assignmentEndDate = this.toStartOfDay(dto.endDate);

    if (assignmentStartDate > assignmentEndDate) {
      throw new BadRequestException('Assignment startDate cannot be after endDate');
    }

    if (
      assignmentStartDate < this.toStartOfDay(plan.startDate) ||
      assignmentEndDate > this.toStartOfDay(plan.endDate)
    ) {
      throw new BadRequestException('Assignment dates must be within the plan range');
    }

    if (po.id !== poItem.poId) {
      throw new BadRequestException('poItemId does not belong to the provided poId');
    }

    this.validateDailyTargets(dto, assignmentStartDate, assignmentEndDate, plan);

    if (user.role !== RoleName.ADMIN) {
      const existingAssignment = await this.prisma.client.planLine.findFirst({
        where: {
          factoryId,
          poItemId: dto.poItemId,
        },
      });

      if (existingAssignment) {
        throw new ConflictException(
          'This PO item is already assigned to a line. Only ADMIN can assign it again.',
        );
      }
    }

    return this.prisma.client.$transaction(async (tx) => {
      const planLine = await tx.planLine.create({
        data: {
          factoryId,
          planId,
          poId: dto.poId,
          poItemId: dto.poItemId,
          lineId: dto.lineId,
          startDate: assignmentStartDate,
          endDate: assignmentEndDate,
        },
      });

      await tx.dailyTarget.createMany({
        data: dto.dailyTargets.map((target) => ({
          planLineId: planLine.id,
          date: this.toStartOfDay(target.date),
          targetQty: target.targetQty,
        })),
      });

      return tx.planLine.findUnique({
        where: { id: planLine.id },
        include: {
          po: true,
          poItem: {
            include: {
              style: true,
            },
          },
          line: true,
          targets: {
            orderBy: { date: 'asc' },
          },
        },
      });
    });
  }

  async findOne(factoryId: string, id: string) {
    const plan = await this.prisma.client.productionPlan.findFirst({
      where: {
        id,
        factoryId,
      },
      include: {
        lines: {
          include: {
            po: {
              include: {
                buyer: true,
              },
            },
            poItem: {
              include: {
                style: true,
              },
            },
            line: true,
            targets: {
              orderBy: { date: 'asc' },
            },
          },
          orderBy: { startDate: 'asc' },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Production plan not found');
    }

    return plan;
  }

  private validateDailyTargets(
    dto: AssignPlanLineDto,
    assignmentStartDate: Date,
    assignmentEndDate: Date,
    plan: { startDate: Date; endDate: Date },
  ) {
    const seenDates = new Set<string>();

    for (const target of dto.dailyTargets) {
      const targetDate = this.toStartOfDay(target.date);
      const key = targetDate.toISOString();

      if (seenDates.has(key)) {
        throw new BadRequestException('dailyTargets cannot contain duplicate dates');
      }

      seenDates.add(key);

      if (targetDate < assignmentStartDate || targetDate > assignmentEndDate) {
        throw new BadRequestException(
          'Each daily target date must be within the assignment date range',
        );
      }

      if (
        targetDate < this.toStartOfDay(plan.startDate) ||
        targetDate > this.toStartOfDay(plan.endDate)
      ) {
        throw new BadRequestException(
          'Each daily target date must be within the parent plan range',
        );
      }
    }
  }

  private async ensurePlanExists(factoryId: string, planId: string) {
    const plan = await this.prisma.client.productionPlan.findFirst({
      where: {
        id: planId,
        factoryId,
      },
    });

    if (!plan) {
      throw new NotFoundException('Production plan not found');
    }

    return plan;
  }

  private async ensurePoExists(factoryId: string, poId: string) {
    const po = await this.prisma.client.purchaseOrder.findFirst({
      where: {
        id: poId,
        factoryId,
      },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    return po;
  }

  private async ensurePoItemExists(
    factoryId: string,
    poItemId: string,
    poId: string,
  ) {
    const poItem = await this.prisma.client.pOItem.findFirst({
      where: {
        id: poItemId,
        poId,
        factoryId,
      },
    });

    if (!poItem) {
      throw new NotFoundException('PO item not found');
    }

    return poItem;
  }

  private async ensureLineExists(factoryId: string, lineId: string) {
    const line = await this.prisma.client.sewingLine.findFirst({
      where: {
        id: lineId,
        factoryId,
      },
    });

    if (!line) {
      throw new NotFoundException('Sewing line not found');
    }

    return line;
  }

  private toStartOfDay(input: string | Date) {
    const date = new Date(input);
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }
}
