import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlanVsActual(factoryId: string, dateInput: string) {
    const date = this.toStartOfDay(dateInput);
    const nextDate = new Date(date);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);

    const targetRows = await this.prisma.client.dailyTarget.findMany({
      where: {
        date,
        planLine: {
          factoryId,
        },
      },
      include: {
        planLine: {
          include: {
            line: true,
            plan: true,
          },
        },
      },
    });

    const actualRows = await this.prisma.client.sewingHourlyOutput.groupBy({
      by: ['lineId'],
      where: {
        factoryId,
        date: {
          gte: date,
          lt: nextDate,
        },
      },
      _sum: {
        qty: true,
      },
    });

    const actualByLineId = new Map(
      actualRows.map((row) => [row.lineId, row._sum.qty ?? 0]),
    );

    return targetRows.map((target) => ({
      lineId: target.planLine.line.id,
      lineName: target.planLine.line.name,
      planId: target.planLine.plan.id,
      planName: target.planLine.plan.name,
      planLineId: target.planLine.id,
      date: target.date,
      targetQty: target.targetQty,
      actualQty: actualByLineId.get(target.planLine.line.id) ?? 0,
    }));
  }

  private toStartOfDay(input: string | Date) {
    const date = new Date(input);
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }
}
