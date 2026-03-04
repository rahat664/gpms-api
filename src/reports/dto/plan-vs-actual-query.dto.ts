import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class PlanVsActualQueryDto {
  @ApiProperty({ example: '2026-04-02' })
  @IsDateString()
  date!: string;
}
