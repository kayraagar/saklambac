import { isInZone } from "./geo";
import type { Phase } from "./timing";
import {
  OUT_OF_ZONE_GRACE_MS,
  type GameSettings,
  type PlayerState,
  type Visibility,
  type Winner,
  type Zone,
} from "./types";

/**
 * New value for outOfZoneSince after the player's latest position.
 * No position → unchanged. Inside → undefined. Outside → keeps the start of the
 * current excursion, or `now` if this is the first report outside.
 */
export function updateOutOfZone(
  player: PlayerState,
  zone: Zone,
  now: number,
): PlayerState["outOfZoneSince"] {
  if (!player.position) return player.outOfZoneSince;
  if (isInZone(player.position, zone)) return undefined;
  return player.outOfZoneSince ?? now;
}

/** Active runner who has been outside the zone for strictly more than the grace period. */
export function isExposed(player: PlayerState, now: number): boolean {
  return (
    player.team === "runner" &&
    player.status === "active" &&
    player.outOfZoneSince !== undefined &&
    now - player.outOfZoneSince > OUT_OF_ZONE_GRACE_MS
  );
}

export function visibility(
  viewer: PlayerState,
  target: PlayerState,
  s: GameSettings,
  now: number,
): Visibility {
  if (viewer.id === target.id) return "live";
  // Players who left see nothing; left players are shown to nobody.
  if (viewer.status === "left" || target.status === "left") return "hidden";
  // Tagged spectators see everyone still in the game, plus other spectators.
  if (viewer.status === "tagged") return s.taggedSeeLive ? "live" : "delayed";
  // Viewer is active from here on.
  if (target.status !== "active") return "hidden";
  if (viewer.team === target.team) return "live";
  if (viewer.team === "hunter") return isExposed(target, now) ? "live" : "pingOnly";
  return "hidden"; // active runner looking at a hunter
}

/**
 * headStart → null. Otherwise: no active runners → hunters; time over with an
 * active runner → runners; all hunters gone while runners remain → runners.
 */
export function checkWinner(players: PlayerState[], phase: Phase): Winner | null {
  if (phase === "headStart") return null;
  const activeRunners = players.filter((p) => p.team === "runner" && p.status === "active").length;
  const activeHunters = players.filter((p) => p.team === "hunter" && p.status === "active").length;
  if (activeRunners === 0) return "hunters";
  if (phase === "over") return "runners";
  if (activeHunters === 0) return "runners";
  return null;
}
