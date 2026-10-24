import { describe, expect, it } from "vitest";
import {
  defaultSettings,
  GAME_CODE_ALPHABET,
  GAME_CODE_LENGTH,
  generateGameCode,
  SETTING_LIMITS,
  validateSettings,
  type GameSettings,
} from "../index";

const center = { lat: 41, lng: 29 };
const seq = (values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe("generateGameCode", () => {
  it("has the right length and alphabet", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateGameCode();
      expect(code).toHaveLength(GAME_CODE_LENGTH);
      for (const ch of code) expect(GAME_CODE_ALPHABET).toContain(ch);
    }
  });
  it("is deterministic for a given rand", () => {
    expect(generateGameCode(() => 0)).toBe(GAME_CODE_ALPHABET[0].repeat(GAME_CODE_LENGTH));
    expect(generateGameCode(() => 0.999999)).toBe(GAME_CODE_ALPHABET.at(-1)!.repeat(GAME_CODE_LENGTH));
  });
  it("tolerates rand() === 1", () => {
    expect(generateGameCode(() => 1)).toBe(GAME_CODE_ALPHABET.at(-1)!.repeat(GAME_CODE_LENGTH));
  });
  it("uses rand per character", () => {
    expect(generateGameCode(seq([0, 1 / GAME_CODE_ALPHABET.length]))).toBe("ABABAB");
  });
  it("never contains look-alikes", () => {
    for (let i = 0; i < 100; i++) expect(generateGameCode()).not.toMatch(/[01OIL]/);
  });
});

describe("defaultSettings / validateSettings", () => {
  it("defaults are valid and centred", () => {
    const s = defaultSettings(center);
    expect(validateSettings(s)).toEqual({ ok: true });
    expect(s.zone.center).toEqual(center);
    expect(s.zone.radiusM * 2).toBe(SETTING_LIMITS.zoneDiameterM.default);
    expect(s.roundMs).toBe(SETTING_LIMITS.roundMs.default);
    expect(s.pingIntervalMs).toBe(SETTING_LIMITS.pingIntervalMs.default);
    expect(s.headStartMs).toBe(SETTING_LIMITS.headStartMs.default);
  });

  const withS = (patch: Partial<GameSettings>) => ({ ...defaultSettings(center), ...patch });
  const ok = (s: GameSettings) => validateSettings(s).ok;
  const L = SETTING_LIMITS;

  it("accepts every limit boundary", () => {
    expect(ok(withS({ zone: { center, radiusM: L.zoneDiameterM.min / 2 } }))).toBe(true);
    expect(ok(withS({ zone: { center, radiusM: L.zoneDiameterM.max / 2 } }))).toBe(true);
    expect(ok(withS({ roundMs: L.roundMs.min }))).toBe(true);
    expect(ok(withS({ roundMs: L.roundMs.max }))).toBe(true);
    expect(ok(withS({ pingIntervalMs: L.pingIntervalMs.min }))).toBe(true);
    expect(ok(withS({ roundMs: L.roundMs.max, pingIntervalMs: L.pingIntervalMs.max }))).toBe(true);
    expect(ok(withS({ headStartMs: 0 }))).toBe(true);
    expect(ok(withS({ headStartMs: L.headStartMs.max }))).toBe(true);
  });
  it("rejects values just outside the limits", () => {
    expect(ok(withS({ zone: { center, radiusM: L.zoneDiameterM.min / 2 - 0.5 } }))).toBe(false);
    expect(ok(withS({ zone: { center, radiusM: L.zoneDiameterM.max / 2 + 0.5 } }))).toBe(false);
    expect(ok(withS({ roundMs: L.roundMs.min - 1 }))).toBe(false);
    expect(ok(withS({ roundMs: L.roundMs.max + 1 }))).toBe(false);
    expect(ok(withS({ pingIntervalMs: L.pingIntervalMs.min - 1 }))).toBe(false);
    expect(ok(withS({ pingIntervalMs: L.pingIntervalMs.max + 1 }))).toBe(false);
    expect(ok(withS({ headStartMs: -1 }))).toBe(false);
    expect(ok(withS({ headStartMs: L.headStartMs.max + 1 }))).toBe(false);
  });
  it("rejects NaN / non-finite numbers and bad centres", () => {
    expect(ok(withS({ roundMs: NaN }))).toBe(false);
    expect(ok(withS({ headStartMs: Infinity }))).toBe(false);
    expect(ok(withS({ zone: { center: { lat: 91, lng: 0 }, radiusM: 400 } }))).toBe(false);
    expect(ok(withS({ zone: { center: { lat: 0, lng: -181 }, radiusM: 400 } }))).toBe(false);
  });
  it("rejects a ping interval not shorter than the round", () => {
    expect(ok(withS({ roundMs: 10 * 60_000, pingIntervalMs: 10 * 60_000 }))).toBe(false);
    expect(ok(withS({ roundMs: 10 * 60_000, pingIntervalMs: 9 * 60_000 }))).toBe(true);
  });
  it("collects multiple errors", () => {
    const r = validateSettings(withS({ roundMs: 0, headStartMs: -5 }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBeGreaterThanOrEqual(2);
  });
});
