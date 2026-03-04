import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FactoryId } from '../auth/auth.decorators';
import { CuttingService } from './cutting.service';
import { CreateCuttingBatchDto } from './dto/create-cutting-batch.dto';
import { CreateBundlesDto } from './dto/create-bundles.dto';

@ApiTags('cutting')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-factory-id',
  required: true,
  description: 'Factory UUID selected for the request scope',
})
@Controller('cutting')
export class CuttingController {
  constructor(private readonly cuttingService: CuttingService) {}

  @ApiOperation({ summary: 'Create a cutting batch' })
  @Post('batches')
  createBatch(
    @FactoryId() factoryId: string,
    @Body() body: CreateCuttingBatchDto,
  ) {
    return this.cuttingService.createBatch(factoryId, body);
  }

  @ApiOperation({ summary: 'Create bundles for a cutting batch' })
  @Post('batches/:id/bundles')
  createBundles(
    @FactoryId() factoryId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: CreateBundlesDto,
  ) {
    return this.cuttingService.createBundles(factoryId, id, body);
  }

  @ApiOperation({ summary: 'Get a cutting batch with bundles' })
  @Get('batches/:id')
  findOne(
    @FactoryId() factoryId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.cuttingService.findOne(factoryId, id);
  }
}
