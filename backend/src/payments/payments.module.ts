import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { StripePaymentProvider } from './providers/stripe.provider';
import { MoyasarPaymentProvider } from './providers/moyasar.provider';
import {
  STRIPE_PROVIDER,
  MOYASAR_PROVIDER,
} from './interfaces/payment-gateway.interface';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    {
      provide: STRIPE_PROVIDER,
      useClass: StripePaymentProvider,
    },
    {
      provide: MOYASAR_PROVIDER,
      useClass: MoyasarPaymentProvider,
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
