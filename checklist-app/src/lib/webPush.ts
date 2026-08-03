import type { WebPushSubscriptionInput } from "../domain/types";

type PushSubscriptionJson = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

type PushSubscriptionLike = {
  endpoint: string;
  toJSON: () => PushSubscriptionJson;
};

export type WebPushSupport = {
  supported: boolean;
  reason?: string;
};

export function installPwaHeadTags(): void {
  if (typeof document === "undefined") return;

  ensureLink("manifest", "/manifest.webmanifest");
  ensureLink("apple-touch-icon", "/icons/donezo-1024.png");
  ensureMeta("apple-mobile-web-app-capable", "yes");
  ensureMeta("apple-mobile-web-app-title", "Donezo");
  ensureMeta("apple-mobile-web-app-status-bar-style", "black-translucent");
}

export function getWebPushSupport(): WebPushSupport {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { supported: false, reason: "Web reminders need a browser." };
  }

  if (!("serviceWorker" in navigator)) {
    return { supported: false, reason: "This browser does not support service workers." };
  }

  if (!("PushManager" in window)) {
    return { supported: false, reason: "This browser does not support web push reminders." };
  }

  if (!("Notification" in window)) {
    return { supported: false, reason: "This browser does not support notifications." };
  }

  if (!window.isSecureContext) {
    return { supported: false, reason: "Web reminders require the secure Donezo website." };
  }

  return { supported: true };
}

function ensureLink(rel: string, href: string): void {
  const existing = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (existing) {
    existing.href = href;
    return;
  }

  const link = document.createElement("link");
  link.rel = rel;
  link.href = href;
  document.head.appendChild(link);
}

function ensureMeta(name: string, content: string): void {
  const existing = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (existing) {
    existing.content = content;
    return;
  }

  const meta = document.createElement("meta");
  meta.name = name;
  meta.content = content;
  document.head.appendChild(meta);
}

export function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = globalThis.atob(base64);
  const bytes: Uint8Array<ArrayBuffer> = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    bytes[index] = rawData.charCodeAt(index);
  }

  return bytes;
}

export async function registerDonezoServiceWorker(): Promise<ServiceWorkerRegistration> {
  const support = getWebPushSupport();
  if (!support.supported) {
    throw new Error(support.reason ?? "Web reminders are unavailable.");
  }

  return navigator.serviceWorker.register("/donezo-service-worker.js");
}

export async function subscribeToWebPush(publicVapidKey: string): Promise<WebPushSubscriptionInput> {
  if (!publicVapidKey.trim()) {
    throw new Error("Web reminder public key is not configured.");
  }

  const registration = await registerDonezoServiceWorker();
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
    }));

  return normalizePushSubscription(subscription, navigator.userAgent);
}

export function normalizePushSubscription(
  subscription: PushSubscriptionLike,
  userAgent: string | null = null,
): WebPushSubscriptionInput {
  const json = subscription.toJSON();
  const endpoint = json.endpoint ?? subscription.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;

  if (!endpoint) {
    throw new Error("Push subscription is missing an endpoint.");
  }

  if (!p256dh || !auth) {
    throw new Error("Push subscription is missing encryption keys.");
  }

  return {
    endpoint,
    p256dh,
    auth,
    userAgent,
  };
}
