import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ description: 'Full name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Mobile number (+9665XXXXXXXX)' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ description: 'Password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: 'ID of the entity applying to' })
  @IsUUID()
  @IsNotEmpty()
  entityId: string;

  @ApiPropertyOptional({ description: 'Branch or Family name' })
  @IsOptional()
  @IsString()
  branchOrFamily?: string;

  @ApiPropertyOptional({ description: 'Name of the recommender' })
  @IsOptional()
  @IsString()
  recommenderName?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
