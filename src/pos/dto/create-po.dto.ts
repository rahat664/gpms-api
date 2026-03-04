import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength } from 'class-validator';

export class CreatePurchaseOrderDto {
  @ApiProperty({ example: 'PO-2026-0001' })
  @IsString()
  @MaxLength(120)
  poNo!: string;

  @ApiProperty({ example: '9a3a44d1-0b0a-4fe9-a6ad-66db595d9b82' })
  @IsUUID()
  buyerId!: string;
}
