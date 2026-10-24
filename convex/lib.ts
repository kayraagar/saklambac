// Shared server helpers: auth/membership checks and DB → engine mapping.
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import * as engine from "../src/engine";
import type { PlayerState } from "../src/engine";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type Ctx = QueryCtx | MutationCtx;

export function fail(message: string): never {
  throw new ConvexError(message);
}

export async function requireUser(ctx: Ctx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) fail("Giriş yapman gerekiyor.");
  return userId;
}

export async function getGame(ctx: Ctx, gameId: Id<"games">): Promise<Doc<"games">> {
  const game = await ctx.db.get(gameId);
  if (!game) fail("Oyun bulunamadı.");
  return game;
}

export async function findPlayer(
  ctx: Ctx,
  gameId: Id<"games">,
  userId: Id<"users">,
): Promise<Doc<"players"> | null> {
  return await ctx.db
    .query("players")
    .withIndex("by_game_user", (q) => q.eq("gameId", gameId).eq("userId", userId))
    .unique();
}

/** Caller must be signed in and a (not-left) player of the game. */
export async function requirePlayer(ctx: Ctx, gameId: Id<"games">) {
  const userId = await requireUser(ctx);
  const game = await getGame(ctx, gameId);
  const player = await findPlayer(ctx, gameId, userId);
  if (!player || player.status === "left") fail("Bu oyunun oyuncusu değilsin.");
  return { userId, game, player };
}

export async function requireHost(ctx: Ctx, gameId: Id<"games">) {
  const r = await requirePlayer(ctx, gameId);
  if (r.game.hostId !== r.userId) fail("Bunu sadece oyunu kuran kişi yapabilir.");
  return r;
}

export async function gamePlayers(ctx: Ctx, gameId: Id<"games">): Promise<Doc<"players">[]> {
  return await ctx.db
    .query("players")
    .withIndex("by_game", (q) => q.eq("gameId", gameId))
    .collect();
}

export async function latestPositions(
  ctx: Ctx,
  gameId: Id<"games">,
): Promise<Map<Id<"players">, Doc<"positions">>> {
  const rows = await ctx.db
    .query("positions")
    .withIndex("by_game", (q) => q.eq("gameId", gameId))
    .collect();
  return new Map(rows.map((r) => [r.playerId, r]));
}

/** Engine view of a player. Players without a team (lobby) are not mappable. */
export function toPlayerState(
  p: Doc<"players">,
  pos?: Pick<Doc<"positions">, "lat" | "lng" | "at"> | null,
): PlayerState | null {
  if (!p.team) return null;
  return {
    id: p._id,
    name: p.name,
    team: p.team,
    status: p.status,
    position: pos ? { lat: pos.lat, lng: pos.lng, at: pos.at } : undefined,
    outOfZoneSince: p.outOfZoneSince,
  };
}

export function playerStates(
  players: Doc<"players">[],
  positions?: Map<Id<"players">, Doc<"positions">>,
): PlayerState[] {
  const out: PlayerState[] = [];
  for (const p of players) {
    const s = toPlayerState(p, positions?.get(p._id));
    if (s) out.push(s);
  }
  return out;
}

/** Engine phase for a game, or "lobby". Ended games are always "over". */
export function gamePhase(
  game: Doc<"games">,
  now: number,
): "lobby" | "headStart" | "hunting" | "over" {
  if (game.status === "lobby" || game.startedAt === undefined) return "lobby";
  if (game.status === "ended") return "over";
  return engine.phaseAt(game.startedAt, game.settings, now);
}

export async function displayName(ctx: Ctx, userId: Id<"users">): Promise<string> {
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (profile) return profile.name;
  const user = await ctx.db.get(userId);
  const email = user?.email;
  return email ? email.split("@")[0] : "Oyuncu";
}

// --- profanity masking -------------------------------------------------------

/** Masked when a word starts with one of these. */
const PROFANE_STEMS = [
  "orospu", "siktir", "sikeyim", "sikerim", "sikik", "sikiş", "yarrak", "yarak",
  "amına", "amina", "amcık", "amcik", "pezevenk", "kahpe", "yavşak", "yavsak",
  "şerefsiz", "serefsiz", "gavat", "kaltak", "puşt", "pust", "ananı", "anani",
  "fuck", "motherfuck", "shit", "bitch", "cunt", "asshole", "bastard", "whore",
  "slut", "dickhead",
];
/** Masked only as whole words (too short / ambiguous as stems). */
const PROFANE_WORDS = ["amk", "aq", "mk", "oç", "sik", "göt", "piç", "ibne", "dick", "cock", "fck"];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const PROFANITY_RE = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:(?:${PROFANE_STEMS.map(escape).join("|")})[\\p{L}\\p{N}]*|(?:${PROFANE_WORDS.map(escape).join("|")})(?![\\p{L}\\p{N}]))`,
  "giu",
);

export function maskProfanity(text: string): string {
  return text.replace(PROFANITY_RE, (m) => "*".repeat([...m].length));
}
