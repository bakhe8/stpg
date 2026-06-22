import { Injectable, Logger } from '@nestjs/common';
import { IPushProvider, PushNotificationPayload } from './push-provider.interface';

@Injectable()
export class MockPushProvider implements IPushProvider {
  private readonly logger = new Logger(MockPushProvider.name);

  async sendToDevice(token: string, payload: PushNotificationPayload): Promise<boolean> {
    this.logger.log(`[MOCK PUSH to ${token}] Title: ${payload.title} | Body: ${payload.body}`);
    if (payload.data) {
      this.logger.debug(`Data: ${JSON.stringify(payload.data)}`);
    }
    return true;
  }

  async sendToDevices(tokens: string[], payload: PushNotificationPayload): Promise<string[]> {
    this.logger.log(`[MOCK PUSH to ${tokens.length} devices] Title: ${payload.title}`);
    return tokens; // Return list of successful tokens
  }
}
