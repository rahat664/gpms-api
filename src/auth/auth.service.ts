import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcrypt';
import type { CookieOptions } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { email },
      include: {
        access: {
          include: {
            factory: true,
          },
          orderBy: {
            factory: {
              name: 'asc',
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await compare(password, user.password);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      }),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        factories: user.access.map((entry) => ({
          id: entry.factory.id,
          code: entry.factory.code,
          name: entry.factory.name,
        })),
      },
    };
  }

  async me(user: AuthenticatedUser) {
    const profile = await this.prisma.client.user.findUnique({
      where: { id: user.id },
      include: {
        access: {
          include: {
            factory: true,
          },
          orderBy: {
            factory: {
              name: 'asc',
            },
          },
        },
      },
    });

    if (!profile) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      factories: profile.access.map((entry) => ({
        id: entry.factory.id,
        code: entry.factory.code,
        name: entry.factory.name,
      })),
    };
  }

  getCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
  }
}
