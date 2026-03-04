import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { IS_PUBLIC_KEY, ROLES_KEY, SKIP_FACTORY_GUARD_KEY } from './auth.constants';
import type { AuthenticatedUser, RequestWithAuth } from './auth.types';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);

export const SkipFactoryGuard = () => SetMetadata(SKIP_FACTORY_GUARD_KEY, true);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithAuth>();
    return request.user;
  },
);

export const FactoryId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithAuth>();
    return request.factoryId;
  },
);
