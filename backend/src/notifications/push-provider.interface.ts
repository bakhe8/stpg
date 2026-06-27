export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export const PUSH_PROVIDER = 'PUSH_PROVIDER';

export interface IPushProvider {
  /**
   * Send a push notification to a specific device token
   */
  sendToDevice(
    token: string,
    payload: PushNotificationPayload,
  ): Promise<boolean>;

  /**
   * Send a push notification to multiple device tokens
   */
  sendToDevices(
    tokens: string[],
    payload: PushNotificationPayload,
  ): Promise<string[]>;
}
