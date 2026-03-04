import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FactoryId } from '../auth/auth.decorators';
import { PlanVsActualQueryDto } from './dto/plan-vs-actual-query.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-factory-id',
  required: true,
  description: 'Factory UUID selected for the request scope',
})
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @ApiOperation({
    summary: 'Get target vs actual output by line for a given date',
  })
  @Get('plan-vs-actual')
  getPlanVsActual(
    @FactoryId() factoryId: string,
    @Query() query: PlanVsActualQueryDto,
  ) {
    return this.reportsService.getPlanVsActual(factoryId, query.date);
  }
}
