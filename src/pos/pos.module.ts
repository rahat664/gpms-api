import { Module } from '@nestjs/common';
import { PurchaseOrdersController } from './pos.controller';
import { PurchaseOrdersService } from './pos.service';

@Module({
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
