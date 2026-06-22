import { Injectable, Logger } from '@nestjs/common';
import type { SmsProvider, SmsSendResult } from './sms-provider.interface';

@Injectable()
export class MockSmsProvider implements SmsProvider {
  private readonly logger = new Logger(MockSmsProvider.name);

  sendOtp(phoneNumber: string, otp: string): Promise<SmsSendResult> {
    this.logger.log(`[MockSMS] OTP for ${phoneNumber}: ${otp}`);
    return Promise.resolve({ success: true, messageId: 'mock-id' });
  }
}
