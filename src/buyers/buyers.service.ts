import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBuyerDto } from './dto/create-buyer.dto';
import { UpdateBuyerDto } from './dto/update-buyer.dto';

@Injectable()
export class BuyersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(factoryId: string) {
    return this.prisma.client.buyer.findMany({
      where: { factoryId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(factoryId: string, dto: CreateBuyerDto) {
    const existingBuyer = await this.prisma.client.buyer.findFirst({
      where: {
        factoryId,
        name: dto.name,
      },
    });

    if (existingBuyer) {
      throw new ConflictException('Buyer with this name already exists in the factory');
    }

    return this.prisma.client.buyer.create({
      data: {
        factoryId,
        name: dto.name,
        country: dto.country,
      },
    });
  }

  async update(factoryId: string, id: string, dto: UpdateBuyerDto) {
    await this.ensureBuyerExists(factoryId, id);

    if (dto.name) {
      const conflictingBuyer = await this.prisma.client.buyer.findFirst({
        where: {
          factoryId,
          name: dto.name,
          id: { not: id },
        },
      });

      if (conflictingBuyer) {
        throw new ConflictException('Buyer with this name already exists in the factory');
      }
    }

    return this.prisma.client.buyer.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.country !== undefined ? { country: dto.country } : {}),
      },
    });
  }

  async remove(factoryId: string, id: string) {
    await this.ensureBuyerExists(factoryId, id);

    await this.prisma.client.buyer.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Buyer deleted successfully',
    };
  }

  private async ensureBuyerExists(factoryId: string, id: string) {
    const buyer = await this.prisma.client.buyer.findFirst({
      where: {
        id,
        factoryId,
      },
    });

    if (!buyer) {
      throw new NotFoundException('Buyer not found');
    }

    return buyer;
  }
}
