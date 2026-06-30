import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ description: 'Mobile number (+9665XXXXXXXX)' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ description: 'OTP code', example: '123456' })
  @IsString()
  @Length(6, 6)
  code: string;
}
