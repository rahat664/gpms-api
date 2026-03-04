import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCuttingBatchDto } from './dto/create-cutting-batch.dto';
import { CreateBundlesDto } from './dto/create-bundles.dto';
import { generateBundleCode } from './cutting.utils';

@Injectable()
export class CuttingService {
  constructor(private readonly prisma: PrismaService) {}

  async listBundles(factoryId: string, q?: string) {
    return this.prisma.client.bundle.findMany({
      where: {
        factoryId,
        ...(q
          ? {
              OR: [
                { id: { contains: q, mode: 'insensitive' } },
                { bundleCode: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        bundleCode: true,
        size: true,
        status: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 200,
    });
  }

  async createBatch(factoryId: string, dto: CreateCuttingBatchDto) {
    await this.ensurePoItemExists(factoryId, dto.poItemId);

    const existingBatch = await this.prisma.client.cuttingBatch.findFirst({
      where: {
        factoryId,
        batchNo: dto.batchNo,
      },
    });

    if (existingBatch) {
      throw new ConflictException('Batch number already exists in the factory');
    }

    return this.prisma.client.cuttingBatch.create({
      data: {
        factoryId,
        poItemId: dto.poItemId,
        batchNo: dto.batchNo,
      },
      include: {
        poItem: {
          include: {
            style: true,
            po: true,
          },
        },
        bundles: true,
      },
    });
  }

  async createBundles(factoryId: string, batchId: string, dto: CreateBundlesDto) {
    const batch = await this.prisma.client.cuttingBatch.findFirst({
      where: {
        id: batchId,
        factoryId,
      },
      include: {
        factory: true,
        poItem: true,
        bundles: {
          orderBy: {
            bundleCode: 'asc',
          },
        },
      },
    });

    if (!batch) {
      throw new NotFoundException('Cutting batch not found');
    }

    const nextSequence = this.getNextSequence(batch.bundles, batch.factory.code, batch.batchNo);

    return this.prisma.client.$transaction(async (tx) => {
      const bundleData = dto.bundles.map((bundle, index) => ({
        factoryId,
        poItemId: batch.poItemId,
        batchId: batch.id,
        bundleCode: generateBundleCode(
          batch.factory.code,
          batch.batchNo,
          nextSequence + index,
        ),
        size: bundle.size,
        qty: bundle.qty,
        status: 'CUT',
      }));

      for (const bundle of bundleData) {
        const existingBundle = await tx.bundle.findFirst({
          where: {
            factoryId,
            bundleCode: bundle.bundleCode,
          },
        });

        if (existingBundle) {
          throw new ConflictException(
            `Bundle code ${bundle.bundleCode} already exists in the factory`,
          );
        }
      }

      await tx.bundle.createMany({
        data: bundleData,
      });

      return tx.cuttingBatch.findUnique({
        where: { id: batch.id },
        include: {
          poItem: {
            include: {
              style: true,
              po: true,
            },
          },
          bundles: {
            orderBy: {
              bundleCode: 'asc',
            },
          },
        },
      });
    });
  }

  async findOne(factoryId: string, batchId: string) {
    const batch = await this.prisma.client.cuttingBatch.findFirst({
      where: {
        id: batchId,
        factoryId,
      },
      include: {
        poItem: {
          include: {
            style: true,
            po: true,
          },
        },
        bundles: {
          orderBy: {
            bundleCode: 'asc',
          },
        },
      },
    });

    if (!batch) {
      throw new NotFoundException('Cutting batch not found');
    }

    return batch;
  }

  private async ensurePoItemExists(factoryId: string, poItemId: string) {
    const poItem = await this.prisma.client.pOItem.findFirst({
      where: {
        id: poItemId,
        factoryId,
      },
    });

    if (!poItem) {
      throw new NotFoundException('PO item not found');
    }

    return poItem;
  }

  private getNextSequence(
    bundles: Array<{ bundleCode: string }>,
    factoryCode: string,
    batchNo: string,
  ) {
    const prefix = `BND-${factoryCode}-${batchNo}-`;

    const maxSequence = bundles.reduce((max, bundle) => {
      if (!bundle.bundleCode.startsWith(prefix)) {
        return max;
      }

      const sequence = Number.parseInt(bundle.bundleCode.slice(prefix.length), 10);

      if (Number.isNaN(sequence)) {
        return max;
      }

      return Math.max(max, sequence);
    }, 0);

    return maxSequence + 1;
  }
}
