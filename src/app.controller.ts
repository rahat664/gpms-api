import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public, SkipFactoryGuard } from './auth/auth.decorators';

@Controller()
@Public()
@SkipFactoryGuard()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
