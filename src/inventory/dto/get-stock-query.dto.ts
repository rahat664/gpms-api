import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class GetStockQueryDto {
  @ApiPropertyOptional({ example: '9a3a44d1-0b0a-4fe9-a6ad-66db595d9b82' })
  @IsOptional()
  @IsUUID()
  materialId?: string;
}
