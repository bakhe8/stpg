import { Injectable, Logger } from '@nestjs/common';
import type { SmsProvider, SmsSendResult } from '../sms-provider.interface';

type UnifonicMessageResponse = {
  Success?: string;
  Message?: string;
  data?: {
    MessageID?: string;
  };
};

@Injectable()
export class UnifonicProvider implements SmsProvider {
  private readonly logger = new Logger(UnifonicProvider.name);
  private readonly apiKey = process.env.UNIFONIC_API_KEY!;
  private readonly senderId =
    process.env.UNIFONIC_SENDER_ID ?? 'CollectiveTrust';
  private readonly baseUrl = 'https://el.cloud.unifonic.com/rest/SMS/messages';

  async sendOtp(phoneNumber: string, otp: string): Promise<SmsSendResult> {
    const body = new URLSearchParams({
      AppSid: this.apiKey,
      SenderID: this.senderId,
      Body: `رمز التحقق الخاص بك: ${otp}`,
      Recipient: phoneNumber,
    });

    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const json = (await res.json()) as UnifonicMessageResponse;
    if (json.Success === 'True') {
      return { success: true, messageId: json.data?.MessageID };
    }
    this.logger.error(`Unifonic error: ${JSON.stringify(json)}`);
    return { success: false, error: json.Message ?? 'Unknown error' };
  }
}
