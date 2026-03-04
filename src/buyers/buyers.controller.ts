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
import { BuyersService } from './buyers.service';
import { CreateBuyerDto } from './dto/create-buyer.dto';
import { UpdateBuyerDto } from './dto/update-buyer.dto';

@ApiTags('buyers')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-factory-id',
  required: true,
  description: 'Factory UUID selected for the request scope',
})
@Controller('buyers')
export class BuyersController {
  constructor(private readonly buyersService: BuyersService) {}

  @ApiOperation({ summary: 'List buyers for the selected factory' })
  @Get()
  findAll(@FactoryId() factoryId: string) {
    return this.buyersService.findAll(factoryId);
  }

  @ApiOperation({ summary: 'Create a buyer in the selected factory' })
  @Post()
  create(@FactoryId() factoryId: string, @Body() body: CreateBuyerDto) {
    return this.buyersService.create(factoryId, body);
  }

  @ApiOperation({ summary: 'Update a buyer in the selected factory' })
  @Put(':id')
  update(
    @FactoryId() factoryId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdateBuyerDto,
  ) {
    return this.buyersService.update(factoryId, id, body);
  }

  @ApiOperation({ summary: 'Delete a buyer from the selected factory' })
  @Delete(':id')
  remove(
    @FactoryId() factoryId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.buyersService.remove(factoryId, id);
  }
}
