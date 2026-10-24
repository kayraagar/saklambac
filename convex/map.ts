import { v } from "convex/values";
import * as engine from "../src/engine";
import type { PingSnapshot } from "../src/engine";
import type { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { gamePlayers, latestPositions, requirePlayer, toPlayerState } from "./lib";

export type Pos = {
  playerId: Id<"players">;
  name: string;
  team: engine.Team;
  status: engine.PlayerStatus;
  lat: number;
  lng: number;
  at: number;
  isMe: boolean;
};

/**
 * Positions the caller may see right now, filtered server-side with
 * engine.visibility. "delayed" targets come from positionHistory
 * SPECTATOR_DELAY_MS back. After the round ends everything is revealed.
 */
export const view = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const { game, player: me } = await requirePlayer(ctx, gameId);
    const empty = { live: [] as Pos[], delayed: [] as Pos[], lastPing: null as PingSnapshot | null };
    if (game.status === "lobby") return empty;

    const now = Date.now();
    const players = await gamePlayers(ctx, gameId);
    const positions = await latestPositions(ctx, gameId);
    const viewer = toPlayerState(me, positions.get(me._id));
    if (!viewer) return empty;

    const live: Pos[] = [];
    const delayed: Pos[] = [];
    const cutoff = now - engine.SPECTATOR_DELAY_MS;

    for (const p of players) {
      const target = toPlayerState(p, positions.get(p._id));
      if (!target) continue;
      const vis =
        game.status === "ended"
          ? p.status === "left"
            ? "hidden"
            : "live"
          : engine.visibility(viewer, target, game.settings, now);
      const base = { playerId: p._id, name: p.name, team: target.team, status: p.status, isMe: p._id === me._id };

      if (vis === "live") {
        const pos = positions.get(p._id);
        if (pos) live.push({ ...base, lat: pos.lat, lng: pos.lng, at: pos.at });
      } else if (vis === "delayed") {
        const old = await ctx.db
          .query("positionHistory")
          .withIndex("by_player_at", (q) => q.eq("playerId", p._id).lte("at", cutoff))
          .order("desc")
          .first();
        if (old) delayed.push({ ...base, lat: old.lat, lng: old.lng, at: old.at });
      }
      // "pingOnly" / "hidden": nothing beyond the ping snapshot below.
    }

    const ping = await ctx.db
      .query("pings")
      .withIndex("by_game_at", (q) => q.eq("gameId", gameId))
      .order("desc")
      .first();
    const lastPing: PingSnapshot | null = ping
      ? {
          at: ping.at,
          runners: ping.runners.map((r) => ({
            playerId: r.playerId,
            position: { lat: r.lat, lng: r.lng },
          })),
        }
      : null;

    return { live, delayed, lastPing };
  },
});
