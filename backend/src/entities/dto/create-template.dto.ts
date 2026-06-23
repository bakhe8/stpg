import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';
import { EntityType } from '@prisma/client';

export class CreateTemplateDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @ApiProperty({ enum: EntityType })
  @IsEnum(EntityType)
  type: EntityType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiPropertyOptional({ description: 'Emoji or icon identifier' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  icon?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Enabled module keys e.g. ["payments","decisions","committees"]',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledModules?: string[];

  @ApiPropertyOptional({
    description: 'Suggested wallet/goal names e.g. [{"name":"قطة الجمعات"}]',
  })
  @IsOptional()
  suggestedGoals?: { name: string; icon?: string }[];

  @ApiPropertyOptional()
  @IsOptional()
  defaultPolicy?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  defaultWallets?: { name: string; type?: string }[];

  @ApiPropertyOptional()
  @IsOptional()
  defaultPaths?: Record<string, unknown>[];
}
