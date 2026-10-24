import { v } from "convex/values";
import * as engine from "../src/engine";
import { mutation } from "./_generated/server";
import { fail, requirePlayer, toPlayerState } from "./lib";

const MAX_CLOCK_SKEW_MS = 5 * 60_000;

/**
 * Background location report. Silently ignored (returns { accepted: false })
 * outside a running round so background tasks don't spam errors.
 */
export const report = mutation({
  args: { gameId: v.id("games"), lat: v.number(), lng: v.number(), at: v.number() },
  handler: async (ctx, { gameId, lat, lng, at }) => {
    const { game, player } = await requirePlayer(ctx, gameId);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      fail("Geçersiz konum.");
    }
    if (game.status !== "headStart" && game.status !== "hunting") return { accepted: false };

    const now = Date.now();
    // Server time is authoritative: clamp client timestamps.
    const ts = Math.min(now, Math.max(now - MAX_CLOCK_SKEW_MS, Number.isFinite(at) ? at : now));

    await ctx.db.insert("positionHistory", { gameId, playerId: player._id, lat, lng, at: ts });

    const existing = await ctx.db
      .query("positions")
      .withIndex("by_player", (q) => q.eq("playerId", player._id))
      .unique();
    if (existing && existing.at > ts) return { accepted: true }; // out-of-order report
    if (existing) {
      await ctx.db.patch(existing._id, { lat, lng, at: ts });
    } else {
      await ctx.db.insert("positions", { gameId, playerId: player._id, lat, lng, at: ts });
    }

    if (player.status === "active") {
      const state = toPlayerState(player, { lat, lng, at: ts });
      if (state) {
        const outOfZoneSince = engine.updateOutOfZone(state, game.settings.zone, now);
        if (outOfZoneSince !== player.outOfZoneSince) {
          await ctx.db.patch(player._id, { outOfZoneSince });
        }
      }
    }
    return { accepted: true };
  },
});
