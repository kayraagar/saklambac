import { v } from "convex/values";
import * as engine from "../src/engine";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import {
  displayName,
  fail,
  findPlayer,
  gamePhase,
  gamePlayers,
  getGame,
  latestPositions,
  playerStates,
  requireHost,
  requirePlayer,
  requireUser,
} from "./lib";
import { gameSettingsV, rolePreferenceV, winnerV } from "./validators";

const GAME_TTL_MS = 7 * 24 * 3_600_000;

// --- helpers -----------------------------------------------------------------

function checkSettings(settings: engine.GameSettings) {
  const r = engine.validateSettings(settings);
  if (!r.ok) fail(r.errors.join(" "));
}

async function requireLobby(game: Doc<"games">) {
  if (game.status !== "lobby") fail("Oyun zaten başladı.");
}

async function notify(
  ctx: MutationCtx,
  players: Doc<"players">[],
  title: string,
  body: string,
  data: Record<string, string>,
) {
  const tokens = players.flatMap((p) => (p.pushToken ? [p.pushToken] : []));
  if (tokens.length === 0) return;
  await ctx.scheduler.runAfter(0, internal.push.send, { tokens, title, body, data });
}

/** Ends the round (idempotent) and notifies everyone still in the game. */
async function finishGame(
  ctx: MutationCtx,
  game: Doc<"games">,
  winner: engine.Winner,
  now: number,
) {
  if (game.status === "ended") return;
  await ctx.db.patch(game._id, { status: "ended", endedAt: now, winner });
  const players = (await gamePlayers(ctx, game._id)).filter((p) => p.status !== "left");
  await notify(
    ctx,
    players,
    "Tur bitti",
    winner === "hunters" ? "Avcılar kazandı!" : "Kaçaklar kazandı!",
    { type: "roundOver", gameId: game._id, winner },
  );
}

/** If the engine says the game is decided, end it. Returns true when ended. */
async function maybeFinish(ctx: MutationCtx, game: Doc<"games">, now: number) {
  if (game.status === "lobby" || game.status === "ended" || game.startedAt === undefined) {
    return false;
  }
  const players = await gamePlayers(ctx, game._id);
  const phase = engine.phaseAt(game.startedAt, game.settings, now);
  const winner = engine.checkWinner(playerStates(players), phase);
  if (!winner) return false;
  await finishGame(ctx, game, winner, now);
  return true;
}

async function uniqueCode(ctx: MutationCtx): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = engine.generateGameCode();
    const existing = await ctx.db
      .query("games")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
    if (!existing) return code;
  }
  fail("Oyun kodu üretilemedi, tekrar dene.");
}

// --- mutations ---------------------------------------------------------------

export const create = mutation({
  args: { settings: gameSettingsV },
  handler: async (ctx, { settings }) => {
    const userId = await requireUser(ctx);
    checkSettings(settings);
    const now = Date.now();
    const code = await uniqueCode(ctx);
    const gameId = await ctx.db.insert("games", {
      code,
      hostId: userId,
      status: "lobby",
      settings,
      expiresAt: now + GAME_TTL_MS,
    });
    await ctx.db.insert("players", {
      gameId,
      userId,
      name: await displayName(ctx, userId),
      pref: "random",
      status: "active",
      ready: false,
    });
    return { gameId, code };
  },
});

export const join = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const userId = await requireUser(ctx);
    const normalized = code.trim().toUpperCase();
    const game = await ctx.db
      .query("games")
      .withIndex("by_code", (q) => q.eq("code", normalized))
      .first();
    if (!game || game.status === "ended") fail("Bu kodla bir oyun bulunamadı.");
    const existing = await findPlayer(ctx, game._id, userId);
    if (existing && existing.status !== "left") return { gameId: game._id };
    if (game.status !== "lobby") fail("Oyun başladı, artık katılamazsın.");
    if (existing) {
      await ctx.db.patch(existing._id, { status: "active", ready: false, pref: "random" });
    } else {
      await ctx.db.insert("players", {
        gameId: game._id,
        userId,
        name: await displayName(ctx, userId),
        pref: "random",
        status: "active",
        ready: false,
      });
    }
    return { gameId: game._id };
  },
});

export const setPref = mutation({
  args: { gameId: v.id("games"), pref: rolePreferenceV },
  handler: async (ctx, { gameId, pref }) => {
    const { game, player } = await requirePlayer(ctx, gameId);
    await requireLobby(game);
    await ctx.db.patch(player._id, { pref });
    return null;
  },
});

export const setReady = mutation({
  args: { gameId: v.id("games"), ready: v.boolean() },
  handler: async (ctx, { gameId, ready }) => {
    const { game, player } = await requirePlayer(ctx, gameId);
    await requireLobby(game);
    await ctx.db.patch(player._id, { ready });
    return null;
  },
});

export const updateSettings = mutation({
  args: { gameId: v.id("games"), settings: gameSettingsV },
  handler: async (ctx, { gameId, settings }) => {
    const { game } = await requireHost(ctx, gameId);
    await requireLobby(game);
    checkSettings(settings);
    await ctx.db.patch(gameId, { settings });
    return null;
  },
});

export const start = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const { game } = await requireHost(ctx, gameId);
    await requireLobby(game);
    checkSettings(game.settings);

    const players = (await gamePlayers(ctx, gameId)).filter((p) => p.status !== "left");
    const teams = engine.assignTeams(players.map((p) => ({ playerId: p._id, pref: p.pref })));
    if ("error" in teams) fail(teams.error as string);
    const assigned = players.map((p) => ({ ...p, team: (teams as Record<string, engine.Team>)[p._id] }));
    const ok = engine.canStart(assigned);
    if (!ok.ok) fail(ok.reason);

    const now = Date.now();
    for (const p of assigned) {
      await ctx.db.patch(p._id, {
        team: p.team,
        status: "active",
        outOfZoneSince: undefined,
        taggedAt: undefined,
      });
    }
    const s = game.settings;
    await ctx.db.patch(gameId, {
      status: s.headStartMs > 0 ? "headStart" : "hunting",
      startedAt: now,
      endedAt: undefined,
      winner: undefined,
    });

    const huntAt = engine.headStartEndAt(now, s);
    if (huntAt > now) {
      await ctx.scheduler.runAt(huntAt, internal.games.beginHunting, { gameId, startedAt: now });
    }
    const firstPing = engine.nextPingAt(now, s, now);
    if (firstPing !== null) {
      await ctx.scheduler.runAt(firstPing, internal.games.firePing, { gameId, startedAt: now });
    }
    await ctx.scheduler.runAt(engine.roundEndAt(now, s), internal.games.endRound, {
      gameId,
      startedAt: now,
    });

    await notify(ctx, assigned.filter((p) => p.team === "runner"), "Oyun başladı", "Kaçak oldun. Saklan!", {
      type: "start",
      gameId,
    });
    await notify(ctx, assigned.filter((p) => p.team === "hunter"), "Oyun başladı", "Avcı oldun. Kaçaklar dağılırken bekle.", {
      type: "start",
      gameId,
    });
    return null;
  },
});

export const leave = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await requireUser(ctx);
    const game = await getGame(ctx, gameId);
    const player = await findPlayer(ctx, gameId, userId);
    if (!player || player.status === "left") return null;
    await ctx.db.patch(player._id, { status: "left", ready: false });

    if (game.status === "lobby") {
      if (game.hostId === userId) {
        const rest = (await gamePlayers(ctx, gameId))
          .filter((p) => p.status !== "left" && p._id !== player._id)
          .sort((a, b) => a._creationTime - b._creationTime);
        if (rest.length > 0) {
          await ctx.db.patch(gameId, { hostId: rest[0].userId });
        } else {
          await ctx.db.patch(gameId, { status: "ended", endedAt: Date.now() });
        }
      }
      return null;
    }
    // Drop the leaver's latest position so nobody keeps seeing it.
    const pos = await ctx.db
      .query("positions")
      .withIndex("by_player", (q) => q.eq("playerId", player._id))
      .unique();
    if (pos) await ctx.db.delete(pos._id);
    const fresh = await getGame(ctx, gameId);
    await maybeFinish(ctx, fresh, Date.now());
    return null;
  },
});

export const confirmTagged = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const { game, player } = await requirePlayer(ctx, gameId);
    const now = Date.now();
    if (game.status === "ended") fail("Oyun bitti.");
    if (gamePhase(game, now) !== "hunting") fail("Av henüz başlamadı.");
    if (player.team !== "runner" || player.status !== "active") {
      fail("Sadece oyundaki kaçaklar yakalandığını onaylayabilir.");
    }

    if (game.settings.taggedJoinHunters) {
      await ctx.db.patch(player._id, {
        team: "hunter",
        status: "active",
        taggedAt: now,
        outOfZoneSince: undefined,
      });
    } else {
      await ctx.db.patch(player._id, { status: "tagged", taggedAt: now, outOfZoneSince: undefined });
    }

    const players = (await gamePlayers(ctx, gameId)).filter(
      (p) => p.status !== "left" && p._id !== player._id,
    );
    await notify(
      ctx,
      players,
      "Yakalandı!",
      game.settings.taggedJoinHunters
        ? `${player.name} yakalandı ve avcılara katıldı.`
        : `${player.name} yakalandı.`,
      { type: "tag", gameId, playerId: player._id },
    );
    await maybeFinish(ctx, game, now);
    return null;
  },
});

// --- internal / scheduled ----------------------------------------------------

/** Stale jobs from an earlier start carry a different startedAt and are ignored. */
async function liveGame(ctx: MutationCtx, gameId: Id<"games">, startedAt: number) {
  const game = await ctx.db.get(gameId);
  if (!game || game.status === "lobby" || game.status === "ended") return null;
  if (game.startedAt !== startedAt) return null;
  return game;
}

export const beginHunting = internalMutation({
  args: { gameId: v.id("games"), startedAt: v.number() },
  handler: async (ctx, { gameId, startedAt }) => {
    const game = await liveGame(ctx, gameId, startedAt);
    if (!game || game.status !== "headStart") return;
    await ctx.db.patch(gameId, { status: "hunting" });
    const players = (await gamePlayers(ctx, gameId)).filter((p) => p.status === "active");
    await notify(ctx, players, "Av başladı!", "Avcılar yola çıktı.", { type: "hunting", gameId });
  },
});

export const firePing = internalMutation({
  args: { gameId: v.id("games"), startedAt: v.number() },
  handler: async (ctx, { gameId, startedAt }) => {
    let game = await liveGame(ctx, gameId, startedAt);
    if (!game) return;
    const now = Date.now();
    const s = game.settings;
    const phase = engine.phaseAt(startedAt, s, now);
    if (phase === "over") return; // endRound handles it
    if (game.status === "headStart" && phase === "hunting") {
      await ctx.db.patch(gameId, { status: "hunting" });
    }

    const players = await gamePlayers(ctx, gameId);
    const positions = await latestPositions(ctx, gameId);
    const runners = players.filter((p) => p.team === "runner" && p.status === "active");
    const hunters = players.filter((p) => p.team === "hunter" && p.status === "active");

    const snapshot = runners.flatMap((p) => {
      const pos = positions.get(p._id);
      return pos ? [{ playerId: p._id, lat: pos.lat, lng: pos.lng }] : [];
    });
    await ctx.db.insert("pings", { gameId, at: now, runners: snapshot });

    await notify(ctx, runners, "Ping!", "Ping! Konumun avcılara gönderildi", { type: "ping", gameId });
    await notify(ctx, hunters, "Ping!", "Ping! Kaçakların konumu geldi", { type: "ping", gameId });

    game = (await ctx.db.get(gameId))!;
    if (await maybeFinish(ctx, game, now)) return;

    const next = engine.nextPingAt(startedAt, s, now);
    if (next !== null) {
      await ctx.scheduler.runAt(next, internal.games.firePing, { gameId, startedAt });
    }
  },
});

export const endRound = internalMutation({
  args: { gameId: v.id("games"), startedAt: v.number(), winner: v.optional(winnerV) },
  handler: async (ctx, { gameId, startedAt, winner }) => {
    const game = await liveGame(ctx, gameId, startedAt);
    if (!game) return;
    const now = Date.now();
    const players = await gamePlayers(ctx, gameId);
    const decided = winner ?? engine.checkWinner(playerStates(players), "over") ?? "runners";
    await finishGame(ctx, game, decided, now);
  },
});

const CLEANUP_BATCH = 500;

/** Hourly cron: deletes expired games and everything attached, in bounded batches. */
export const cleanupExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("games")
      .withIndex("by_expiresAt", (q) => q.lt("expiresAt", now))
      .take(10);
    let budget = CLEANUP_BATCH;
    for (const game of expired) {
      const gameId = game._id;
      const tables = [
        ctx.db.query("positionHistory").withIndex("by_game", (q) => q.eq("gameId", gameId)),
        ctx.db.query("positions").withIndex("by_game", (q) => q.eq("gameId", gameId)),
        ctx.db.query("pings").withIndex("by_game_at", (q) => q.eq("gameId", gameId)),
        ctx.db.query("messages").withIndex("by_game", (q) => q.eq("gameId", gameId)),
        ctx.db.query("players").withIndex("by_game", (q) => q.eq("gameId", gameId)),
      ];
      let remaining = false;
      for (const q of tables) {
        if (budget <= 0) {
          remaining = true;
          break;
        }
        const rows = await q.take(budget + 1);
        for (const row of rows.slice(0, budget)) await ctx.db.delete(row._id);
        if (rows.length > budget) remaining = true;
        budget -= Math.min(rows.length, budget);
      }
      if (remaining) {
        await ctx.scheduler.runAfter(0, internal.games.cleanupExpired, {});
        return;
      }
      await ctx.db.delete(gameId);
    }
    if (expired.length === 10) {
      await ctx.scheduler.runAfter(0, internal.games.cleanupExpired, {});
    }
  },
});

// --- queries -----------------------------------------------------------------

export const byId = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const { userId, game, player } = await requirePlayer(ctx, gameId);
    const now = Date.now();
    const s = game.settings;
    const players = (await gamePlayers(ctx, gameId)).filter((p) => p.status !== "left");
    const started = game.startedAt !== undefined && game.status !== "lobby";
    const count = (team: engine.Team, status?: Doc<"players">["status"]) =>
      players.filter((p) => p.team === team && (status === undefined || p.status === status)).length;

    return {
      game: {
        _id: game._id,
        code: game.code,
        hostId: game.hostId,
        status: game.status,
        settings: s,
        startedAt: game.startedAt,
        endedAt: game.endedAt,
        winner: game.winner,
        expiresAt: game.expiresAt,
      },
      phase: gamePhase(game, now),
      serverNow: now,
      headStartEndsAt: started ? engine.headStartEndAt(game.startedAt!, s) : null,
      roundEndsAt: started ? engine.roundEndAt(game.startedAt!, s) : null,
      nextPingAt:
        started && game.status !== "ended" ? engine.nextPingAt(game.startedAt!, s, now) : null,
      runners: {
        active: count("runner", "active"),
        tagged: count("runner", "tagged"),
        total: count("runner"),
      },
      hunters: count("hunter", "active"),
      playerCount: players.length,
      me: {
        playerId: player._id,
        team: player.team ?? null,
        status: player.status,
        isHost: game.hostId === userId,
        taggedAt: player.taggedAt ?? null,
        outOfZoneSince: player.outOfZoneSince ?? null,
      },
    };
  },
});

export const lobby = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const { userId, game } = await requirePlayer(ctx, gameId);
    const players = (await gamePlayers(ctx, gameId))
      .filter((p) => p.status !== "left")
      .sort((a, b) => a._creationTime - b._creationTime);

    // Validate the current prefs the same way start() will.
    const teams = engine.assignTeams(players.map((p) => ({ playerId: p._id, pref: p.pref })));
    const canStart =
      "error" in teams
        ? ({ ok: false, reason: teams.error as string } as const)
        : engine.canStart(players.map((p) => ({ team: (teams as Record<string, engine.Team>)[p._id] })));

    return {
      gameId,
      code: game.code,
      status: game.status,
      settings: game.settings,
      hostId: game.hostId,
      isHost: game.hostId === userId,
      players: players.map((p) => ({
        playerId: p._id,
        userId: p.userId,
        name: p.name,
        pref: p.pref,
        ready: p.ready,
        team: p.team ?? null,
        isHost: p.userId === game.hostId,
        isMe: p.userId === userId,
      })),
      canStart,
      allReady: players.every((p) => p.ready || p.userId === game.hostId),
      hunterRange: engine.hunterRange(players.length),
    };
  },
});

export const myGames = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const memberships = await ctx.db
      .query("players")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
    const out = [];
    for (const p of memberships) {
      if (p.status === "left") continue;
      const game = await ctx.db.get(p.gameId);
      if (!game) continue;
      out.push({
        gameId: game._id,
        code: game.code,
        status: game.status,
        isHost: game.hostId === userId,
        team: p.team ?? null,
        myStatus: p.status,
        startedAt: game.startedAt ?? null,
        endedAt: game.endedAt ?? null,
        winner: game.winner ?? null,
        createdAt: game._creationTime,
      });
    }
    return out;
  },
});
