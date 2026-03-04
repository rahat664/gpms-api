import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BomItemInputDto {
  @ApiProperty({ example: '9a3a44d1-0b0a-4fe9-a6ad-66db595d9b82' })
  @IsUUID()
  materialId!: string;

  @ApiProperty({ example: 1.45 })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  consumption!: number;
}

export class UpsertBomDto {
  @ApiProperty({ type: [BomItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BomItemInputDto)
  items!: BomItemInputDto[];
}
