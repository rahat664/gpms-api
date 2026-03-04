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
import { CurrentUser, FactoryId } from '../auth/auth.decorators';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AddPoItemDto } from './dto/add-po-item.dto';
import { CreatePurchaseOrderDto } from './dto/create-po.dto';
import { UpdatePoStatusDto } from './dto/update-po-status.dto';
import { PurchaseOrdersService } from './pos.service';

@ApiTags('purchase-orders')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-factory-id',
  required: true,
  description: 'Factory UUID selected for the request scope',
})
@Controller('pos')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @ApiOperation({ summary: 'Create a purchase order header' })
  @Post()
  create(
    @FactoryId() factoryId: string,
    @Body() body: CreatePurchaseOrderDto,
  ) {
    return this.purchaseOrdersService.create(factoryId, body);
  }

  @ApiOperation({ summary: 'Add an item to a draft purchase order' })
  @Post(':id/items')
  addItem(
    @FactoryId() factoryId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: AddPoItemDto,
  ) {
    return this.purchaseOrdersService.addItem(factoryId, id, body);
  }

  @ApiOperation({ summary: 'List purchase orders for the selected factory' })
  @Get()
  findAll(@FactoryId() factoryId: string) {
    return this.purchaseOrdersService.findAll(factoryId);
  }

  @ApiOperation({ summary: 'Get purchase order detail with items' })
  @Get(':id')
  findOne(
    @FactoryId() factoryId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.purchaseOrdersService.findOne(factoryId, id);
  }

  @ApiOperation({ summary: 'Confirm a draft purchase order' })
  @Post(':id/confirm')
  confirm(
    @FactoryId() factoryId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.purchaseOrdersService.confirm(factoryId, id);
  }

  @ApiOperation({
    summary: 'Update purchase order status; non-admin users can only move one step forward',
  })
  @Post(':id/status')
  updateStatus(
    @FactoryId() factoryId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdatePoStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchaseOrdersService.updateStatus(factoryId, id, body, user);
  }

  @ApiOperation({ summary: 'Compute material requirements from PO item quantities and style BOMs' })
  @Get(':id/material-requirement')
  getMaterialRequirement(
    @FactoryId() factoryId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.purchaseOrdersService.getMaterialRequirement(factoryId, id);
  }
}
