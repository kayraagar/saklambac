import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  gameSettingsV,
  gameStatusV,
  outcomeV,
  playerStatusV,
  rolePreferenceV,
  teamV,
  winnerV,
} from "./validators";

export default defineSchema({
  ...authTables,

  profiles: defineTable({
    userId: v.id("users"),
    name: v.string(),
    username: v.string(), // stored lowercase
    hideFromLeaderboard: v.optional(v.boolean()), // source of truth for stats `listed`
  })
    .index("by_user", ["userId"])
    .index("by_username", ["username"]),

  games: defineTable({
    code: v.string(),
    hostId: v.id("users"),
    status: gameStatusV,
    settings: gameSettingsV,
    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    winner: v.optional(winnerV),
    expiresAt: v.number(), // createdAt + 7 days
  })
    .index("by_code", ["code"])
    .index("by_expiresAt", ["expiresAt"]),

  players: defineTable({
    gameId: v.id("games"),
    userId: v.id("users"),
    name: v.string(),
    pref: rolePreferenceV,
    team: v.optional(teamV),
    status: playerStatusV,
    ready: v.boolean(),
    pushToken: v.optional(v.string()),
    outOfZoneSince: v.optional(v.number()),
    taggedAt: v.optional(v.number()),
  })
    .index("by_game", ["gameId"])
    .index("by_game_user", ["gameId", "userId"])
    .index("by_user", ["userId"]),

  // Latest position per player (upserted).
  positions: defineTable({
    gameId: v.id("games"),
    playerId: v.id("players"),
    lat: v.number(),
    lng: v.number(),
    at: v.number(),
  })
    .index("by_game", ["gameId"])
    .index("by_player", ["playerId"]),

  // Append-only trail; used for the delayed spectator view.
  positionHistory: defineTable({
    gameId: v.id("games"),
    playerId: v.id("players"),
    lat: v.number(),
    lng: v.number(),
    at: v.number(),
  })
    .index("by_game", ["gameId"])
    .index("by_player_at", ["playerId", "at"]),

  pings: defineTable({
    gameId: v.id("games"),
    at: v.number(),
    runners: v.array(
      v.object({ playerId: v.id("players"), lat: v.number(), lng: v.number() }),
    ),
  }).index("by_game_at", ["gameId", "at"]),

  messages: defineTable({
    gameId: v.id("games"),
    team: teamV,
    playerId: v.id("players"),
    name: v.string(),
    text: v.string(),
    at: v.number(),
  })
    .index("by_game", ["gameId"])
    .index("by_game_team_at", ["gameId", "team", "at"]),

  // --- stats (v2) ------------------------------------------------------------

  // One immutable row per (game, user), written when the game ends. Never cleaned up.
  gameResults: defineTable({
    gameId: v.id("games"), // game row may be deleted later; id kept for reference
    userId: v.id("users"),
    code: v.string(),
    endedAt: v.number(),
    weekKey: v.string(),
    startTeam: teamV,
    endTeam: teamV,
    outcome: outcomeV,
    winner: winnerV,
    ranked: v.boolean(),
    tagsMade: v.number(),
    survivedMs: v.number(), // 0 for start-hunters
    survivedToEnd: v.boolean(),
    durationMs: v.number(), // endedAt - startedAt
    playerCount: v.number(),
    points: v.number(),
    hunterPoints: v.number(),
    runnerPoints: v.number(),
    breakdown: v.array(v.object({ key: v.string(), label: v.string(), points: v.number() })),
    distanceM: v.optional(v.number()),
  })
    .index("by_user_endedAt", ["userId", "endedAt"])
    .index("by_game", ["gameId"])
    .index("by_game_user", ["gameId", "userId"]),

  // All-time totals, one row per user.
  playerStats: defineTable({
    userId: v.id("users"),
    listed: v.boolean(), // leaderboard opt-out mirror
    gamesPlayed: v.number(), // ranked + unranked finished games
    rankedGames: v.number(),
    wins: v.number(),
    hunterGames: v.number(),
    hunterWins: v.number(),
    runnerGames: v.number(),
    runnerWins: v.number(),
    tagsMade: v.number(),
    survivedMs: v.number(),
    bestSurvivalMs: v.number(),
    distanceM: v.number(),
    points: v.number(),
    hunterPoints: v.number(),
    runnerPoints: v.number(),
    lastPlayedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_listed_points", ["listed", "points"])
    .index("by_listed_hunterPoints", ["listed", "hunterPoints"])
    .index("by_listed_runnerPoints", ["listed", "runnerPoints"])
    .index("by_listed_gamesPlayed", ["listed", "gamesPlayed"]),

  // One row per (user, ISO week in Turkey time). "Bu hafta" resets by key.
  weeklyStats: defineTable({
    userId: v.id("users"),
    weekKey: v.string(),
    listed: v.boolean(),
    gamesPlayed: v.number(),
    wins: v.number(),
    tagsMade: v.number(),
    survivedMs: v.number(),
    points: v.number(),
    hunterPoints: v.number(),
    runnerPoints: v.number(),
  })
    .index("by_user_week", ["userId", "weekKey"])
    .index("by_week_listed_points", ["weekKey", "listed", "points"])
    .index("by_week_listed_hunterPoints", ["weekKey", "listed", "hunterPoints"])
    .index("by_week_listed_runnerPoints", ["weekKey", "listed", "runnerPoints"])
    .index("by_week_listed_gamesPlayed", ["weekKey", "listed", "gamesPlayed"]),
});
