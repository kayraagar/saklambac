import { describe, expect, it } from "vitest";
import { defaultSettings, nextPingAt, phaseAt, type GameSettings } from "../index";

const MIN = 60_000;
const T0 = 1_700_000_000_000;
const s: GameSettings = {
  ...defaultSettings({ lat: 41, lng: 29 }),
  headStartMs: 3 * MIN,
  roundMs: 20 * MIN,
  pingIntervalMs: 5 * MIN,
};
const hsEnd = T0 + 3 * MIN;
const end = hsEnd + 20 * MIN;

describe("phaseAt", () => {
  it("headStart from start up to (not incl.) head-start end", () => {
    expect(phaseAt(T0, s, T0)).toBe("headStart");
    expect(phaseAt(T0, s, hsEnd - 1)).toBe("headStart");
  });
  it("hunting from head-start end up to (not incl.) round end", () => {
    expect(phaseAt(T0, s, hsEnd)).toBe("hunting");
    expect(phaseAt(T0, s, end - 1)).toBe("hunting");
  });
  it("over at and after round end", () => {
    expect(phaseAt(T0, s, end)).toBe("over");
    expect(phaseAt(T0, s, end + 10 * MIN)).toBe("over");
  });
  it("zero head start → hunting immediately", () => {
    const z = { ...s, headStartMs: 0 };
    expect(phaseAt(T0, z, T0)).toBe("hunting");
    expect(phaseAt(T0, z, T0 + 20 * MIN)).toBe("over");
  });
  it("before startedAt (clock skew) counts as headStart", () => {
    expect(phaseAt(T0, s, T0 - 1000)).toBe("headStart");
  });
});

describe("nextPingAt", () => {
  it("first ping is one interval after head-start end", () => {
    expect(nextPingAt(T0, s, T0)).toBe(hsEnd + 5 * MIN);
    expect(nextPingAt(T0, s, T0 - 5000)).toBe(hsEnd + 5 * MIN);
    expect(nextPingAt(T0, s, hsEnd)).toBe(hsEnd + 5 * MIN); // no ping at k = 0
  });
  it("is strictly after now", () => {
    expect(nextPingAt(T0, s, hsEnd + 5 * MIN - 1)).toBe(hsEnd + 5 * MIN);
    expect(nextPingAt(T0, s, hsEnd + 5 * MIN)).toBe(hsEnd + 10 * MIN);
    expect(nextPingAt(T0, s, hsEnd + 12 * MIN)).toBe(hsEnd + 15 * MIN);
  });
  it("no ping at the round end itself", () => {
    // pings at +5, +10, +15; +20 equals the round end → none
    expect(nextPingAt(T0, s, hsEnd + 15 * MIN)).toBeNull();
    expect(nextPingAt(T0, s, end - 1)).toBeNull();
  });
  it("null after the round", () => {
    expect(nextPingAt(T0, s, end)).toBeNull();
    expect(nextPingAt(T0, s, end + MIN)).toBeNull();
  });
  it("last ping just before the end is still emitted", () => {
    const t = { ...s, roundMs: 21 * MIN }; // pings at +5..+20, +20 < +21
    expect(nextPingAt(T0, t, hsEnd + 15 * MIN)).toBe(hsEnd + 20 * MIN);
  });
  it("interval longer than the round → never pings", () => {
    const t = { ...s, roundMs: 10 * MIN, pingIntervalMs: 30 * MIN };
    expect(nextPingAt(T0, t, T0)).toBeNull();
  });
  it("works with zero head start", () => {
    const z = { ...s, headStartMs: 0 };
    expect(nextPingAt(T0, z, T0)).toBe(T0 + 5 * MIN);
  });
});
