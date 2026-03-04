import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { POStatus, Prisma, RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AddPoItemDto } from './dto/add-po-item.dto';
import { CreatePurchaseOrderDto } from './dto/create-po.dto';
import { UpdatePoStatusDto } from './dto/update-po-status.dto';

const STATUS_ORDER: POStatus[] = [
  POStatus.DRAFT,
  POStatus.CONFIRMED,
  POStatus.IN_PRODUCTION,
  POStatus.SHIPPED,
  POStatus.CLOSED,
];

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(factoryId: string, dto: CreatePurchaseOrderDto) {
    await this.ensureBuyerExists(factoryId, dto.buyerId);

    const existingPo = await this.prisma.client.purchaseOrder.findFirst({
      where: {
        factoryId,
        poNo: dto.poNo,
      },
    });

    if (existingPo) {
      throw new ConflictException('PO number already exists in the factory');
    }

    return this.prisma.client.purchaseOrder.create({
      data: {
        factoryId,
        poNo: dto.poNo,
        buyerId: dto.buyerId,
        status: POStatus.DRAFT,
      },
      include: {
        buyer: true,
        items: true,
      },
    });
  }

  async addItem(factoryId: string, poId: string, dto: AddPoItemDto) {
    const po = await this.ensurePoExists(factoryId, poId);

    if (po.status !== POStatus.DRAFT) {
      throw new BadRequestException('Items can only be added while PO is in DRAFT status');
    }

    await this.ensureStyleExists(factoryId, dto.styleId);

    return this.prisma.client.pOItem.create({
      data: {
        factoryId,
        poId,
        styleId: dto.styleId,
        color: dto.color,
        quantity: dto.quantity,
        sizeBreakdown:
          dto.sizeBreakdown !== undefined
            ? (dto.sizeBreakdown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
      },
      include: {
        style: true,
      },
    });
  }

  async findAll(factoryId: string) {
    return this.prisma.client.purchaseOrder.findMany({
      where: { factoryId },
      include: {
        buyer: true,
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(factoryId: string, id: string) {
    const po = await this.prisma.client.purchaseOrder.findFirst({
      where: {
        id,
        factoryId,
      },
      include: {
        buyer: true,
        items: {
          include: {
            style: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    return po;
  }

  async confirm(factoryId: string, id: string) {
    const po = await this.prisma.client.purchaseOrder.findFirst({
      where: {
        id,
        factoryId,
      },
      include: {
        buyer: true,
        items: true,
      },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    if (po.status !== POStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT purchase orders can be confirmed');
    }

    if (po.items.length === 0) {
      throw new BadRequestException('Purchase order must have at least one item before confirmation');
    }

    return this.prisma.client.purchaseOrder.update({
      where: { id },
      data: { status: POStatus.CONFIRMED },
      include: {
        buyer: true,
        items: {
          include: {
            style: true,
          },
        },
      },
    });
  }

  async updateStatus(
    factoryId: string,
    id: string,
    dto: UpdatePoStatusDto,
    user: AuthenticatedUser,
  ) {
    const po = await this.prisma.client.purchaseOrder.findFirst({
      where: {
        id,
        factoryId,
      },
      include: {
        buyer: true,
        items: true,
      },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    const currentIndex = STATUS_ORDER.indexOf(po.status);
    const nextIndex = STATUS_ORDER.indexOf(dto.status);

    if (nextIndex === -1) {
      throw new BadRequestException('Invalid purchase order status');
    }

    if (po.status === dto.status) {
      return po;
    }

    if (user.role !== RoleName.ADMIN) {
      if (nextIndex !== currentIndex + 1) {
        throw new BadRequestException(
          'Non-admin users can only move purchase orders to the next status',
        );
      }
    }

    return this.prisma.client.purchaseOrder.update({
      where: { id },
      data: { status: dto.status },
      include: {
        buyer: true,
        items: {
          include: {
            style: true,
          },
        },
      },
    });
  }

  async getMaterialRequirement(factoryId: string, id: string) {
    const po = await this.prisma.client.purchaseOrder.findFirst({
      where: {
        id,
        factoryId,
      },
      include: {
        items: {
          include: {
            style: {
              include: {
                bom: {
                  include: {
                    items: {
                      include: {
                        material: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    if (po.items.length === 0) {
      throw new BadRequestException('Purchase order has no items');
    }

    const stylesWithoutBom = po.items
      .filter((item) => !item.style.bom || item.style.bom.items.length === 0)
      .map((item) => item.style.styleNo);

    if (stylesWithoutBom.length > 0) {
      throw new BadRequestException(
        `Missing BOM for styles: ${[...new Set(stylesWithoutBom)].join(', ')}`,
      );
    }

    const materialMap = new Map<
      string,
      { materialId: string; materialName: string; requiredQty: number; uom: string }
    >();

    for (const item of po.items) {
      for (const bomItem of item.style.bom!.items) {
        const requiredQty = bomItem.consumption * item.quantity;
        const existing = materialMap.get(bomItem.materialId);

        if (existing) {
          existing.requiredQty += requiredQty;
          continue;
        }

        materialMap.set(bomItem.materialId, {
          materialId: bomItem.materialId,
          materialName: bomItem.material.name,
          requiredQty,
          uom: bomItem.material.uom,
        });
      }
    }

    return {
      poId: po.id,
      poNo: po.poNo,
      status: po.status,
      materials: [...materialMap.values()].sort((a, b) =>
        a.materialName.localeCompare(b.materialName),
      ),
    };
  }

  private async ensureBuyerExists(factoryId: string, buyerId: string) {
    const buyer = await this.prisma.client.buyer.findFirst({
      where: {
        id: buyerId,
        factoryId,
      },
    });

    if (!buyer) {
      throw new NotFoundException('Buyer not found');
    }

    return buyer;
  }

  private async ensureStyleExists(factoryId: string, styleId: string) {
    const style = await this.prisma.client.style.findFirst({
      where: {
        id: styleId,
        factoryId,
      },
    });

    if (!style) {
      throw new NotFoundException('Style not found');
    }

    return style;
  }
  private async ensurePoExists(factoryId: string, id: string) {
    const po = await this.prisma.client.purchaseOrder.findFirst({
      where: {
        id,
        factoryId,
      },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    return po;
  }
}
