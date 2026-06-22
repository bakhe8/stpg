import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum GatewayProvider {
  STRIPE = 'STRIPE',
  MOYASAR = 'MOYASAR',
}

export class CreateIntentDto {
  @ApiProperty({ description: 'The UUID of the PaymentDue' })
  @IsUUID()
  @IsNotEmpty()
  paymentDueId: string;

  @ApiProperty({ enum: GatewayProvider, description: 'Which gateway to use' })
  @IsEnum(GatewayProvider)
  @IsNotEmpty()
  provider: GatewayProvider;
}
