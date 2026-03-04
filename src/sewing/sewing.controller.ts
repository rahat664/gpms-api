import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FactoryId } from '../auth/auth.decorators';
import { CreateHourlyOutputDto } from './dto/create-hourly-output.dto';
import { LineStatusQueryDto } from './dto/line-status-query.dto';
import { SewingService } from './sewing.service';

@ApiTags('sewing')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-factory-id',
  required: true,
  description: 'Factory UUID selected for the request scope',
})
@Controller('sewing')
export class SewingController {
  constructor(private readonly sewingService: SewingService) {}

  @ApiOperation({ summary: 'Create an hourly sewing output entry' })
  @Post('hourly-output')
  createHourlyOutput(
    @FactoryId() factoryId: string,
    @Body() body: CreateHourlyOutputDto,
  ) {
    return this.sewingService.createHourlyOutput(factoryId, body);
  }

  @ApiOperation({ summary: 'Get line status snapshot for a given date' })
  @Get('line-status')
  getLineStatus(
    @FactoryId() factoryId: string,
    @Query() query: LineStatusQueryDto,
  ) {
    return this.sewingService.getLineStatus(factoryId, query);
  }
}
