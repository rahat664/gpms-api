import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InventoryTxnType } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { GetStockQueryDto } from './dto/get-stock-query.dto';
import {
  IssueToCuttingDto,
  ReceiveInventoryDto,
} from './dto/create-inventory-txn.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async receive(
    factoryId: string,
    user: AuthenticatedUser,
    dto: ReceiveInventoryDto,
  ) {
    if (dto.refType !== 'GRN') {
      throw new BadRequestException('refType must be GRN');
    }

    const material = await this.ensureMaterialExists(factoryId, dto.materialId);

    return this.prisma.client.$transaction(async (tx) => {
      const txn = await tx.inventoryTxn.create({
        data: {
          factoryId,
          materialId: dto.materialId,
          type: InventoryTxnType.IN,
          qty: dto.qty,
          refType: dto.refType,
          refId: dto.refId,
          note: dto.note,
        },
        include: {
          material: true,
        },
      });

      await tx.auditLog.create({
        data: {
          factoryId,
          userId: user.id,
          materialId: dto.materialId,
          action: 'INVENTORY_RECEIVE',
          entityType: 'InventoryTxn',
          entityId: txn.id,
          metadata: {
            txnType: InventoryTxnType.IN,
            qty: dto.qty,
            refType: dto.refType,
            refId: dto.refId ?? null,
            note: dto.note ?? null,
            materialName: material.name,
          },
        },
      });

      return txn;
    });
  }

  async issueToCutting(
    factoryId: string,
    user: AuthenticatedUser,
    dto: IssueToCuttingDto,
  ) {
    if (dto.refType !== 'ISSUE_CUTTING') {
      throw new BadRequestException('refType must be ISSUE_CUTTING');
    }

    const material = await this.ensureMaterialExists(factoryId, dto.materialId);
    const availableStock = await this.getMaterialStock(factoryId, dto.materialId);

    if (dto.qty > availableStock) {
      throw new BadRequestException(
        `Insufficient stock. Available qty: ${availableStock}`,
      );
    }

    return this.prisma.client.$transaction(async (tx) => {
      const txn = await tx.inventoryTxn.create({
        data: {
          factoryId,
          materialId: dto.materialId,
          type: InventoryTxnType.OUT,
          qty: dto.qty,
          refType: dto.refType,
          refId: dto.refId,
          note: dto.note,
        },
        include: {
          material: true,
        },
      });

      await tx.auditLog.create({
        data: {
          factoryId,
          userId: user.id,
          materialId: dto.materialId,
          action: 'INVENTORY_ISSUE_TO_CUTTING',
          entityType: 'InventoryTxn',
          entityId: txn.id,
          metadata: {
            txnType: InventoryTxnType.OUT,
            qty: dto.qty,
            refType: dto.refType,
            refId: dto.refId ?? null,
            note: dto.note ?? null,
            materialName: material.name,
            availableStockBeforeIssue: availableStock,
          },
        },
      });

      return txn;
    });
  }

  async getStock(factoryId: string, query: GetStockQueryDto) {
    if (query.materialId) {
      await this.ensureMaterialExists(factoryId, query.materialId);
    }

    const materials = await this.prisma.client.material.findMany({
      where: {
        factoryId,
        ...(query.materialId ? { id: query.materialId } : {}),
      },
      select: {
        id: true,
        name: true,
        type: true,
        uom: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    const groupedTxns = await this.prisma.client.inventoryTxn.groupBy({
      by: ['materialId', 'type'],
      where: {
        factoryId,
        ...(query.materialId ? { materialId: query.materialId } : {}),
      },
      _sum: {
        qty: true,
      },
    });

    return materials.map((material) => {
      const inboundQty = groupedTxns
        .filter(
          (entry) =>
            entry.materialId === material.id && entry.type === InventoryTxnType.IN,
        )
        .reduce((sum, entry) => sum + (entry._sum.qty ?? 0), 0);

      const outboundQty = groupedTxns
        .filter(
          (entry) =>
            entry.materialId === material.id && entry.type === InventoryTxnType.OUT,
        )
        .reduce((sum, entry) => sum + (entry._sum.qty ?? 0), 0);

      return {
        materialId: material.id,
        materialName: material.name,
        materialType: material.type,
        uom: material.uom,
        availableQty: inboundQty - outboundQty,
      };
    });
  }

  private async ensureMaterialExists(factoryId: string, materialId: string) {
    const material = await this.prisma.client.material.findFirst({
      where: {
        id: materialId,
        factoryId,
      },
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    return material;
  }

  private async getMaterialStock(factoryId: string, materialId: string) {
    const groupedTxns = await this.prisma.client.inventoryTxn.groupBy({
      by: ['type'],
      where: {
        factoryId,
        materialId,
      },
      _sum: {
        qty: true,
      },
    });

    const inboundQty = groupedTxns
      .filter((entry) => entry.type === InventoryTxnType.IN)
      .reduce((sum, entry) => sum + (entry._sum.qty ?? 0), 0);

    const outboundQty = groupedTxns
      .filter((entry) => entry.type === InventoryTxnType.OUT)
      .reduce((sum, entry) => sum + (entry._sum.qty ?? 0), 0);

    return inboundQty - outboundQty;
  }
}
