import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString, MaxLength } from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({ example: 'Week 14 Master Plan' })
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-04-07' })
  @IsDateString()
  endDate!: string;
}
