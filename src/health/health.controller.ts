import { Controller, Get } from '@nestjs/common';
import { Public, SkipFactoryGuard } from '../auth/auth.decorators';

@Controller('health')
@Public()
@SkipFactoryGuard()
export class HealthController {
  @Get()
  health() {
    return { status: 'ok', service: 'gpms-api' };
  }
}
