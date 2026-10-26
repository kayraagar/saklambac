// Convex validators mirroring src/engine/types.ts.
import { v, type Infer } from "convex/values";
import type {
  GameSettings,
  GameStatus,
  PlayerStatus,
  RolePreference,
  Team,
  Winner,
} from "../src/engine/types";

export const teamV = v.union(v.literal("hunter"), v.literal("runner"));
export const rolePreferenceV = v.union(
  v.literal("hunter"),
  v.literal("runner"),
  v.literal("random"),
);
export const gameStatusV = v.union(
  v.literal("lobby"),
  v.literal("headStart"),
  v.literal("hunting"),
  v.literal("ended"),
);
export const playerStatusV = v.union(
  v.literal("active"),
  v.literal("tagged"),
  v.literal("left"),
);
export const winnerV = v.union(v.literal("hunters"), v.literal("runners"));
export const outcomeV = v.union(v.literal("win"), v.literal("loss"));

export const latLngV = v.object({ lat: v.number(), lng: v.number() });
export const zoneV = v.object({ center: latLngV, radiusM: v.number() });

export const gameSettingsV = v.object({
  zone: zoneV,
  roundMs: v.number(),
  pingIntervalMs: v.number(),
  headStartMs: v.number(),
  taggedJoinHunters: v.boolean(),
  taggedSeeLive: v.boolean(),
});

// Compile-time checks that the validators stay in sync with the shared types.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const assertTrue = <T extends true>() => undefined as unknown as T;
void assertTrue<Same<Infer<typeof teamV>, Team>>;
void assertTrue<Same<Infer<typeof rolePreferenceV>, RolePreference>>;
void assertTrue<Same<Infer<typeof gameStatusV>, GameStatus>>;
void assertTrue<Same<Infer<typeof playerStatusV>, PlayerStatus>>;
void assertTrue<Same<Infer<typeof winnerV>, Winner>>;
void assertTrue<Same<Infer<typeof gameSettingsV>, GameSettings>>;
