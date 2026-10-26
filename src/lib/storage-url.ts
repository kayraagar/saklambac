// A local Convex backend signs storage URLs with its own origin (127.0.0.1),
// which a phone on the LAN can't reach. Point them at the URL the app uses.
// No-op for hosted deployments.
const appOrigin = (() => {
  try {
    return new URL(process.env.EXPO_PUBLIC_CONVEX_URL ?? "").origin;
  } catch {
    return null;
  }
})();

export function reachableUrl(url: string): string;
export function reachableUrl(url: string | null | undefined): string | null;
export function reachableUrl(url: string | null | undefined): string | null {
  if (!url || !appOrigin) return url ?? null;
  return url.replace(/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/, appOrigin);
}
