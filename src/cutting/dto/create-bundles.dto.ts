import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateBundleItemDto {
  @ApiProperty({ example: 'L' })
  @IsString()
  @MaxLength(40)
  size!: string;

  @ApiProperty({ example: 50 })
  @IsInt()
  @Min(1)
  qty!: number;
}

export class CreateBundlesDto {
  @ApiProperty({ type: [CreateBundleItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateBundleItemDto)
  bundles!: CreateBundleItemDto[];
}
