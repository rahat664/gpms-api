import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBuyerDto {
  @ApiProperty({ example: 'H&M' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: 'Sweden' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;
}
