import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InspectionType } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class QcDefectDto {
  @ApiProperty({ example: 'Broken stitch' })
  @IsString()
  @MaxLength(120)
  defectType!: string;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  count!: number;
}

export class CreateQcInspectionDto {
  @ApiProperty({ example: '3bcd3153-5f12-4948-93ea-933c44c54a50' })
  @IsUUID()
  bundleId!: string;

  @ApiProperty({ enum: InspectionType, example: InspectionType.INLINE })
  @IsEnum(InspectionType)
  type!: InspectionType;

  @ApiProperty({ example: true })
  @IsBoolean()
  pass!: boolean;

  @ApiPropertyOptional({ example: 'Inline inspection completed with minor notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ type: [QcDefectDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QcDefectDto)
  defects?: QcDefectDto[];
}
