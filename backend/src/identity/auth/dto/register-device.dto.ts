import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class RegisterDeviceTokenDto {
  @ApiProperty({ description: 'The FCM or Web Push token' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiPropertyOptional({
    description: 'The OS of the device (ios, android, web)',
  })
  @IsString()
  @IsOptional()
  deviceOs?: string;
}
