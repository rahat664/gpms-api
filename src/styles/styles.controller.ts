import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FactoryId } from '../auth/auth.decorators';
import { CreateStyleDto } from './dto/create-style.dto';
import { UpdateStyleDto } from './dto/update-style.dto';
import { UpsertBomDto } from './dto/upsert-bom.dto';
import { StylesService } from './styles.service';

@ApiTags('styles')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-factory-id',
  required: true,
  description: 'Factory UUID selected for the request scope',
})
@Controller('styles')
export class StylesController {
  constructor(private readonly stylesService: StylesService) {}

  @ApiOperation({ summary: 'List styles for the selected factory' })
  @Get()
  findAll(@FactoryId() factoryId: string) {
    return this.stylesService.findAll(factoryId);
  }

  @ApiOperation({ summary: 'Create a style in the selected factory' })
  @Post()
  create(@FactoryId() factoryId: string, @Body() body: CreateStyleDto) {
    return this.stylesService.create(factoryId, body);
  }

  @ApiOperation({ summary: 'Update a style in the selected factory' })
  @Put(':id')
  update(
    @FactoryId() factoryId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateStyleDto,
  ) {
    return this.stylesService.update(factoryId, id, body);
  }

  @ApiOperation({ summary: 'Delete a style from the selected factory' })
  @Delete(':id')
  remove(
    @FactoryId() factoryId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.stylesService.remove(factoryId, id);
  }

  @ApiOperation({ summary: 'Create or replace the BOM for a style' })
  @Post(':id/bom')
  upsertBom(
    @FactoryId() factoryId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpsertBomDto,
  ) {
    return this.stylesService.upsertBom(factoryId, id, body);
  }

  @ApiOperation({ summary: 'Get the BOM for a style' })
  @Get(':id/bom')
  getBom(
    @FactoryId() factoryId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.stylesService.getBom(factoryId, id);
  }
}
