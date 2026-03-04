import { ApiProperty } from '@nestjs/swagger';
import { POStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdatePoStatusDto {
  @ApiProperty({ enum: POStatus, example: POStatus.IN_PRODUCTION })
  @IsEnum(POStatus)
  status!: POStatus;
}
