import { Module } from '@nestjs/common';
import { ReportsController } from '../reports/reports.controller';
import { ReportsService } from '../reports/reports.service';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';

@Module({
  controllers: [PlansController, ReportsController],
  providers: [PlansService, ReportsService],
})
export class PlansModule {}
