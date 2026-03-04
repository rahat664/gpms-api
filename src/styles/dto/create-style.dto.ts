import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStyleDto {
  @ApiProperty({ example: 'ST-1001' })
  @IsString()
  @MaxLength(120)
  styleNo!: string;

  @ApiPropertyOptional({ example: 'Basic Polo Shirt' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional({ example: 'Summer 2026' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  season?: string;
}
