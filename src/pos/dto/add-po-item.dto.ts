import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class AddPoItemDto {
  @ApiProperty({ example: '9a3a44d1-0b0a-4fe9-a6ad-66db595d9b82' })
  @IsUUID()
  styleId!: string;

  @ApiProperty({ example: 'Navy' })
  @IsString()
  @MaxLength(80)
  color!: string;

  @ApiProperty({ example: 1200 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({
    example: { S: 200, M: 400, L: 400, XL: 200 },
    description: 'Optional size-wise quantity breakdown',
  })
  @IsOptional()
  @IsObject()
  sizeBreakdown?: Record<string, string | number | boolean | null>;
}
