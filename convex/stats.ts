// Stats v2: per-game results, all-time + weekly aggregates, leaderboards.
// Aggregates are written once per game from games.finishGame (write-time, idempotent).
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import * as engine from "../src/engine";
import { deriveResults, weekEndsAtTR, weekKeyTR } from "../src/engine/points";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { gamePlayers, requireUser } from "./lib";

type Ctx = QueryCtx | MutationCtx;

// --- public types (P1 ↔ P2 contract, docs/DESIGN-v2.md B2) -----------------------

export type Board = "points" | "hunter" | "runner" | "games";
export type Window = "week" | "all";
export type Outcome = "win" | "loss";

export type MyStats = {
  listed: boolean;
  all: {
    gamesPlayed: number;
    wins: number;
    winRate: number; // 0..1
    hunterGames: number;
    runnerGames: number;
    tagsMade: number;
    survivedMs: number;
    bestSurvivalMs: number;
    distanceM: number;
    points: number;
    hunterPoints: number;
    runnerPoints: number;
    rank: number | null;
  };
  week: {
    weekKey: string;
    endsAt: number;
    gamesPlayed: number;
    wins: number;
    points: number;
    rank: number | null;
  };
};

export type LeaderboardRow = {
  rank: number;
  userId: Id<"users">;
  name: string;
  username: string;
  avatarUrl: string | null;
  value: number;
  gamesPlayed: number;
  isMe: boolean;
};
export type LeaderboardResult = {
  board: Board;
  window: Window;
  weekKey: string;
  endsAt: number | null;
  rows: LeaderboardRow[];
  me: LeaderboardRow | null; // null if unlisted or nothing on this board
};

export type BreakdownLine = { key: string; label: string; points: number };
export type GameResultView = {
  points: number;
  ranked: boolean;
  outcome: Outcome;
  startTeam: engine.Team;
  endTeam: engine.Team;
  tagsMade: number;
  survivedMs: number;
  distanceM: number | null;
  breakdown: BreakdownLine[];
  week: { points: number; rank: number | null };
};

export type RecentResult = {
  gameId: Id<"games">;
  code: string;
  endedAt: number;
  startTeam: engine.Team;
  endTeam: engine.Team;
  outcome: Outcome;
  points: number;
  ranked: boolean;
  tagsMade: number;
  survivedMs: number;
  distanceM: number | null;
  playerCount: number;
};

export const boardV = v.union(
  v.literal("points"),
  v.literal("hunter"),
  v.literal("runner"),
  v.literal("games"),
);
export const windowV = v.union(v.literal("week"), v.literal("all"));

// --- helpers ------------------------------------------------------------------------

type BoardField = "points" | "hunterPoints" | "runnerPoints" | "gamesPlayed";
const BOARD_FIELD: Record<Board, BoardField> = {
  points: "points",
  hunter: "hunterPoints",
  runner: "runnerPoints",
  games: "gamesPlayed",
};
const RANK_SCAN_LIMIT = 1000;

async function avatarUrlOf(
  ctx: Ctx,
  profile: { avatarId?: Id<"_storage"> } | null,
) {
  return profile?.avatarId ? await ctx.storage.getUrl(profile.avatarId) : null;
}

async function profileOf(ctx: Ctx, userId: Id<"users">) {
  return await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}

async function playerStatsOf(ctx: Ctx, userId: Id<"users">) {
  return await ctx.db
    .query("playerStats")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}

async function weeklyStatsOf(ctx: Ctx, userId: Id<"users">, weekKey: string) {
  return await ctx.db
    .query("weeklyStats")
    .withIndex("by_user_week", (q) =>
      q.eq("userId", userId).eq("weekKey", weekKey),
    )
    .unique();
}

/**
 * Listed rows (value > 0) on a board, highest first. The index names differ only by
 * field, so the field name is cast to one representative literal for typing.
 */
function boardQuery(
  ctx: Ctx,
  board: Board,
  window: Window,
  weekKey: string,
  above = 0,
) {
  const field = BOARD_FIELD[board];
  if (window === "week") {
    return ctx.db
      .query("weeklyStats")
      .withIndex(`by_week_listed_${field}` as "by_week_listed_points", (q) =>
        q
          .eq("weekKey", weekKey)
          .eq("listed", true)
          .gt(field as "points", above),
      )
      .order("desc");
  }
  return ctx.db
    .query("playerStats")
    .withIndex(`by_listed_${field}` as "by_listed_points", (q) =>
      q.eq("listed", true).gt(field as "points", above),
    )
    .order("desc");
}

/** Competition rank (1, 2, 2, 4) of `value`; null above 1000 or for value 0. */
async function rankOf(
  ctx: Ctx,
  board: Board,
  window: Window,
  weekKey: string,
  value: number,
) {
  if (value <= 0) return null;
  const higher = await boardQuery(ctx, board, window, weekKey, value).take(
    RANK_SCAN_LIMIT,
  );
  return higher.length >= RANK_SCAN_LIMIT ? null : higher.length + 1;
}

// --- write path (called from games.finishGame) --------------------------------------

/**
 * Inserts one gameResults row per finishing player and bumps their all-time and
 * weekly totals. Call once, in the transaction that ends the game; a second call for
 * the same game is a no-op.
 */
export async function recordGameResults(
  ctx: MutationCtx,
  game: Doc<"games">,
  winner: engine.Winner,
  now: number,
) {
  if (game.startedAt === undefined) return;
  const already = await ctx.db
    .query("gameResults")
    .withIndex("by_game", (q) => q.eq("gameId", game._id))
    .first();
  if (already) return;

  const endedAt = game.endedAt ?? now;
  const players = await gamePlayers(ctx, game._id);
  const byId = new Map(players.map((p) => [p._id as string, p]));
  const results = deriveResults(
    { startedAt: game.startedAt, endedAt, winner, settings: game.settings },
    players.map((p) => ({
      id: p._id,
      team: p.team,
      status: p.status,
      taggedAt: p.taggedAt,
    })),
  );
  const weekKey = weekKeyTR(endedAt);

  for (const r of results) {
    const userId = byId.get(r.playerId)!.userId;
    const listed = !(await profileOf(ctx, userId))?.hideFromLeaderboard;
    const win = r.outcome === "win" ? 1 : 0;
    await ctx.db.insert("gameResults", {
      gameId: game._id,
      userId,
      code: game.code,
      endedAt,
      weekKey,
      startTeam: r.startTeam,
      endTeam: r.endTeam,
      outcome: r.outcome,
      winner,
      ranked: r.ranked,
      tagsMade: r.tagsMade,
      survivedMs: r.survivedMs,
      survivedToEnd: r.survivedToEnd,
      durationMs: r.durationMs,
      playerCount: r.playerCount,
      points: r.points,
      hunterPoints: r.hunterPoints,
      runnerPoints: r.runnerPoints,
      breakdown: r.breakdown,
    });

    // Points only come from ranked games; points are already 0 when unranked.
    const all = await playerStatsOf(ctx, userId);
    const isHunter = r.startTeam === "hunter";
    if (all) {
      await ctx.db.patch(all._id, {
        listed,
        gamesPlayed: all.gamesPlayed + 1,
        rankedGames: all.rankedGames + (r.ranked ? 1 : 0),
        wins: all.wins + win,
        hunterGames: all.hunterGames + (isHunter ? 1 : 0),
        hunterWins: all.hunterWins + (isHunter ? win : 0),
        runnerGames: all.runnerGames + (isHunter ? 0 : 1),
        runnerWins: all.runnerWins + (isHunter ? 0 : win),
        tagsMade: all.tagsMade + r.tagsMade,
        survivedMs: all.survivedMs + r.survivedMs,
        bestSurvivalMs: Math.max(all.bestSurvivalMs, r.survivedMs),
        points: all.points + r.points,
        hunterPoints: all.hunterPoints + r.hunterPoints,
        runnerPoints: all.runnerPoints + r.runnerPoints,
        lastPlayedAt: Math.max(all.lastPlayedAt, endedAt),
      });
    } else {
      await ctx.db.insert("playerStats", {
        userId,
        listed,
        gamesPlayed: 1,
        rankedGames: r.ranked ? 1 : 0,
        wins: win,
        hunterGames: isHunter ? 1 : 0,
        hunterWins: isHunter ? win : 0,
        runnerGames: isHunter ? 0 : 1,
        runnerWins: isHunter ? 0 : win,
        tagsMade: r.tagsMade,
        survivedMs: r.survivedMs,
        bestSurvivalMs: r.survivedMs,
        distanceM: 0,
        points: r.points,
        hunterPoints: r.hunterPoints,
        runnerPoints: r.runnerPoints,
        lastPlayedAt: endedAt,
      });
    }

    const week = await weeklyStatsOf(ctx, userId, weekKey);
    if (week) {
      await ctx.db.patch(week._id, {
        listed,
        gamesPlayed: week.gamesPlayed + 1,
        wins: week.wins + win,
        tagsMade: week.tagsMade + r.tagsMade,
        survivedMs: week.survivedMs + r.survivedMs,
        points: week.points + r.points,
        hunterPoints: week.hunterPoints + r.hunterPoints,
        runnerPoints: week.runnerPoints + r.runnerPoints,
      });
    } else {
      await ctx.db.insert("weeklyStats", {
        userId,
        weekKey,
        listed,
        gamesPlayed: 1,
        wins: win,
        tagsMade: r.tagsMade,
        survivedMs: r.survivedMs,
        points: r.points,
        hunterPoints: r.hunterPoints,
        runnerPoints: r.runnerPoints,
      });
    }
  }

  if (results.length > 0) {
    await ctx.scheduler.runAfter(0, internal.stats.computeDistance, {
      gameId: game._id,
    });
  }
}

const MAX_SEGMENT_M = 300;
const MAX_SPEED_MPS = 8;

/** Sums each finisher's walked distance from positionHistory (GPS jumps skipped). */
export const computeDistance = internalMutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const game = await ctx.db.get(gameId);
    const rows = await ctx.db
      .query("gameResults")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .collect();
    for (const row of rows) {
      if (row.distanceM !== undefined) continue;
      let total = 0;
      const player = await ctx.db
        .query("players")
        .withIndex("by_game_user", (q) =>
          q.eq("gameId", gameId).eq("userId", row.userId),
        )
        .unique();
      if (game && player && game.startedAt !== undefined) {
        const points = await ctx.db
          .query("positionHistory")
          .withIndex("by_player_at", (q) =>
            q
              .eq("playerId", player._id)
              .gte("at", game.startedAt!)
              .lte("at", row.endedAt),
          )
          .take(5000);
        for (let i = 1; i < points.length; i++) {
          const a = points[i - 1];
          const b = points[i];
          const d = engine.distanceM(a, b);
          const dt = (b.at - a.at) / 1000;
          if (dt <= 0 || d > MAX_SEGMENT_M || d / dt > MAX_SPEED_MPS) continue;
          total += d;
        }
      }
      const distanceM = Math.round(total);
      await ctx.db.patch(row._id, { distanceM });
      const all = await playerStatsOf(ctx, row.userId);
      if (all && distanceM > 0)
        await ctx.db.patch(all._id, { distanceM: all.distanceM + distanceM });
    }
  },
});

// --- queries ------------------------------------------------------------------------

export const mine = query({
  args: {},
  handler: async (ctx): Promise<MyStats> => {
    const now = Date.now();
    const weekKey = weekKeyTR(now);
    const endsAt = weekEndsAtTR(now);
    const userId = await getAuthUserId(ctx);
    const all = userId ? await playerStatsOf(ctx, userId) : null;
    const week = userId ? await weeklyStatsOf(ctx, userId, weekKey) : null;
    const profile = userId ? await profileOf(ctx, userId) : null;
    const listed = !profile?.hideFromLeaderboard;
    const gamesPlayed = all?.gamesPlayed ?? 0;
    return {
      listed,
      all: {
        gamesPlayed,
        wins: all?.wins ?? 0,
        winRate: gamesPlayed > 0 ? (all?.wins ?? 0) / gamesPlayed : 0,
        hunterGames: all?.hunterGames ?? 0,
        runnerGames: all?.runnerGames ?? 0,
        tagsMade: all?.tagsMade ?? 0,
        survivedMs: all?.survivedMs ?? 0,
        bestSurvivalMs: all?.bestSurvivalMs ?? 0,
        distanceM: all?.distanceM ?? 0,
        points: all?.points ?? 0,
        hunterPoints: all?.hunterPoints ?? 0,
        runnerPoints: all?.runnerPoints ?? 0,
        rank:
          listed && all
            ? await rankOf(ctx, "points", "all", weekKey, all.points)
            : null,
      },
      week: {
        weekKey,
        endsAt,
        gamesPlayed: week?.gamesPlayed ?? 0,
        wins: week?.wins ?? 0,
        points: week?.points ?? 0,
        rank:
          listed && week
            ? await rankOf(ctx, "points", "week", weekKey, week.points)
            : null,
      },
    };
  },
});

export const leaderboard = query({
  args: { board: boardV, window: windowV, limit: v.optional(v.number()) },
  handler: async (
    ctx,
    { board, window, limit },
  ): Promise<LeaderboardResult> => {
    const now = Date.now();
    const weekKey = weekKeyTR(now);
    const take = Math.min(Math.max(Math.floor(limit ?? 50), 1), 100);
    const field = BOARD_FIELD[board];
    const myId = await getAuthUserId(ctx);

    const stats = await boardQuery(ctx, board, window, weekKey).take(take);
    const rows: LeaderboardRow[] = [];
    for (let i = 0; i < stats.length; i++) {
      const s = stats[i];
      const value = s[field];
      const prev = rows[i - 1];
      const rank = prev && prev.value === value ? prev.rank : i + 1;
      const profile = await profileOf(ctx, s.userId);
      rows.push({
        rank,
        userId: s.userId,
        name: profile?.name ?? "Oyuncu",
        username: profile?.username ?? "",
        avatarUrl: await avatarUrlOf(ctx, profile),
        value,
        gamesPlayed: s.gamesPlayed,
        isMe: s.userId === myId,
      });
    }

    let me: LeaderboardRow | null = rows.find((r) => r.isMe) ?? null;
    if (!me && myId) {
      const mine =
        window === "week"
          ? await weeklyStatsOf(ctx, myId, weekKey)
          : await playerStatsOf(ctx, myId);
      const profile = await profileOf(ctx, myId);
      if (mine && !profile?.hideFromLeaderboard && mine[field] > 0) {
        const rank = await rankOf(ctx, board, window, weekKey, mine[field]);
        me = {
          // Beyond the scan limit: show as "1000+" in the UI.
          rank: rank ?? RANK_SCAN_LIMIT + 1,
          userId: myId,
          name: profile?.name ?? "Oyuncu",
          username: profile?.username ?? "",
          avatarUrl: await avatarUrlOf(ctx, profile),
          value: mine[field],
          gamesPlayed: mine.gamesPlayed,
          isMe: true,
        };
      }
    }

    return {
      board,
      window,
      weekKey,
      endsAt: window === "week" ? weekEndsAtTR(now) : null,
      rows,
      me,
    };
  },
});

export const forGame = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }): Promise<GameResultView | null> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const row = await ctx.db
      .query("gameResults")
      .withIndex("by_game_user", (q) =>
        q.eq("gameId", gameId).eq("userId", userId),
      )
      .unique();
    if (!row) return null;
    const week = await weeklyStatsOf(ctx, userId, row.weekKey);
    const profile = await profileOf(ctx, userId);
    const weekPoints = week?.points ?? 0;
    return {
      points: row.points,
      ranked: row.ranked,
      outcome: row.outcome,
      startTeam: row.startTeam,
      endTeam: row.endTeam,
      tagsMade: row.tagsMade,
      survivedMs: row.survivedMs,
      distanceM: row.distanceM ?? null,
      breakdown: row.breakdown,
      week: {
        points: weekPoints,
        rank: profile?.hideFromLeaderboard
          ? null
          : await rankOf(ctx, "points", "week", row.weekKey, weekPoints),
      },
    };
  },
});

export const recentResults = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }): Promise<RecentResult[]> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const take = Math.min(Math.max(Math.floor(limit ?? 20), 1), 100);
    const rows = await ctx.db
      .query("gameResults")
      .withIndex("by_user_endedAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(take);
    return rows.map((r) => ({
      gameId: r.gameId,
      code: r.code,
      endedAt: r.endedAt,
      startTeam: r.startTeam,
      endTeam: r.endTeam,
      outcome: r.outcome,
      points: r.points,
      ranked: r.ranked,
      tagsMade: r.tagsMade,
      survivedMs: r.survivedMs,
      distanceM: r.distanceM ?? null,
      playerCount: r.playerCount,
    }));
  },
});

// --- mutations ----------------------------------------------------------------------

export const setListed = mutation({
  args: { listed: v.boolean() },
  handler: async (ctx, { listed }) => {
    const userId = await requireUser(ctx);
    const profile = await profileOf(ctx, userId);
    if (profile)
      await ctx.db.patch(profile._id, { hideFromLeaderboard: !listed });
    const all = await playerStatsOf(ctx, userId);
    if (all) await ctx.db.patch(all._id, { listed });
    const weeks = await ctx.db
      .query("weeklyStats")
      .withIndex("by_user_week", (q) => q.eq("userId", userId))
      .collect();
    for (const w of weeks) await ctx.db.patch(w._id, { listed });
    return null;
  },
});

/** One-off: record results for ended games still in the DB (≤ 7 days) that have none. */
export const backfill = internalMutation({
  args: {},
  handler: async (ctx) => {
    const games = await ctx.db
      .query("games")
      .withIndex("by_expiresAt", (q) => q.gt("expiresAt", Date.now()))
      .collect();
    let recorded = 0;
    for (const game of games) {
      if (
        game.status !== "ended" ||
        !game.winner ||
        game.startedAt === undefined
      )
        continue;
      const existing = await ctx.db
        .query("gameResults")
        .withIndex("by_game", (q) => q.eq("gameId", game._id))
        .first();
      if (existing) continue;
      await recordGameResults(
        ctx,
        game,
        game.winner,
        game.endedAt ?? Date.now(),
      );
      recorded++;
    }
    return { recorded };
  },
});
