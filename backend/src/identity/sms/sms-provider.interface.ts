export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SmsProvider {
  sendOtp(phoneNumber: string, otp: string): Promise<SmsSendResult>;
}

export const SMS_PROVIDER = 'SMS_PROVIDER';
