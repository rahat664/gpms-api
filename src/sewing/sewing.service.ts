import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHourlyOutputDto } from './dto/create-hourly-output.dto';
import { LineStatusQueryDto } from './dto/line-status-query.dto';

@Injectable()
export class SewingService {
  constructor(private readonly prisma: PrismaService) {}

  async createHourlyOutput(factoryId: string, dto: CreateHourlyOutputDto) {
    await this.ensureLineExists(factoryId, dto.lineId);
    const date = this.toStartOfDay(dto.date);

    return this.prisma.client.$transaction(async (tx) => {
      let bundle:
        | {
            id: string;
            qty: number;
            status: string;
          }
        | null = null;

      if (dto.bundleId) {
        bundle = await tx.bundle.findFirst({
          where: {
            id: dto.bundleId,
            factoryId,
          },
          select: {
            id: true,
            qty: true,
            status: true,
          },
        });

        if (!bundle) {
          throw new NotFoundException('Bundle not found');
        }
      }

      const output = await tx.sewingHourlyOutput.create({
        data: {
          factoryId,
          lineId: dto.lineId,
          bundleId: dto.bundleId,
          date,
          hourSlot: dto.hourSlot,
          qty: dto.qty,
        },
        include: {
          line: true,
          bundle: true,
        },
      });

      if (bundle) {
        const cumulativeOutput = await tx.sewingHourlyOutput.aggregate({
          where: {
            factoryId,
            bundleId: bundle.id,
          },
          _sum: {
            qty: true,
          },
        });

        const totalOutput = cumulativeOutput._sum.qty ?? 0;

        if (totalOutput >= bundle.qty && bundle.status !== 'SEWN') {
          await tx.bundle.update({
            where: { id: bundle.id },
            data: { status: 'SEWN' },
          });
        }
      }

      return output;
    });
  }

  async getLineStatus(factoryId: string, query: LineStatusQueryDto) {
    const date = this.toStartOfDay(query.date);
    const nextDate = new Date(date);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);

    const lines = await this.prisma.client.sewingLine.findMany({
      where: { factoryId },
      orderBy: { name: 'asc' },
    });

    const outputs = await this.prisma.client.sewingHourlyOutput.findMany({
      where: {
        factoryId,
        date: {
          gte: date,
          lt: nextDate,
        },
      },
      select: {
        lineId: true,
        hourSlot: true,
        qty: true,
      },
    });

    const bundles = await this.prisma.client.bundle.findMany({
      where: { factoryId },
      include: {
        outputs: {
          select: {
            lineId: true,
          },
        },
        inspections: {
          select: {
            pass: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    const outputByLine = new Map<
      string,
      { totalOutputToday: number; hourlyBreakdown: Record<string, number> }
    >();

    for (const output of outputs) {
      const existing = outputByLine.get(output.lineId) ?? {
        totalOutputToday: 0,
        hourlyBreakdown: {},
      };

      existing.totalOutputToday += output.qty;
      existing.hourlyBreakdown[String(output.hourSlot)] =
        (existing.hourlyBreakdown[String(output.hourSlot)] ?? 0) + output.qty;

      outputByLine.set(output.lineId, existing);
    }

    const wipByLine = new Map<
      string,
      { CUT: number; IN_LINE: number; SEWN: number; QC_PASS: number; QC_FAIL: number }
    >();

    for (const bundle of bundles) {
      const lineId = bundle.outputs.at(-1)?.lineId;

      if (!lineId) {
        continue;
      }

      const existing = wipByLine.get(lineId) ?? {
        CUT: 0,
        IN_LINE: 0,
        SEWN: 0,
        QC_PASS: 0,
        QC_FAIL: 0,
      };

      const latestInspection = bundle.inspections[0];

      if (latestInspection) {
        if (latestInspection.pass) {
          existing.QC_PASS += 1;
        } else {
          existing.QC_FAIL += 1;
        }
      } else if (bundle.status === 'SEWN') {
        existing.SEWN += 1;
      } else if (bundle.status === 'CUT') {
        existing.CUT += 1;
      } else {
        existing.IN_LINE += 1;
      }

      wipByLine.set(lineId, existing);
    }

    return lines.map((line) => {
      const output = outputByLine.get(line.id) ?? {
        totalOutputToday: 0,
        hourlyBreakdown: {},
      };

      const wipCounts = wipByLine.get(line.id) ?? {
        CUT: 0,
        IN_LINE: 0,
        SEWN: 0,
        QC_PASS: 0,
        QC_FAIL: 0,
      };

      return {
        lineId: line.id,
        lineName: line.name,
        totalOutputToday: output.totalOutputToday,
        hourlyBreakdown: output.hourlyBreakdown,
        wipCounts,
      };
    });
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

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date');
    }

    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }
}
