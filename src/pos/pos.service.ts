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

    if (dto.status === POStatus.SHIPPED) {
      await this.validateCanMoveToShipped(factoryId, po);
    }

    if (dto.status === POStatus.CLOSED) {
      await this.validateCanMoveToClosed(factoryId, po);
    }

    return this.prisma.client.purchaseOrder.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.status === POStatus.SHIPPED ? { shipDate: po.shipDate ?? new Date() } : {}),
      },
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

  private async validateCanMoveToShipped(
    factoryId: string,
    po: { id: string; status: POStatus; items: Array<{ id: string; quantity: number }> },
  ) {
    if (po.status !== POStatus.IN_PRODUCTION) {
      throw new BadRequestException(
        'Purchase order can be moved to SHIPPED only from IN_PRODUCTION',
      );
    }

    await this.validateProductionAndQcReadiness(factoryId, po);
  }

  private async validateCanMoveToClosed(
    factoryId: string,
    po: {
      id: string;
      status: POStatus;
      shipDate: Date | null;
      items: Array<{ id: string; quantity: number }>;
    },
  ) {
    if (po.status !== POStatus.SHIPPED) {
      throw new BadRequestException('Purchase order can be moved to CLOSED only from SHIPPED');
    }

    if (!po.shipDate) {
      throw new BadRequestException('Cannot close purchase order without ship date');
    }

    await this.validateProductionAndQcReadiness(factoryId, po);
  }

  private async validateProductionAndQcReadiness(
    factoryId: string,
    po: { id: string; items: Array<{ id: string; quantity: number }> },
  ) {
    if (po.items.length === 0) {
      throw new BadRequestException('Purchase order has no items');
    }

    const bundles = await this.prisma.client.bundle.findMany({
      where: {
        factoryId,
        poItem: {
          poId: po.id,
        },
      },
      select: {
        id: true,
        poItemId: true,
        qty: true,
        inspections: {
          select: {
            pass: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (bundles.length === 0) {
      throw new BadRequestException('Cannot complete status transition without cutting bundles');
    }

    const bundledQtyByPoItemId = new Map<string, number>();
    const bundledCountByPoItemId = new Map<string, number>();

    for (const bundle of bundles) {
      bundledQtyByPoItemId.set(
        bundle.poItemId,
        (bundledQtyByPoItemId.get(bundle.poItemId) ?? 0) + bundle.qty,
      );
      bundledCountByPoItemId.set(
        bundle.poItemId,
        (bundledCountByPoItemId.get(bundle.poItemId) ?? 0) + 1,
      );

      const latestInspection = bundle.inspections[0];
      if (!latestInspection || !latestInspection.pass) {
        throw new BadRequestException(
          'All bundles must have a latest passing QC inspection before status transition',
        );
      }
    }

    const itemsMissingBundles = po.items.filter(
      (item) => (bundledCountByPoItemId.get(item.id) ?? 0) === 0,
    );

    if (itemsMissingBundles.length > 0) {
      throw new BadRequestException(
        'Each PO item must have at least one bundle before status transition',
      );
    }

    const itemsWithInsufficientBundledQty = po.items.filter(
      (item) => (bundledQtyByPoItemId.get(item.id) ?? 0) < item.quantity,
    );

    if (itemsWithInsufficientBundledQty.length > 0) {
      throw new BadRequestException(
        'Bundled quantity must cover PO item quantity before status transition',
      );
    }
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
