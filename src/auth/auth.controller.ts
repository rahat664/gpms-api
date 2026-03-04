import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser, Public, SkipFactoryGuard } from './auth.decorators';
import { LoginDto } from './dto/login.dto';
import type { Response } from 'express';
import type { AuthenticatedUser } from './auth.types';

@Controller('auth')
@SkipFactoryGuard()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(body.email, body.password);
    response.cookie(
      'gpms_access',
      result.accessToken,
      this.authService.getCookieOptions(),
    );

    return {
      user: result.user,
      factories: result.user.factories,
      activeFactory: result.user.factories[0] ?? null,
    };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('gpms_access', this.authService.getCookieOptions());

    return { success: true };
  }

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.authService.me(user);

    return {
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
      },
      factories: profile.factories,
      activeFactory: profile.factories[0] ?? null,
    };
  }
}
