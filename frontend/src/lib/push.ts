import { fetchApi } from './api';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function setupPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return;
  }

  try {
    // 1. Register Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered');

    // 2. Request Permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return;
    }

    // 3. Get VAPID public key from backend
    const { publicKey } = await fetchApi<{ publicKey: string }>('/notifications/vapid-public-key');
    if (!publicKey) {
      console.error('No VAPID public key returned from backend');
      return;
    }

    // 4. Subscribe to PushManager
    const subscribeOptions = {
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    };

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe(subscribeOptions);
    }

    // 5. Send subscription to backend
    await fetchApi('/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        subscription: subscription,
        deviceOs: 'web',
      }),
    });

    console.log('Push subscription sent to backend');
  } catch (error) {
    console.error('Error setting up push notifications:', error);
  }
}

export async function unsubscribePushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      // 1. Send unsubscribe to backend
      await fetchApi('/notifications/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ subscription }),
      });
      
      // 2. Unsubscribe locally
      await subscription.unsubscribe();
      console.log('Unsubscribed from push notifications');
    }
  } catch (error) {
    console.error('Error unsubscribing:', error);
  }
}
