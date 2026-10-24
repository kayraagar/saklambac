import {
  GAME_CODE_ALPHABET,
  GAME_CODE_LENGTH,
  SETTING_LIMITS,
  type GameSettings,
  type LatLng,
} from "./types";

/** Random index in [0, length) that tolerates rand() returning exactly 1. */
export function randIndex(length: number, rand: () => number): number {
  const i = Math.floor(rand() * length);
  return Math.min(length - 1, Math.max(0, i));
}

export function generateGameCode(rand: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < GAME_CODE_LENGTH; i++) {
    code += GAME_CODE_ALPHABET[randIndex(GAME_CODE_ALPHABET.length, rand)];
  }
  return code;
}

export function defaultSettings(center: LatLng): GameSettings {
  return {
    zone: { center: { lat: center.lat, lng: center.lng }, radiusM: SETTING_LIMITS.zoneDiameterM.default / 2 },
    roundMs: SETTING_LIMITS.roundMs.default,
    pingIntervalMs: SETTING_LIMITS.pingIntervalMs.default,
    headStartMs: SETTING_LIMITS.headStartMs.default,
    taggedJoinHunters: false,
    taggedSeeLive: false,
  };
}

const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const minutes = (ms: number) => `${ms / 60_000} dk`;

export function validateSettings(
  s: GameSettings,
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const L = SETTING_LIMITS;

  const c = s?.zone?.center;
  if (!c || !isNum(c.lat) || !isNum(c.lng) || c.lat < -90 || c.lat > 90 || c.lng < -180 || c.lng > 180) {
    errors.push("Bölge merkezi geçerli bir konum olmalı.");
  }
  const r = s?.zone?.radiusM;
  if (!isNum(r) || r * 2 < L.zoneDiameterM.min || r * 2 > L.zoneDiameterM.max) {
    errors.push(`Bölge çapı ${L.zoneDiameterM.min} m ile ${L.zoneDiameterM.max} m arasında olmalı.`);
  }
  if (!isNum(s?.roundMs) || s.roundMs < L.roundMs.min || s.roundMs > L.roundMs.max) {
    errors.push(`Tur süresi ${minutes(L.roundMs.min)} ile ${minutes(L.roundMs.max)} arasında olmalı.`);
  }
  if (!isNum(s?.pingIntervalMs) || s.pingIntervalMs < L.pingIntervalMs.min || s.pingIntervalMs > L.pingIntervalMs.max) {
    errors.push(`Ping aralığı ${minutes(L.pingIntervalMs.min)} ile ${minutes(L.pingIntervalMs.max)} arasında olmalı.`);
  }
  if (!isNum(s?.headStartMs) || s.headStartMs < L.headStartMs.min || s.headStartMs > L.headStartMs.max) {
    errors.push(`Kaçış süresi ${minutes(L.headStartMs.min)} ile ${minutes(L.headStartMs.max)} arasında olmalı.`);
  }
  if (isNum(s?.pingIntervalMs) && isNum(s?.roundMs) && s.pingIntervalMs >= s.roundMs) {
    errors.push("Ping aralığı tur süresinden kısa olmalı (yoksa hiç ping olmaz).");
  }
  if (typeof s?.taggedJoinHunters !== "boolean") errors.push("taggedJoinHunters true/false olmalı.");
  if (typeof s?.taggedSeeLive !== "boolean") errors.push("taggedSeeLive true/false olmalı.");

  return errors.length ? { ok: false, errors } : { ok: true };
}
