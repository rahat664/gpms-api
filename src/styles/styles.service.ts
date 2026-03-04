import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStyleDto } from './dto/create-style.dto';
import { UpdateStyleDto } from './dto/update-style.dto';
import { UpsertBomDto } from './dto/upsert-bom.dto';

@Injectable()
export class StylesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(factoryId: string) {
    return this.prisma.client.style.findMany({
      where: { factoryId },
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
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(factoryId: string, dto: CreateStyleDto) {
    await this.ensureUniqueStyleNo(factoryId, dto.styleNo);

    return this.prisma.client.style.create({
      data: {
        factoryId,
        styleNo: dto.styleNo,
        name: dto.name,
        season: dto.season,
      },
    });
  }

  async update(factoryId: string, id: string, dto: UpdateStyleDto) {
    await this.ensureStyleExists(factoryId, id);

    if (dto.styleNo) {
      await this.ensureUniqueStyleNo(factoryId, dto.styleNo, id);
    }

    try {
      return await this.prisma.client.style.update({
        where: { id },
        data: {
          ...(dto.styleNo !== undefined ? { styleNo: dto.styleNo } : {}),
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.season !== undefined ? { season: dto.season } : {}),
        },
      });
    } catch (error) {
      this.handleUniqueConstraint(error, 'Style number already exists in the factory');
      throw error;
    }
  }

  async remove(factoryId: string, id: string) {
    await this.ensureStyleExists(factoryId, id);

    await this.prisma.client.$transaction(async (tx) => {
      const bom = await tx.bOMHeader.findUnique({
        where: { styleId: id },
      });

      if (bom) {
        await tx.bOMItem.deleteMany({
          where: { bomId: bom.id },
        });
        await tx.bOMHeader.delete({
          where: { id: bom.id },
        });
      }

      await tx.style.delete({
        where: { id },
      });
    });

    return {
      success: true,
      message: 'Style deleted successfully',
    };
  }

  async upsertBom(factoryId: string, styleId: string, dto: UpsertBomDto) {
    await this.ensureStyleExists(factoryId, styleId);
    await this.ensureMaterialsBelongToFactory(factoryId, dto.items.map((item) => item.materialId));

    return this.prisma.client.$transaction(async (tx) => {
      const bom = await tx.bOMHeader.upsert({
        where: { styleId },
        update: {
          factoryId,
        },
        create: {
          factoryId,
          styleId,
        },
      });

      await tx.bOMItem.deleteMany({
        where: { bomId: bom.id },
      });

      await tx.bOMItem.createMany({
        data: dto.items.map((item) => ({
          bomId: bom.id,
          materialId: item.materialId,
          consumption: item.consumption,
        })),
      });

      return tx.bOMHeader.findUnique({
        where: { id: bom.id },
        include: {
          items: {
            include: {
              material: true,
            },
          },
          style: true,
        },
      });
    });
  }

  async getBom(factoryId: string, styleId: string) {
    await this.ensureStyleExists(factoryId, styleId);

    const bom = await this.prisma.client.bOMHeader.findFirst({
      where: {
        styleId,
        factoryId,
      },
      include: {
        items: {
          include: {
            material: true,
          },
        },
        style: true,
      },
    });

    if (!bom) {
      throw new NotFoundException('BOM not found');
    }

    return bom;
  }

  private async ensureStyleExists(factoryId: string, id: string) {
    const style = await this.prisma.client.style.findFirst({
      where: {
        id,
        factoryId,
      },
    });

    if (!style) {
      throw new NotFoundException('Style not found');
    }

    return style;
  }

  private async ensureUniqueStyleNo(
    factoryId: string,
    styleNo: string,
    excludeId?: string,
  ) {
    const existingStyle = await this.prisma.client.style.findFirst({
      where: {
        factoryId,
        styleNo,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });

    if (existingStyle) {
      throw new ConflictException('Style number already exists in the factory');
    }
  }

  private async ensureMaterialsBelongToFactory(
    factoryId: string,
    materialIds: string[],
  ) {
    const uniqueMaterialIds = [...new Set(materialIds)];

    const materials = await this.prisma.client.material.findMany({
      where: {
        factoryId,
        id: { in: uniqueMaterialIds },
      },
      select: {
        id: true,
      },
    });

    if (materials.length !== uniqueMaterialIds.length) {
      throw new NotFoundException(
        'One or more materials were not found in the selected factory',
      );
    }
  }

  private handleUniqueConstraint(error: unknown, message: string): never | void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(message);
    }
  }
}
