import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class CreateHourlyOutputDto {
  @ApiProperty({ example: 'f72bd0c8-5a7a-46c7-9e57-e3c3b67e72b1' })
  @IsUUID()
  lineId!: string;

  @ApiProperty({ example: '2026-04-02' })
  @IsDateString()
  date!: string;

  @ApiProperty({ example: 9, minimum: 0, maximum: 23 })
  @IsInt()
  @Min(0)
  @Max(23)
  hourSlot!: number;

  @ApiProperty({ example: 120 })
  @IsInt()
  @Min(1)
  qty!: number;

  @ApiPropertyOptional({ example: '3bcd3153-5f12-4948-93ea-933c44c54a50' })
  @IsOptional()
  @IsUUID()
  bundleId?: string;
}
