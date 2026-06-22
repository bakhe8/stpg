import { Injectable, Logger } from '@nestjs/common';
import type { SmsProvider, SmsSendResult } from '../sms-provider.interface';

@Injectable()
export class TwilioProvider implements SmsProvider {
  private readonly logger = new Logger(TwilioProvider.name);
  private readonly accountSid = process.env.TWILIO_ACCOUNT_SID!;
  private readonly authToken = process.env.TWILIO_AUTH_TOKEN!;
  private readonly fromNumber = process.env.TWILIO_FROM_NUMBER!;

  async sendOtp(phoneNumber: string, otp: string): Promise<SmsSendResult> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const body = new URLSearchParams({
      From: this.fromNumber,
      To: phoneNumber,
      Body: `Your verification code: ${otp}`,
    });

    const credentials = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const json = await res.json();
    if (res.ok) {
      return { success: true, messageId: json.sid };
    }
    this.logger.error(`Twilio error: ${JSON.stringify(json)}`);
    return { success: false, error: json.message ?? 'Unknown error' };
  }
}
