import { describe, expect, it } from "vitest";
import {
  checkWinner,
  defaultSettings,
  isExposed,
  OUT_OF_ZONE_GRACE_MS,
  updateOutOfZone,
  visibility,
  type PlayerState,
  type PlayerStatus,
  type Team,
} from "../index";

const center = { lat: 41, lng: 29 };
const zone = { center, radiusM: 400 };
const NOW = 1_700_000_000_000;
const outside = { lat: 41.01, lng: 29, at: NOW }; // ~1.1 km north
const inside = { ...center, at: NOW };

let n = 0;
const P = (team: Team, status: PlayerStatus = "active", extra: Partial<PlayerState> = {}): PlayerState => ({
  id: `p${n++}`,
  name: "x",
  team,
  status,
  ...extra,
});
const exposedRunner = () => P("runner", "active", { outOfZoneSince: NOW - OUT_OF_ZONE_GRACE_MS - 1 });

const S = defaultSettings(center);
const live = { ...S, taggedSeeLive: true };
const delayed = { ...S, taggedSeeLive: false };

describe("updateOutOfZone", () => {
  it("inside → undefined (clears a running excursion)", () => {
    expect(updateOutOfZone(P("runner", "active", { position: inside }), zone, NOW)).toBeUndefined();
    expect(updateOutOfZone(P("runner", "active", { position: inside, outOfZoneSince: NOW - 5000 }), zone, NOW)).toBeUndefined();
  });
  it("first report outside → now", () => {
    expect(updateOutOfZone(P("runner", "active", { position: outside }), zone, NOW)).toBe(NOW);
  });
  it("still outside → keeps the excursion start", () => {
    expect(updateOutOfZone(P("runner", "active", { position: outside, outOfZoneSince: NOW - 9000 }), zone, NOW)).toBe(NOW - 9000);
  });
  it("no position → unchanged", () => {
    expect(updateOutOfZone(P("runner"), zone, NOW)).toBeUndefined();
    expect(updateOutOfZone(P("runner", "active", { outOfZoneSince: 5 }), zone, NOW)).toBe(5);
  });
});

describe("isExposed", () => {
  it("not exposed while inside", () => expect(isExposed(P("runner"), NOW)).toBe(false));
  it("not exposed before the grace", () => {
    expect(isExposed(P("runner", "active", { outOfZoneSince: NOW - 1000 }), NOW)).toBe(false);
  });
  it("not exposed at exactly 30 s", () => {
    expect(isExposed(P("runner", "active", { outOfZoneSince: NOW - OUT_OF_ZONE_GRACE_MS }), NOW)).toBe(false);
  });
  it("exposed 1 ms after the grace", () => {
    expect(isExposed(P("runner", "active", { outOfZoneSince: NOW - OUT_OF_ZONE_GRACE_MS - 1 }), NOW)).toBe(true);
  });
  it("hunters and non-active runners are never exposed", () => {
    const since = NOW - 10 * OUT_OF_ZONE_GRACE_MS;
    expect(isExposed(P("hunter", "active", { outOfZoneSince: since }), NOW)).toBe(false);
    expect(isExposed(P("runner", "tagged", { outOfZoneSince: since }), NOW)).toBe(false);
    expect(isExposed(P("runner", "left", { outOfZoneSince: since }), NOW)).toBe(false);
  });
});

describe("visibility", () => {
  it("self → live, whatever the status", () => {
    for (const st of ["active", "tagged", "left"] as PlayerStatus[]) {
      const p = P("runner", st);
      expect(visibility(p, p, S, NOW)).toBe("live");
    }
  });

  it("same team, both active → live", () => {
    expect(visibility(P("hunter"), P("hunter"), S, NOW)).toBe("live");
    expect(visibility(P("runner"), P("runner"), S, NOW)).toBe("live");
  });

  it("active hunter → active runner: pingOnly unless exposed", () => {
    expect(visibility(P("hunter"), P("runner"), S, NOW)).toBe("pingOnly");
    expect(visibility(P("hunter"), P("runner", "active", { outOfZoneSince: NOW - OUT_OF_ZONE_GRACE_MS }), S, NOW)).toBe("pingOnly");
    expect(visibility(P("hunter"), exposedRunner(), S, NOW)).toBe("live");
  });

  it("active runner → hunter: hidden", () => {
    expect(visibility(P("runner"), P("hunter"), S, NOW)).toBe("hidden");
    expect(visibility(exposedRunner(), P("hunter"), S, NOW)).toBe("hidden");
  });

  it("tagged viewer → live with taggedSeeLive, else delayed", () => {
    const viewer = P("runner", "tagged");
    for (const target of [P("hunter"), P("runner"), exposedRunner(), P("runner", "tagged")]) {
      expect(visibility(viewer, target, live, NOW)).toBe("live");
      expect(visibility(viewer, target, delayed, NOW)).toBe("delayed");
    }
  });

  it("tagged runner converted to hunter acts as an active hunter", () => {
    const converted = P("hunter", "active");
    expect(visibility(converted, P("runner"), live, NOW)).toBe("pingOnly");
    expect(visibility(converted, P("hunter"), live, NOW)).toBe("live");
    expect(visibility(P("runner"), converted, live, NOW)).toBe("hidden");
  });

  it("tagged target → hidden to active players", () => {
    const t = P("runner", "tagged");
    expect(visibility(P("hunter"), t, live, NOW)).toBe("hidden");
    expect(visibility(P("runner"), t, live, NOW)).toBe("hidden");
  });

  it("left target → hidden to everyone, spectators included", () => {
    const t = P("runner", "left");
    expect(visibility(P("hunter"), t, live, NOW)).toBe("hidden");
    expect(visibility(P("runner"), t, live, NOW)).toBe("hidden");
    expect(visibility(P("runner", "tagged"), t, live, NOW)).toBe("hidden");
  });

  it("viewer who left sees nobody else", () => {
    const v = P("hunter", "left");
    expect(visibility(v, P("hunter"), live, NOW)).toBe("hidden");
    expect(visibility(v, P("runner"), live, NOW)).toBe("hidden");
  });
});

describe("checkWinner", () => {
  it("headStart → null, even with no runners", () => {
    expect(checkWinner([P("hunter"), P("runner")], "headStart")).toBeNull();
    expect(checkWinner([P("hunter"), P("runner", "tagged")], "headStart")).toBeNull();
  });
  it("all runners tagged → hunters", () => {
    expect(checkWinner([P("hunter"), P("runner", "tagged"), P("runner", "tagged")], "hunting")).toBe("hunters");
    expect(checkWinner([P("hunter"), P("runner", "tagged")], "over")).toBe("hunters");
  });
  it("tagged runners converted to hunters → hunters", () => {
    expect(checkWinner([P("hunter"), P("hunter"), P("hunter")], "hunting")).toBe("hunters");
  });
  it("runners who left don't count as free", () => {
    expect(checkWinner([P("hunter"), P("runner", "tagged"), P("runner", "left")], "hunting")).toBe("hunters");
  });
  it("hunting with a free runner → null", () => {
    expect(checkWinner([P("hunter"), P("runner"), P("runner", "tagged")], "hunting")).toBeNull();
  });
  it("time over with a free runner → runners", () => {
    expect(checkWinner([P("hunter"), P("runner"), P("runner", "tagged")], "over")).toBe("runners");
  });
  it("all hunters left while runners remain → runners", () => {
    expect(checkWinner([P("hunter", "left"), P("runner"), P("runner")], "hunting")).toBe("runners");
  });
});
