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
import { AssignPlanLineDto } from './dto/assign-plan-line.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { PlansService } from './plans.service';

@ApiTags('plans')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-factory-id',
  required: true,
  description: 'Factory UUID selected for the request scope',
})
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @ApiOperation({ summary: 'Create a production plan' })
  @Post()
  create(@FactoryId() factoryId: string, @Body() body: CreatePlanDto) {
    return this.plansService.create(factoryId, body);
  }

  @ApiOperation({ summary: 'Assign a PO item to a line within a production plan' })
  @Post(':id/assign')
  assign(
    @FactoryId() factoryId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: AssignPlanLineDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.plansService.assign(factoryId, id, body, user);
  }

  @ApiOperation({ summary: 'Get production plan detail with plan lines and targets' })
  @Get(':id')
  findOne(
    @FactoryId() factoryId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.plansService.findOne(factoryId, id);
  }
}
