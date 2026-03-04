import { Module } from '@nestjs/common';
import { SewingController } from './sewing.controller';
import { SewingService } from './sewing.service';

@Module({
  controllers: [SewingController],
  providers: [SewingService],
})
export class SewingModule {}
