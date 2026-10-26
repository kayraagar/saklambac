// Points, per-player game results and Turkey-time week keys (stats v2).
// Pure TypeScript: imported by the app and by convex/stats.ts.
import { MIN_PLAYERS, type GameSettings, type PlayerStatus, type Team, type Winner } from "./types";

export const POINTS = {
  played: 10,
  win: 50,
  perTag: 20,
  perSurvivedMinute: 3,
  survivor: 30,
} as const;

/** Games shorter than this (hunting time) or with fewer than MIN_PLAYERS don't count. */
export const RANKED_MIN_HUNT_MS = 5 * 60_000;

export type Outcome = "win" | "loss";
export type PointsKey = "played" | "win" | "tags" | "survival" | "survivor";
export interface PointsLine {
  key: PointsKey;
  label: string;
  points: number;
}

export interface ScoreInput {
  startTeam: Team;
  endTeam: Team;
  outcome: Outcome;
  /** Team catches credited to this player while they were a hunter. */
  tagsMade: number;
  /** Hunting time survived as a runner (0 for start-hunters). */
  survivedMs: number;
  /** Runner still active (untagged) when the game ended. */
  survivedToEnd: boolean;
  ranked: boolean;
}

export interface Score {
  points: number;
  hunterPoints: number;
  runnerPoints: number;
  /**
   * What the player earned, line by line. For an unranked game the lines keep
   * their would-be values (for display) while every total is 0.
   */
  breakdown: PointsLine[];
}

export function scoreGame(input: ScoreInput): Score {
  const lines: (PointsLine & { bucket: Team })[] = [];
  lines.push({ key: "played", label: "Oyunu tamamladın", points: POINTS.played, bucket: input.startTeam });
  if (input.outcome === "win") {
    lines.push({ key: "win", label: "Takımın kazandı", points: POINTS.win, bucket: input.endTeam });
  }
  const tags = Math.max(0, Math.floor(input.tagsMade));
  if (tags > 0) {
    lines.push({
      key: "tags",
      label: `Takım yakalaması ×${tags}`,
      points: tags * POINTS.perTag,
      bucket: "hunter",
    });
  }
  const minutes = Math.max(0, Math.floor(input.survivedMs / 60_000));
  if (minutes > 0) {
    lines.push({
      key: "survival",
      label: `Hayatta kalma (${minutes} dk)`,
      points: minutes * POINTS.perSurvivedMinute,
      bucket: "runner",
    });
  }
  if (input.survivedToEnd) {
    lines.push({ key: "survivor", label: "Sona kadar yakalanmadın", points: POINTS.survivor, bucket: "runner" });
  }

  const breakdown = lines.map(({ key, label, points }) => ({ key, label, points }));
  if (!input.ranked) return { points: 0, hunterPoints: 0, runnerPoints: 0, breakdown };
  const sum = (bucket?: Team) =>
    lines.filter((l) => bucket === undefined || l.bucket === bucket).reduce((a, l) => a + l.points, 0);
  return { points: sum(), hunterPoints: sum("hunter"), runnerPoints: sum("runner"), breakdown };
}

// --- per-player derivation from a finished game ------------------------------

export interface ResultPlayer {
  id: string;
  team?: Team;
  status: PlayerStatus;
  taggedAt?: number;
}

export interface ResultGame {
  startedAt: number;
  endedAt: number;
  winner: Winner;
  settings: Pick<GameSettings, "headStartMs" | "roundMs">;
}

export interface PlayerResult extends ScoreInput, Score {
  playerId: string;
  playerCount: number;
  durationMs: number;
}

/** Only runners can be tagged, so a tagged player started as a runner. */
export function startTeamOf(p: ResultPlayer): Team | undefined {
  return p.taggedAt !== undefined ? "runner" : p.team;
}

export function isRanked(activePlayerCount: number, huntStart: number, endedAt: number): boolean {
  return activePlayerCount >= MIN_PLAYERS && endedAt - huntStart >= RANKED_MIN_HUNT_MS;
}

/**
 * One result per player who finished the game (not left, has a team).
 * Tags are team credit: every player who was a hunter at the moment of a catch
 * gets it (the game doesn't record who made the tag).
 */
export function deriveResults(game: ResultGame, players: ResultPlayer[]): PlayerResult[] {
  const huntStart = game.startedAt + game.settings.headStartMs;
  const finishers = players.filter((p) => p.status !== "left" && p.team !== undefined);
  const ranked = isRanked(finishers.length, huntStart, game.endedAt);
  const tagTimes = players.flatMap((p) => (p.taggedAt !== undefined ? [p.taggedAt] : []));

  return finishers.map((p) => {
    const startTeam = startTeamOf(p)!;
    const endTeam = p.team!;
    const outcome: Outcome =
      (endTeam === "hunter" && game.winner === "hunters") ||
      (endTeam === "runner" && game.winner === "runners")
        ? "win"
        : "loss";
    const hunterSince = startTeam === "hunter" ? -Infinity : endTeam === "hunter" ? p.taggedAt! : Infinity;
    const tagsMade = tagTimes.filter((t) => t > hunterSince).length;
    const survivedMs =
      startTeam === "runner"
        ? Math.min(Math.max((p.taggedAt ?? game.endedAt) - huntStart, 0), game.settings.roundMs)
        : 0;
    const survivedToEnd = startTeam === "runner" && endTeam === "runner" && p.status === "active";
    const input: ScoreInput = { startTeam, endTeam, outcome, tagsMade, survivedMs, survivedToEnd, ranked };
    return {
      playerId: p.id,
      playerCount: finishers.length,
      durationMs: game.endedAt - game.startedAt,
      ...input,
      ...scoreGame(input),
    };
  });
}

// --- weeks in Turkey time (fixed UTC+3, no DST since 2016) --------------------

const DAY_MS = 86_400_000;
const TR_OFFSET_MS = 3 * 3_600_000;

/** ISO week of `ms` in Turkey time, e.g. "2026-W44". Weeks start Monday 00:00 TR. */
export function weekKeyTR(ms: number): string {
  const local = new Date(ms + TR_OFFSET_MS);
  const dayIdx = (local.getUTCDay() + 6) % 7; // Monday = 0
  const thursday = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - dayIdx + 3),
  );
  const year = thursday.getUTCFullYear();
  const ordinal = Math.round((thursday.getTime() - Date.UTC(year, 0, 1)) / DAY_MS); // 0-based
  const week = Math.floor(ordinal / 7) + 1;
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** UTC ms of the next Monday 00:00 Turkey time after `ms` (end of its week). */
export function weekEndsAtTR(ms: number): number {
  const local = ms + TR_OFFSET_MS;
  const dayStart = Math.floor(local / DAY_MS) * DAY_MS;
  const dayIdx = (new Date(dayStart).getUTCDay() + 6) % 7;
  return dayStart - dayIdx * DAY_MS + 7 * DAY_MS - TR_OFFSET_MS;
}
