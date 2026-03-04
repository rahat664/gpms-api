import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaterialDto } from './dto/create-material.dto';

@Injectable()
export class MaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(factoryId: string) {
    return this.prisma.client.material.findMany({
      where: { factoryId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(factoryId: string, dto: CreateMaterialDto) {
    const existingMaterial = await this.prisma.client.material.findFirst({
      where: {
        factoryId,
        name: dto.name,
        type: dto.type,
      },
    });

    if (existingMaterial) {
      throw new ConflictException(
        'Material with this name and type already exists in the factory',
      );
    }

    return this.prisma.client.material.create({
      data: {
        factoryId,
        name: dto.name,
        type: dto.type,
        uom: dto.uom,
      },
    });
  }
}
