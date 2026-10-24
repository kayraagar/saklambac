// Shared game types. Pure TypeScript: no React Native, Expo or Convex imports,
// so both the app (src/) and the backend (convex/) can import this file.

export type Team = "hunter" | "runner";
export type RolePreference = Team | "random";

export type GameStatus =
  | "lobby" // players joining, picking sides
  | "headStart" // runners scatter, hunters wait
  | "hunting" // pings running
  | "ended";

export type PlayerStatus =
  | "active" // still in the round
  | "tagged" // runner confirmed tag; spectating (or converted to hunter)
  | "left";

export type Winner = "hunters" | "runners";

export interface LatLng {
  lat: number;
  lng: number;
}

/** Circular play zone. */
export interface Zone {
  center: LatLng;
  radiusM: number;
}

/** Host-controlled rules. All durations in milliseconds. */
export interface GameSettings {
  zone: Zone; // diameter 400 m – 3 km
  roundMs: number; // 10 min – 3 h
  pingIntervalMs: number; // 1 – 30 min
  headStartMs: number; // 0 – 15 min
  taggedJoinHunters: boolean;
  taggedSeeLive: boolean; // false → tagged spectators see others 60 s delayed
}

export const SETTING_LIMITS = {
  zoneDiameterM: { min: 400, max: 3000, default: 800 },
  roundMs: { min: 10 * 60_000, max: 3 * 3_600_000, default: 45 * 60_000 },
  pingIntervalMs: { min: 60_000, max: 30 * 60_000, default: 5 * 60_000 },
  headStartMs: { min: 0, max: 15 * 60_000, default: 3 * 60_000 },
} as const;

export const MIN_PLAYERS = 3;
export const OUT_OF_ZONE_GRACE_MS = 30_000;
export const SPECTATOR_DELAY_MS = 60_000;
export const GAME_CODE_LENGTH = 6;
/** Excludes look-alikes (0/O, 1/I/L). */
export const GAME_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export interface PlayerState {
  id: string;
  name: string;
  team: Team;
  status: PlayerStatus;
  /** Last reported position, if any. */
  position?: LatLng & { at: number };
  /** When the runner first left the zone in the current excursion; undefined while inside. */
  outOfZoneSince?: number;
}

/** A ping snapshot: where each active runner was at `at`. */
export interface PingSnapshot {
  at: number;
  runners: { playerId: string; position: LatLng }[];
}

/** What one viewer may see of another player right now. */
export type Visibility = "live" | "delayed" | "pingOnly" | "hidden";
