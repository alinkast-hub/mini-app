import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionMode } from '@prisma/client';

export class CreateSessionDto {
  @ApiProperty({ enum: SessionMode })
  @IsEnum(SessionMode)
  mode!: SessionMode;

  @ApiProperty()
  @IsInt()
  @Min(1)
  durationMinutes!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taskId?: string;
}
