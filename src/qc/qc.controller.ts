import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FactoryId } from '../auth/auth.decorators';
import { CreateQcInspectionDto } from './dto/create-qc-inspection.dto';
import { QcSummaryQueryDto } from './dto/qc-summary-query.dto';
import { QcService } from './qc.service';

@ApiTags('qc')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-factory-id',
  required: true,
  description: 'Factory UUID selected for the request scope',
})
@Controller('qc')
export class QcController {
  constructor(private readonly qcService: QcService) {}

  @ApiOperation({ summary: 'Create a QC inspection for a bundle' })
  @Post('inspect')
  inspect(
    @FactoryId() factoryId: string,
    @Body() body: CreateQcInspectionDto,
  ) {
    return this.qcService.inspect(factoryId, body);
  }

  @ApiOperation({ summary: 'Get QC summary for a specific date' })
  @Get('summary')
  getSummary(
    @FactoryId() factoryId: string,
    @Query() query: QcSummaryQueryDto,
  ) {
    return this.qcService.getSummary(factoryId, query);
  }
}
