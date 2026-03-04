import { Module } from '@nestjs/common';
import { CuttingController } from './cutting.controller';
import { CuttingService } from './cutting.service';

@Module({
  controllers: [CuttingController],
  providers: [CuttingService],
})
export class CuttingModule {}
