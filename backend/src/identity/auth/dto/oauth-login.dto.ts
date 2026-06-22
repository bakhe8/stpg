import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';

export class OAuthLoginDto {
  @ApiProperty({ description: 'The OAuth provider (e.g., google, apple)' })
  @IsString()
  @IsNotEmpty()
  provider: string;

  @ApiProperty({ description: 'The unique provider user ID' })
  @IsString()
  @IsNotEmpty()
  providerId: string;

  @ApiPropertyOptional({ description: 'The email from the provider' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'The name from the provider' })
  @IsOptional()
  @IsString()
  name?: string;
}
