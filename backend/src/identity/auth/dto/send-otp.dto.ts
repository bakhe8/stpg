import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class SendOtpDto {
  @ApiProperty({ description: 'Mobile number (+9665XXXXXXXX)' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
}
