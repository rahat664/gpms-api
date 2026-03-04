import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, FactoryId } from '../auth/auth.decorators';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  IssueToCuttingDto,
  ReceiveInventoryDto,
} from './dto/create-inventory-txn.dto';
import { GetStockQueryDto } from './dto/get-stock-query.dto';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-factory-id',
  required: true,
  description: 'Factory UUID selected for the request scope',
})
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @ApiOperation({ summary: 'Receive inventory into the selected factory ledger' })
  @Post('receive')
  receive(
    @FactoryId() factoryId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ReceiveInventoryDto,
  ) {
    return this.inventoryService.receive(factoryId, user, body);
  }

  @ApiOperation({ summary: 'Issue inventory to cutting from the selected factory ledger' })
  @Post('issue-to-cutting')
  issueToCutting(
    @FactoryId() factoryId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: IssueToCuttingDto,
  ) {
    return this.inventoryService.issueToCutting(factoryId, user, body);
  }

  @ApiOperation({ summary: 'Get current stock by material from ledger transactions' })
  @Get('stock')
  getStock(
    @FactoryId() factoryId: string,
    @Query() query: GetStockQueryDto,
  ) {
    return this.inventoryService.getStock(factoryId, query);
  }
}
