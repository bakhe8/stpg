import { Injectable, Logger } from '@nestjs/common';
import * as webPush from 'web-push';
import { IPushProvider, PushNotificationPayload } from './push-provider.interface';

@Injectable()
export class WebPushProviderService implements IPushProvider {
  private readonly logger = new Logger(WebPushProviderService.name);
  private isConfigured = false;

  constructor() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;

    if (publicKey && privateKey && subject) {
      webPush.setVapidDetails(subject, publicKey, privateKey);
      this.isConfigured = true;
      this.logger.log('Web Push Provider configured successfully with VAPID keys.');
    } else {
      this.logger.warn('Web Push VAPID keys are missing from .env. Push notifications will not be sent.');
    }
  }

  async sendToDevice(token: string, payload: PushNotificationPayload): Promise<boolean> {
    if (!this.isConfigured) return false;

    try {
      const subscription = JSON.parse(token);
      await webPush.sendNotification(subscription, JSON.stringify(payload));
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send push notification: ${error.message}`);
      // Return false so the caller knows it failed (could be an expired subscription)
      return false;
    }
  }

  async sendToDevices(tokens: string[], payload: PushNotificationPayload): Promise<string[]> {
    if (!this.isConfigured || tokens.length === 0) return [];

    const successfulTokens: string[] = [];
    const promises = tokens.map(async (token) => {
      const success = await this.sendToDevice(token, payload);
      if (success) {
        successfulTokens.push(token);
      }
    });

    await Promise.all(promises);
    return successfulTokens;
  }
}
