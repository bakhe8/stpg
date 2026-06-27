import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubscribeDto {
  @ApiProperty({
    description: 'The PushSubscription object as JSON string or Object',
  })
  @IsNotEmpty()
  subscription: any;

  @ApiProperty({
    required: false,
    description: 'Device OS (ios, android, web)',
  })
  @IsOptional()
  @IsString()
  deviceOs?: string;
}
