import { describe, expect, it } from "vitest";
import { distanceM, isInZone, EARTH_RADIUS_M } from "../index";

const center = { lat: 41.0082, lng: 28.9784 }; // Istanbul
const mPerDegLat = (Math.PI / 180) * EARTH_RADIUS_M;

describe("distanceM", () => {
  it("is 0 for the same point", () => {
    expect(distanceM(center, center)).toBe(0);
  });
  it("is symmetric", () => {
    const b = { lat: 41.02, lng: 29.0 };
    expect(distanceM(center, b)).toBeCloseTo(distanceM(b, center), 9);
  });
  it("matches one degree of latitude (~111.2 km)", () => {
    expect(distanceM({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(mPerDegLat, 3);
  });
  it("matches a known city distance (Istanbul–Ankara ≈ 350 km)", () => {
    const d = distanceM(center, { lat: 39.9334, lng: 32.8597 });
    expect(d).toBeGreaterThan(345_000);
    expect(d).toBeLessThan(355_000);
  });
  it("handles antipodal points without NaN", () => {
    const d = distanceM({ lat: 0, lng: 0 }, { lat: 0, lng: 180 });
    expect(d).toBeCloseTo(Math.PI * EARTH_RADIUS_M, 0);
  });
});

describe("isInZone", () => {
  const zone = { center, radiusM: 400 };
  const north = (m: number) => ({ lat: center.lat + m / mPerDegLat, lng: center.lng });
  it("centre is inside", () => expect(isInZone(center, zone)).toBe(true));
  it("just inside the edge", () => expect(isInZone(north(399.9), zone)).toBe(true));
  it("exactly on the edge counts as inside", () => {
    const edge = north(400);
    const exactZone = { center, radiusM: distanceM(edge, center) };
    expect(isInZone(edge, exactZone)).toBe(true);
  });
  it("just outside the edge", () => expect(isInZone(north(400.1), zone)).toBe(false));
  it("far away is outside", () => expect(isInZone({ lat: 0, lng: 0 }, zone)).toBe(false));
});
