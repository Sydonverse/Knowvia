/**
 * Converts a base64 URL-safe string (VAPID public key) into a Uint8Array
 * required by standard PushManager.subscribe({ applicationServerKey })
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Checks whether Web Push Notifications and Service Workers are supported in the current environment
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Helper to compare two ArrayBuffers
 */
function areArrayBuffersEqual(buf1: ArrayBuffer | null, buf2: ArrayBuffer | null): boolean {
  if (!buf1 || !buf2) return false;
  if (buf1.byteLength !== buf2.byteLength) return false;
  const view1 = new Uint8Array(buf1);
  const view2 = new Uint8Array(buf2);
  for (let i = 0; i < view1.length; i++) {
    if (view1[i] !== view2[i]) return false;
  }
  return true;
}

/**
 * Robustly subscribes the device to Web Push notifications using the backend's VAPID key
 * and registers the subscription with the backend database.
 */
export async function subscribeUserToPush(
  registration: ServiceWorkerRegistration,
  api: any
): Promise<PushSubscription> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported in this browser environment.');
  }

  // 1. Fetch active VAPID public key from backend
  const { publicKey } = await api.notifications.getVapidKey();
  if (!publicKey) {
    throw new Error('VAPID public key could not be retrieved from the server.');
  }

  const convertedKey = urlBase64ToUint8Array(publicKey);

  // 2. Check if an existing subscription exists
  let subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    const existingKey = subscription.options.applicationServerKey;
    const isMatchingKey = areArrayBuffersEqual(existingKey, convertedKey.buffer as ArrayBuffer);

    // If existing subscription used an older/different key, purge it
    if (!isMatchingKey) {
      console.log('[WebPush] Purging obsolete subscription with outdated VAPID key...');
      await subscription.unsubscribe().catch(() => {});
      subscription = null;
    }
  }

  // 3. Create fresh subscription if needed
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey as BufferSource,
    });
  }

  // 4. Send subscription to Knowvia backend
  const subData = JSON.parse(JSON.stringify(subscription));
  await api.notifications.subscribePush({
    endpoint: subData.endpoint,
    keys: subData.keys,
    userAgent: navigator.userAgent,
  });

  console.log('[WebPush] Device successfully subscribed and registered with backend.');
  return subscription;
}
