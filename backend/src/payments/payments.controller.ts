import { Controller, Post, Body, Headers, HttpCode, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreateIntentDto, GatewayProvider } from './dto/create-intent.dto';
import { CurrentUser } from '../identity/auth/decorators/current-user.decorator';
import { JwtGuard } from '../identity/auth/jwt.guard';
import type { Person } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiBearerAuth('access-token')
  @Post('intent')
  @ApiOperation({ summary: 'Create a payment intent for a specific gateway' })
  createIntent(@CurrentUser() user: Person, @Body() dto: CreateIntentDto) {
    return this.paymentsService.createIntent(user.id, dto);
  }

  // Webhooks عامة — الحماية عبر التوقيع الرقمي لا JWT
  @Public()
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

  @Public()
  @Post('webhook/moyasar')
  @HttpCode(200)
  @ApiOperation({ summary: 'Moyasar webhook endpoint' })
  async handleMoyasarWebhook(@Body() payload: unknown) {
    const result = await this.paymentsService.handleWebhook(GatewayProvider.MOYASAR, payload);
    // رفض صريح بـ 401 عند توقيع خاطئ أو secret_token مفقود
    // (يُبلِّغ Moyasar بالرفض بدلاً من 200 صامت)
    if (!result.success && result.reason?.includes('Invalid signature')) {
      throw new UnauthorizedException('Invalid Moyasar webhook secret_token');
    }
    return result;
  }
}
