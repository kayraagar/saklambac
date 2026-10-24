import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  gameSettingsV,
  gameStatusV,
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
});
