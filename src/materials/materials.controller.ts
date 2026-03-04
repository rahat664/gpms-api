import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FactoryId } from '../auth/auth.decorators';
import { CreateMaterialDto } from './dto/create-material.dto';
import { MaterialsService } from './materials.service';

@ApiTags('materials')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-factory-id',
  required: true,
  description: 'Factory UUID selected for the request scope',
})
@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @ApiOperation({ summary: 'List materials for the selected factory' })
  @Get()
  findAll(@FactoryId() factoryId: string) {
    return this.materialsService.findAll(factoryId);
  }

  @ApiOperation({ summary: 'Create a material in the selected factory' })
  @Post()
  create(@FactoryId() factoryId: string, @Body() body: CreateMaterialDto) {
    return this.materialsService.create(factoryId, body);
  }
}
