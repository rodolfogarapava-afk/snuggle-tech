// Facebook Meta Pixel - snuggle-tech
// Pixel ID: 1007607875317367

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
    _fbq: unknown;
  }
}

const PIXEL_ID = "1007607875317367";

export function trackFB(
  event: string,
  params?: Record<string, unknown>
): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  if (params) {
    window.fbq("track", event, params);
  } else {
    window.fbq("track", event);
  }
}

export function trackFBPageView(): void {
  trackFB("PageView");
}

export function trackFBViewContent(params?: {
  content_name?: string;
  content_ids?: string[];
  content_type?: string;
  value?: number;
  currency?: string;
}): void {
  trackFB("ViewContent", params);
}

export function trackFBInitiateCheckout(params?: {
  content_name?: string;
  value?: number;
  currency?: string;
  num_items?: number;
}): void {
  trackFB("InitiateCheckout", params);
}

export function trackFBPurchase(params: {
  value: number;
  currency: string;
  content_name?: string;
  order_id?: string;
}): void {
  trackFB("Purchase", params);
}

export { PIXEL_ID };
