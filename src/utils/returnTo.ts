// Where to send the user after a magic-link sign-in. Stored in localStorage
// (the email link opens in a new tab, so sessionStorage would be empty there)
// and expires after 30 minutes. Only same-site paths are accepted.
const KEY = "crestox_return_to";
const TTL_MS = 30 * 60 * 1000;

export function setReturnTo(path: string) {
  if (typeof window === "undefined" || !path.startsWith("/") || path.startsWith("//")) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ path, at: Date.now() }));
  } catch {
    // ignore
  }
}

export function consumeReturnTo(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    window.localStorage.removeItem(KEY);
    if (!raw) return null;
    const { path, at } = JSON.parse(raw) as { path?: string; at?: number };
    if (!path || !path.startsWith("/") || path.startsWith("//") || !at || Date.now() - at > TTL_MS) return null;
    return path;
  } catch {
    return null;
  }
}
