import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQcInspectionDto } from './dto/create-qc-inspection.dto';
import { QcSummaryQueryDto } from './dto/qc-summary-query.dto';

@Injectable()
export class QcService {
  constructor(private readonly prisma: PrismaService) {}

  async inspect(factoryId: string, dto: CreateQcInspectionDto) {
    if (dto.pass && dto.defects && dto.defects.length > 0) {
      throw new BadRequestException(
        'Passing inspections should not include defect entries',
      );
    }

    const bundle = await this.prisma.client.bundle.findFirst({
      where: {
        id: dto.bundleId,
        factoryId,
      },
    });

    if (!bundle) {
      throw new NotFoundException('Bundle not found');
    }

    return this.prisma.client.$transaction(async (tx) => {
      const inspection = await tx.qCInspection.create({
        data: {
          factoryId,
          bundleId: dto.bundleId,
          type: dto.type,
          pass: dto.pass,
          notes: dto.notes,
        },
      });

      if (dto.defects && dto.defects.length > 0) {
        await tx.qCDefect.createMany({
          data: dto.defects.map((defect) => ({
            inspectionId: inspection.id,
            defectType: defect.defectType,
            count: defect.count,
          })),
        });
      }

      await tx.bundle.update({
        where: { id: dto.bundleId },
        data: {
          status: dto.pass ? 'QC_PASS' : 'QC_FAIL',
        },
      });

      return tx.qCInspection.findUnique({
        where: { id: inspection.id },
        include: {
          defects: true,
          bundle: true,
        },
      });
    });
  }

  async getSummary(factoryId: string, query: QcSummaryQueryDto) {
    const date = this.toStartOfDay(query.date);
    const nextDate = new Date(date);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);

    const inspections = await this.prisma.client.qCInspection.findMany({
      where: {
        factoryId,
        createdAt: {
          gte: date,
          lt: nextDate,
        },
      },
      select: {
        id: true,
        pass: true,
      },
    });

    const totalInspected = inspections.length;
    const passedCount = inspections.filter((inspection) => inspection.pass).length;

    const defectRows = await this.prisma.client.qCDefect.findMany({
      where: {
        inspection: {
          factoryId,
          createdAt: {
            gte: date,
            lt: nextDate,
          },
        },
      },
      select: {
        defectType: true,
        count: true,
      },
    });

    const defectMap = new Map<string, number>();

    for (const defect of defectRows) {
      defectMap.set(
        defect.defectType,
        (defectMap.get(defect.defectType) ?? 0) + defect.count,
      );
    }

    const totalDefects = defectRows.reduce((sum, defect) => sum + defect.count, 0);
    const topDefects = [...defectMap.entries()]
      .map(([defectType, count]) => ({ defectType, count }))
      .sort((a, b) => b.count - a.count || a.defectType.localeCompare(b.defectType));

    return {
      totalInspected,
      passRate: totalInspected === 0 ? 0 : (passedCount / totalInspected) * 100,
      topDefects,
      dhuEstimate: totalInspected === 0 ? 0 : (totalDefects / totalInspected) * 100,
    };
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
