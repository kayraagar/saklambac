import type { GameSettings } from "./types";

export type Phase = "headStart" | "hunting" | "over";

/** End of the head start; hunting (and the roundMs clock) starts here. */
export function headStartEndAt(startedAt: number, s: GameSettings): number {
  return startedAt + s.headStartMs;
}

/** Round end = startedAt + headStartMs + roundMs (roundMs is hunting time). */
export function roundEndAt(startedAt: number, s: GameSettings): number {
  return headStartEndAt(startedAt, s) + s.roundMs;
}

export function phaseAt(startedAt: number, s: GameSettings, now: number): Phase {
  if (now < headStartEndAt(startedAt, s)) return "headStart";
  if (now < roundEndAt(startedAt, s)) return "hunting";
  return "over";
}

/**
 * Next ping strictly after `now`. Pings happen at headStartEnd + k*interval
 * (k ≥ 1); none at or after the round end → null.
 */
export function nextPingAt(startedAt: number, s: GameSettings, now: number): number | null {
  const base = headStartEndAt(startedAt, s);
  const interval = s.pingIntervalMs;
  if (!(interval > 0)) return null;
  const k = now < base ? 1 : Math.floor((now - base) / interval) + 1;
  const at = base + k * interval;
  return at < roundEndAt(startedAt, s) ? at : null;
}
