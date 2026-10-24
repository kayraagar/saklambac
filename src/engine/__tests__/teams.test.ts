import { describe, expect, it } from "vitest";
import { assignTeams, canStart, hunterRange, MIN_PLAYERS, type RolePreference, type Team } from "../index";

const prefsOf = (...ps: RolePreference[]) => ps.map((pref, i) => ({ playerId: `p${i}`, pref }));
const count = (r: Record<string, Team>, t: Team) => Object.values(r).filter((x) => x === t).length;
const teamsOf = (h: number, r: number, free = 0) => [
  ...Array.from({ length: h }, () => ({ team: "hunter" as Team })),
  ...Array.from({ length: r }, () => ({ team: "runner" as Team })),
  ...Array.from({ length: free }, () => ({})),
];

describe("hunterRange", () => {
  it.each([
    [2, 1, 1],
    [3, 1, 1],
    [4, 1, 2],
    [5, 1, 2],
    [6, 1, 3],
    [7, 1, 3],
    [10, 1, 5],
    [11, 1, 5],
  ])("%i players → %i..%i", (n, min, max) => {
    expect(hunterRange(n)).toEqual({ min, max });
  });
  it("is empty (min > max) when no split is possible", () => {
    const r0 = hunterRange(0);
    const r1 = hunterRange(1);
    expect(r0.min).toBeGreaterThan(r0.max);
    expect(r1.min).toBeGreaterThan(r1.max);
  });
  it("never allows 0 hunters or 0 runners", () => {
    for (let n = 2; n <= 50; n++) {
      const { min, max } = hunterRange(n);
      expect(min).toBeGreaterThanOrEqual(1);
      expect(n - max).toBeGreaterThanOrEqual(1);
      expect(max).toBeLessThanOrEqual(Math.floor(n / 2));
    }
  });
});

describe("assignTeams", () => {
  it("errors below MIN_PLAYERS", () => {
    expect(assignTeams(prefsOf("random", "random"))).toHaveProperty("error");
    expect(assignTeams([])).toHaveProperty("error");
  });

  it("honours explicit prefs and assigns everyone exactly once", () => {
    const r = assignTeams(prefsOf("hunter", "runner", "runner", "random", "random", "random"), () => 0.3);
    expect("error" in r).toBe(false);
    const t = r as Record<string, Team>;
    expect(Object.keys(t).sort()).toEqual(["p0", "p1", "p2", "p3", "p4", "p5"]);
    expect(t.p0).toBe("hunter");
    expect(t.p1).toBe("runner");
    expect(t.p2).toBe("runner");
    const { min, max } = hunterRange(6);
    expect(count(t, "hunter")).toBeGreaterThanOrEqual(min);
    expect(count(t, "hunter")).toBeLessThanOrEqual(max);
  });

  it("all-random lands in range for every n and many seeds", () => {
    for (let n = MIN_PLAYERS; n <= 20; n++) {
      for (let seed = 0; seed < 10; seed++) {
        let x = seed / 10 + 0.01;
        const rand = () => (x = (x * 9301 + 0.49297) % 1);
        const r = assignTeams(prefsOf(...Array<RolePreference>(n).fill("random")), rand);
        expect("error" in r).toBe(false);
        const h = count(r as Record<string, Team>, "hunter");
        const { min, max } = hunterRange(n);
        expect(h).toBeGreaterThanOrEqual(min);
        expect(h).toBeLessThanOrEqual(max);
      }
    }
  });

  it("all runners + one random → the random becomes the hunter", () => {
    const r = assignTeams(prefsOf("runner", "runner", "runner", "random")) as Record<string, Team>;
    expect(r.p3).toBe("hunter");
    expect(count(r, "hunter")).toBe(1);
  });

  it("hunters at the max + randoms → randoms become runners", () => {
    const r = assignTeams(prefsOf("hunter", "hunter", "hunter", "random", "random", "random")) as Record<string, Team>;
    expect(count(r, "hunter")).toBe(3);
    expect([r.p3, r.p4, r.p5]).toEqual(["runner", "runner", "runner"]);
  });

  it("exactly max explicit hunters is allowed", () => {
    const r = assignTeams(prefsOf("hunter", "hunter", "runner", "runner"));
    expect("error" in r).toBe(false);
  });

  it("errors when explicit hunters exceed the max", () => {
    const r = assignTeams(prefsOf("hunter", "hunter", "random"));
    expect(r).toHaveProperty("error");
    expect((r as { error: string }).error.length).toBeGreaterThan(0);
    expect(assignTeams(prefsOf("hunter", "hunter", "hunter", "hunter", "runner", "runner", "runner"))).toHaveProperty("error");
  });

  it("errors when everybody wants to run", () => {
    expect(assignTeams(prefsOf("runner", "runner", "runner"))).toHaveProperty("error");
  });

  it("errors when everybody wants to hunt", () => {
    expect(assignTeams(prefsOf("hunter", "hunter", "hunter"))).toHaveProperty("error");
  });

  it("is deterministic for a given rand and uses it to pick hunters", () => {
    const prefs = prefsOf("random", "random", "random", "random", "random", "random");
    const a = assignTeams(prefs, () => 0);
    const b = assignTeams(prefs, () => 0);
    expect(a).toEqual(b);
    const c = assignTeams(prefs, () => 0.999);
    expect(a).not.toEqual(c);
  });

  it("does not mutate the input", () => {
    const prefs = prefsOf("random", "hunter", "random", "runner");
    const copy = JSON.parse(JSON.stringify(prefs));
    assignTeams(prefs);
    expect(prefs).toEqual(copy);
  });
});

describe("canStart", () => {
  it("needs MIN_PLAYERS", () => {
    expect(canStart(teamsOf(1, 1)).ok).toBe(false);
    expect(canStart([]).ok).toBe(false);
    expect(canStart(teamsOf(1, 2))).toEqual({ ok: true });
  });
  it("rejects zero hunters", () => {
    const r = canStart(teamsOf(0, 4));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBeTruthy();
  });
  it("rejects too many hunters (more than half)", () => {
    expect(canStart(teamsOf(2, 1)).ok).toBe(false);
    expect(canStart(teamsOf(4, 2)).ok).toBe(false);
    expect(canStart(teamsOf(3, 3))).toEqual({ ok: true });
  });
  it("treats unassigned players as flexible (lobby use)", () => {
    expect(canStart(teamsOf(0, 0, 3))).toEqual({ ok: true });
    expect(canStart(teamsOf(0, 3, 1))).toEqual({ ok: true });
    expect(canStart(teamsOf(3, 0, 1)).ok).toBe(false); // 4 players → max 2 hunters
  });
  it("agrees with assignTeams feasibility", () => {
    const prefs: RolePreference[] = ["hunter", "runner", "random"];
    const all: RolePreference[][] = [];
    const rec = (acc: RolePreference[], n: number) => {
      if (acc.length === n) return void all.push(acc);
      for (const p of prefs) rec([...acc, p], n);
    };
    for (let n = 3; n <= 6; n++) rec([], n);
    for (const combo of all) {
      const players = combo.map((p) => (p === "random" ? {} : { team: p }));
      const assigned = assignTeams(prefsOf(...combo));
      expect(canStart(players).ok).toBe(!("error" in assigned));
    }
  });
});
