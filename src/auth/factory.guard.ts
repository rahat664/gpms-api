import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { IS_PUBLIC_KEY, SKIP_FACTORY_GUARD_KEY } from './auth.constants';
import type { RequestWithAuth } from './auth.types';

@Injectable()
export class FactoryGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const skipFactoryGuard = this.reflector.getAllAndOverride<boolean>(
      SKIP_FACTORY_GUARD_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic || skipFactoryGuard) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithAuth>();

    if (!request.user) {
      throw new ForbiddenException('Authentication required');
    }

    const factoryHeader = request.headers['x-factory-id'];
    const factoryId = Array.isArray(factoryHeader)
      ? factoryHeader[0]
      : factoryHeader;

    if (!factoryId) {
      throw new BadRequestException('x-factory-id header is required');
    }

    if (!this.isUuid(factoryId)) {
      throw new BadRequestException('x-factory-id must be a valid UUID');
    }

    const access = await this.prisma.client.userFactoryAccess.findUnique({
      where: {
        userId_factoryId: {
          userId: request.user.id,
          factoryId,
        },
      },
    });

    if (!access) {
      throw new ForbiddenException('User does not have access to this factory');
    }

    request.factoryId = factoryId;

    return true;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }
}
