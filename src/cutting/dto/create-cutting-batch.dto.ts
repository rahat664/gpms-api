import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateCuttingBatchDto {
  @ApiProperty({ example: '9a3a44d1-0b0a-4fe9-a6ad-66db595d9b82' })
  @IsUUID()
  poItemId!: string;

  @ApiProperty({ example: 'CB-001' })
  @IsString()
  @MaxLength(80)
  batchNo!: string;
}
