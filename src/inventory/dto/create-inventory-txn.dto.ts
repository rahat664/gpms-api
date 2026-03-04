import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class ReceiveInventoryDto {
  @ApiProperty({ example: '9a3a44d1-0b0a-4fe9-a6ad-66db595d9b82' })
  @IsUUID()
  materialId!: string;

  @ApiProperty({ example: 250.5 })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  qty!: number;

  @ApiProperty({ example: 'GRN', default: 'GRN' })
  @IsString()
  refType!: 'GRN';

  @ApiPropertyOptional({ example: 'GRN-2026-001' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  refId?: string;

  @ApiPropertyOptional({ example: 'First fabric receipt for PO-2026-0001' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class IssueToCuttingDto {
  @ApiProperty({ example: '9a3a44d1-0b0a-4fe9-a6ad-66db595d9b82' })
  @IsUUID()
  materialId!: string;

  @ApiProperty({ example: 120.25 })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  qty!: number;

  @ApiProperty({ example: 'ISSUE_CUTTING', default: 'ISSUE_CUTTING' })
  @IsString()
  refType!: 'ISSUE_CUTTING';

  @ApiPropertyOptional({ example: 'CUT-BATCH-001' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  refId?: string;

  @ApiPropertyOptional({ example: 'Issued to cutting floor for batch 001' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
