import { RoleName } from '@prisma/client';
import { Request } from 'express';

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: RoleName;
};

export type RequestWithAuth = Request & {
  user?: AuthenticatedUser;
  factoryId?: string;
  cookies?: Record<string, string>;
};
