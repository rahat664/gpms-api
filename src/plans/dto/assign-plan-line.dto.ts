import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class DailyTargetDto {
  @ApiProperty({ example: '2026-04-02' })
  @IsDateString()
  date!: string;

  @ApiProperty({ example: 500 })
  @IsInt()
  @Min(1)
  targetQty!: number;
}

export class AssignPlanLineDto {
  @ApiProperty({ example: '9a3a44d1-0b0a-4fe9-a6ad-66db595d9b82' })
  @IsUUID()
  poId!: string;

  @ApiProperty({ example: 'a2f5d915-5979-4f87-90ba-0903c92ef892' })
  @IsUUID()
  poItemId!: string;

  @ApiProperty({ example: 'f72bd0c8-5a7a-46c7-9e57-e3c3b67e72b1' })
  @IsUUID()
  lineId!: string;

  @ApiProperty({ example: '2026-04-02' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-04-05' })
  @IsDateString()
  endDate!: string;

  @ApiProperty({ type: [DailyTargetDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DailyTargetDto)
  dailyTargets!: DailyTargetDto[];
}
