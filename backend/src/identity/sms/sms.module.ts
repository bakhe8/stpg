import { Module } from '@nestjs/common';
import { MockSmsProvider } from './mock-sms.provider';
import { UnifonicProvider } from './providers/unifonic.provider';
import { TwilioProvider } from './providers/twilio.provider';
import { SMS_PROVIDER } from './sms-provider.interface';

@Module({
  providers: [
    {
      provide: SMS_PROVIDER,
      useFactory: (): InstanceType<
        typeof MockSmsProvider | typeof UnifonicProvider | typeof TwilioProvider
      > => {
        const provider = process.env.SMS_PROVIDER ?? 'mock';
        if (provider === 'unifonic') return new UnifonicProvider();
        if (provider === 'twilio') return new TwilioProvider();
        if (provider === 'mock') return new MockSmsProvider();
        throw new Error(
          `SMS_PROVIDER "${provider}" غير مدعوم. القيم المقبولة: mock | unifonic | twilio`,
        );
      },
    },
  ],
  exports: [SMS_PROVIDER],
})
export class SmsModule {}
