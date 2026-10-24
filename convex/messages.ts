import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { fail, maskProfanity, requirePlayer } from "./lib";

const MAX_LEN = 500;

export const send = mutation({
  args: { gameId: v.id("games"), text: v.string() },
  handler: async (ctx, { gameId, text }) => {
    const { game, player } = await requirePlayer(ctx, gameId);
    if (!player.team) fail("Takım sohbeti oyun başlayınca açılır.");
    if (game.status === "ended") fail("Oyun bitti.");
    if (player.status !== "active") fail("Yakalanan oyuncular mesaj gönderemez.");
    const trimmed = text.trim();
    if (!trimmed) fail("Mesaj boş olamaz.");
    if (trimmed.length > MAX_LEN) fail(`Mesaj en fazla ${MAX_LEN} karakter olabilir.`);
    await ctx.db.insert("messages", {
      gameId,
      team: player.team,
      playerId: player._id,
      name: player.name,
      text: maskProfanity(trimmed),
      at: Date.now(),
    });
    return null;
  },
});

/** Last 100 messages of the caller's team, oldest first. */
export const list = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const { player } = await requirePlayer(ctx, gameId);
    const team = player.team;
    if (!team) return [];
    const rows = await ctx.db
      .query("messages")
      .withIndex("by_game_team_at", (q) => q.eq("gameId", gameId).eq("team", team))
      .order("desc")
      .take(100);
    return rows.reverse().map((m) => ({
      _id: m._id,
      playerId: m.playerId,
      name: m.name,
      text: m.text,
      at: m.at,
      team: m.team,
      isMe: m.playerId === player._id,
    }));
  },
});
