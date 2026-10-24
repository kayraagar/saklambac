/** "mm:ss" (or "h:mm:ss") for a non-negative duration. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** "az önce", "3 dk önce", "1 sa önce". */
export function formatAgo(ms: number): string {
  const min = Math.floor(Math.max(0, ms) / 60_000);
  if (min < 1) return "az önce";
  if (min < 60) return `${min} dk önce`;
  return `${Math.floor(min / 60)} sa önce`;
}

/** "45 dk", "1 sa 30 dk". */
export function formatMinutes(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${min} dk`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  return rest ? `${h} sa ${rest} dk` : `${h} sa`;
}

export function formatMeters(m: number): string {
  return m >= 1000 ? `${(m / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} km` : `${Math.round(m)} m`;
}

export function formatClock(at: number): string {
  const d = new Date(at);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}
