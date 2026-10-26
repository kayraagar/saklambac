import { describe, expect, it } from "vitest";
import {
  deriveResults,
  scoreGame,
  weekEndsAtTR,
  weekKeyTR,
  type ResultGame,
  type ResultPlayer,
  type ScoreInput,
} from "../points";

const MIN = 60_000;
const base: ScoreInput = {
  startTeam: "runner",
  endTeam: "runner",
  outcome: "loss",
  tagsMade: 0,
  survivedMs: 0,
  survivedToEnd: false,
  ranked: true,
};

describe("scoreGame", () => {
  it("runner caught at minute 20 whose team won → 120", () => {
    const r = scoreGame({ ...base, outcome: "win", survivedMs: 20 * MIN });
    expect(r.points).toBe(120);
    expect(r.runnerPoints).toBe(120);
    expect(r.hunterPoints).toBe(0);
    expect(r.breakdown.map((l) => [l.key, l.points])).toEqual([
      ["played", 10],
      ["win", 50],
      ["survival", 60],
    ]);
    expect(r.breakdown[2].label).toBe("Hayatta kalma (20 dk)");
  });

  it("hunter whose team caught 3 and lost → 70", () => {
    const r = scoreGame({ ...base, startTeam: "hunter", endTeam: "hunter", tagsMade: 3 });
    expect(r.points).toBe(70);
    expect(r.hunterPoints).toBe(70);
    expect(r.runnerPoints).toBe(0);
    expect(r.breakdown.find((l) => l.key === "tags")?.label).toBe("Takım yakalaması ×3");
  });

  it("runner who survived 45 minutes and won → 225", () => {
    const r = scoreGame({ ...base, outcome: "win", survivedMs: 45 * MIN, survivedToEnd: true });
    expect(r.points).toBe(225);
    expect(r.runnerPoints).toBe(225);
  });

  it("only full minutes count", () => {
    expect(scoreGame({ ...base, survivedMs: 2 * MIN - 1 }).points).toBe(10 + 3);
    expect(scoreGame({ ...base, survivedMs: 59_999 }).breakdown.map((l) => l.key)).toEqual(["played"]);
  });

  it("converted runner: played goes to the runner bucket, the win to the hunter bucket", () => {
    const r = scoreGame({ ...base, endTeam: "hunter", outcome: "win", tagsMade: 1, survivedMs: 10 * MIN });
    expect(r.points).toBe(10 + 50 + 20 + 30);
    expect(r.runnerPoints).toBe(10 + 30);
    expect(r.hunterPoints).toBe(50 + 20);
  });

  it("unranked: totals 0, breakdown kept for display", () => {
    const r = scoreGame({ ...base, outcome: "win", survivedMs: 10 * MIN, ranked: false });
    expect(r).toMatchObject({ points: 0, hunterPoints: 0, runnerPoints: 0 });
    expect(r.breakdown.length).toBe(3);
  });

  it("never negative", () => {
    const r = scoreGame({ ...base, tagsMade: -2, survivedMs: -5 * MIN });
    expect(r.points).toBe(10);
  });
});

describe("deriveResults", () => {
  const T0 = 1_790_000_000_000;
  const game: ResultGame = {
    startedAt: T0,
    endedAt: T0 + 3 * MIN + 45 * MIN,
    winner: "runners",
    settings: { headStartMs: 3 * MIN, roundMs: 45 * MIN },
  };
  const hunt = T0 + 3 * MIN;

  it("derives teams, tags, survival and outcome per player", () => {
    const players: ResultPlayer[] = [
      { id: "h1", team: "hunter", status: "active" },
      { id: "r1", team: "runner", status: "tagged", taggedAt: hunt + 20 * MIN },
      { id: "r2", team: "runner", status: "active" },
      { id: "r3", team: "hunter", status: "active", taggedAt: hunt + 10 * MIN }, // converted
      { id: "x", team: "runner", status: "left" },
    ];
    const out = Object.fromEntries(deriveResults(game, players).map((r) => [r.playerId, r]));
    expect(Object.keys(out).sort()).toEqual(["h1", "r1", "r2", "r3"]);

    expect(out.h1).toMatchObject({ startTeam: "hunter", outcome: "loss", tagsMade: 2, survivedMs: 0, ranked: true, playerCount: 4 });
    expect(out.h1.points).toBe(10 + 40);

    expect(out.r1).toMatchObject({ startTeam: "runner", endTeam: "runner", outcome: "win", survivedMs: 20 * MIN, survivedToEnd: false });
    expect(out.r1.points).toBe(120);

    expect(out.r2).toMatchObject({ survivedMs: 45 * MIN, survivedToEnd: true });
    expect(out.r2.points).toBe(225);

    // Converted at minute 10: credited with the minute-20 catch only; lost as a hunter.
    expect(out.r3).toMatchObject({ startTeam: "runner", endTeam: "hunter", outcome: "loss", tagsMade: 1, survivedMs: 10 * MIN });
    expect(out.r3.points).toBe(10 + 20 + 30);
    expect(out.r3.durationMs).toBe(48 * MIN);
  });

  it("unranked under 3 finishers or under 5 minutes of hunting", () => {
    const two: ResultPlayer[] = [
      { id: "h", team: "hunter", status: "active" },
      { id: "r", team: "runner", status: "active" },
      { id: "l", team: "runner", status: "left" },
    ];
    expect(deriveResults(game, two).every((r) => !r.ranked && r.points === 0)).toBe(true);

    const three: ResultPlayer[] = [...two.slice(0, 2), { id: "r2", team: "runner", status: "active" }];
    const short = { ...game, endedAt: hunt + 5 * MIN - 1 };
    expect(deriveResults(short, three).every((r) => !r.ranked)).toBe(true);
    expect(deriveResults({ ...game, endedAt: hunt + 5 * MIN }, three).every((r) => r.ranked)).toBe(true);
  });

  it("caps survival at roundMs and floors at 0", () => {
    const p: ResultPlayer[] = [
      { id: "h", team: "hunter", status: "active" },
      { id: "a", team: "runner", status: "active" },
      { id: "b", team: "runner", status: "active" },
    ];
    const late = deriveResults({ ...game, endedAt: game.endedAt + 10 * MIN }, p);
    expect(late.find((r) => r.playerId === "a")!.survivedMs).toBe(45 * MIN);
  });
});

describe("weekKeyTR / weekEndsAtTR", () => {
  const tr = (iso: string) => Date.parse(iso + "+03:00");

  it("Monday 00:00 TR starts a new ISO week", () => {
    expect(weekKeyTR(tr("2026-10-26T00:00:00"))).toBe("2026-W44");
    expect(weekKeyTR(tr("2026-10-25T23:59:59"))).toBe("2026-W43");
    // 21:30 UTC Sunday is already Monday in Turkey.
    expect(weekKeyTR(Date.parse("2026-10-25T21:30:00Z"))).toBe("2026-W44");
  });

  it("handles ISO year boundaries", () => {
    expect(weekKeyTR(tr("2026-01-01T12:00:00"))).toBe("2026-W01"); // Thursday
    expect(weekKeyTR(tr("2027-01-01T12:00:00"))).toBe("2026-W53"); // Friday
    expect(weekKeyTR(tr("2024-12-30T08:00:00"))).toBe("2025-W01"); // Monday
    expect(weekKeyTR(tr("2021-01-03T08:00:00"))).toBe("2020-W53"); // Sunday
  });

  it("week ends at the next Monday 00:00 TR", () => {
    const end = tr("2026-11-02T00:00:00");
    expect(weekEndsAtTR(tr("2026-10-26T00:00:00"))).toBe(end);
    expect(weekEndsAtTR(tr("2026-10-29T15:00:00"))).toBe(end);
    expect(weekEndsAtTR(end - 1)).toBe(end);
    expect(weekEndsAtTR(end)).toBe(tr("2026-11-09T00:00:00"));
    expect(weekKeyTR(end - 1)).not.toBe(weekKeyTR(end));
  });
});
