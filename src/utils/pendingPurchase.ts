// Tracks an in-flight Razorpay purchase across a possible full-page reload.
// Razorpay's redirect-based payment methods (UPI app hand-off, netbanking, some
// wallets) can cause the browser to fully unload and reload our page rather than
// just backgrounding the tab — any plain in-memory ref/state is wiped in that case.
// sessionStorage survives it, so callers can tell "we just came back mid-payment"
// apart from a normal fresh visit even after a hard reload.
const KEY = 'crestox:pending_purchase';
const MAX_AGE_MS = 60 * 60 * 1000;

export interface PendingPurchase {
  artworkId: number;
  quantity: number;
  razorpayOrderId: string;
  amount: string;
  estimatedCost: string;
  maxCharge: string;
  currency: string;
  expiresAt: string;
  ts: number;
}

type PendingPurchaseInput = Omit<PendingPurchase, 'ts'>;

export function markPurchasePending(purchase: PendingPurchaseInput): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...purchase, ts: Date.now() }));
  } catch {
    // sessionStorage unavailable (private mode, etc.) — best-effort only
  }
}

export function clearPurchasePending(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function isPurchasePending(artworkId: number | null | undefined): boolean {
  return getPendingPurchase(artworkId) != null;
}

export function getPendingPurchase(artworkId?: number | null): PendingPurchase | null {
  if (typeof window === 'undefined' || artworkId == null) return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingPurchase;
    const expiredByAge = !parsed.expiresAt && Date.now() - parsed.ts > MAX_AGE_MS;
    const expiredByOrder = Boolean(parsed.expiresAt) && Number.isFinite(Date.parse(parsed.expiresAt)) && Date.now() > Date.parse(parsed.expiresAt);
    if (parsed.artworkId !== artworkId || expiredByAge || expiredByOrder) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
