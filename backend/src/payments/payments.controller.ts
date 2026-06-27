import { Controller, Post, Body, Headers, HttpCode, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreateIntentDto, GatewayProvider } from './dto/create-intent.dto';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import type { Person } from '@prisma/client';
import { UseGuards } from '@nestjs/common';
import { JwtGuard } from '../identity/auth/jwt.guard';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtGuard)
  @ApiBearerAuth('access-token')
  @Post('intent')
  @ApiOperation({ summary: 'Create a payment intent for a specific gateway' })
  createIntent(@CurrentUser() user: Person, @Body() dto: CreateIntentDto) {
    return this.paymentsService.createIntent(user.id, dto);
  }

  // Webhooks are usually public and rely on signature verification
  @Post('webhook/stripe')
  @HttpCode(200)
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  handleStripeWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Body() payload: unknown,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawPayload = request.rawBody?.toString('utf8');
    return this.paymentsService.handleWebhook(
      GatewayProvider.STRIPE,
      rawPayload ?? payload,
      signature,
    );
  }

  @Post('webhook/moyasar')
  @HttpCode(200)
  @ApiOperation({ summary: 'Moyasar webhook endpoint' })
  handleMoyasarWebhook(@Body() payload: unknown) {
    return this.paymentsService.handleWebhook(GatewayProvider.MOYASAR, payload);
  }
}
