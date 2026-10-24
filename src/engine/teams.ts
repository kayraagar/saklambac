import { MIN_PLAYERS, type RolePreference, type Team } from "./types";
import { randIndex } from "./settings";

/**
 * Allowed hunter counts: at least 1 hunter, at least 1 runner, hunters at most
 * floor(n / 2). For n < 2 no split exists and min > max is returned.
 */
export function hunterRange(playerCount: number): { min: number; max: number } {
  const n = Math.max(0, Math.floor(playerCount));
  return { min: 1, max: Math.floor(n / 2) };
}

/** Preferred hunter count when "random" players give us a choice: about a third. */
function idealHunters(n: number): number {
  const { min, max } = hunterRange(n);
  return Math.min(max, Math.max(min, Math.round(n / 3)));
}

export function assignTeams(
  prefs: { playerId: string; pref: RolePreference }[],
  rand: () => number = Math.random,
): Record<string, Team> | { error: string } {
  const n = prefs.length;
  if (n < MIN_PLAYERS) {
    return { error: `En az ${MIN_PLAYERS} oyuncu gerekli (şu an ${n}).` };
  }
  const { min, max } = hunterRange(n);
  const hunters = prefs.filter((p) => p.pref === "hunter");
  const runners = prefs.filter((p) => p.pref === "runner");
  const randoms = prefs.filter((p) => p.pref !== "hunter" && p.pref !== "runner");

  if (hunters.length > max) {
    return { error: `En fazla ${max} avcı olabilir; ${hunters.length} kişi avcı seçti. Birkaç kişi kaçak ya da rastgele seçmeli.` };
  }
  if (hunters.length + randoms.length < min) {
    return { error: `En az ${min} avcı gerekli; herkes kaçak seçti. Biri avcı ya da rastgele seçmeli.` };
  }
  // Feasible hunter counts given the explicit prefs.
  const lo = Math.max(min, hunters.length);
  const hi = Math.min(max, hunters.length + randoms.length);
  if (lo > hi) {
    return { error: "Takımlar dengelenemiyor; tercihleri değiştirin." };
  }
  const target = Math.min(hi, Math.max(lo, idealHunters(n)));

  // Fisher–Yates shuffle of the random-pref players.
  const pool = randoms.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = randIndex(i + 1, rand);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const extraHunters = target - hunters.length;

  const result: Record<string, Team> = {};
  for (const p of hunters) result[p.playerId] = "hunter";
  for (const p of runners) result[p.playerId] = "runner";
  pool.forEach((p, i) => {
    result[p.playerId] = i < extraHunters ? "hunter" : "runner";
  });
  return result;
}

/**
 * Players without a team are treated as flexible ("random"), so this works both
 * in the lobby (before assignment) and after teams were assigned.
 */
export function canStart(players: { team?: Team }[]): { ok: true } | { ok: false; reason: string } {
  const n = players.length;
  if (n < MIN_PLAYERS) {
    return { ok: false, reason: `En az ${MIN_PLAYERS} oyuncu gerekli (şu an ${n}).` };
  }
  const { min, max } = hunterRange(n);
  const hunters = players.filter((p) => p.team === "hunter").length;
  const free = players.filter((p) => p.team !== "hunter" && p.team !== "runner").length;
  if (hunters > max) {
    return { ok: false, reason: `Çok fazla avcı: en fazla ${max} avcı olabilir (şu an ${hunters}).` };
  }
  if (hunters + free < min) {
    return { ok: false, reason: `En az ${min} avcı gerekli.` };
  }
  return { ok: true };
}
