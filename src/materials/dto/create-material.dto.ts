import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateMaterialDto {
  @ApiProperty({ example: 'Single Jersey Fabric' })
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiProperty({ example: 'Fabric' })
  @IsString()
  @MaxLength(80)
  type!: string;

  @ApiProperty({ example: 'kg' })
  @IsString()
  @MaxLength(40)
  uom!: string;
}
