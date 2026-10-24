import * as SecureStore from "expo-secure-store";

import type { Id } from "../../convex/_generated/dataModel";
import { SECURE_STORE_OPTIONS } from "./authToken";

export const LOCATION_TASK_NAME = "saklambac-background-location";
const ACTIVE_GAME_KEY = "saklambac.activeGameId";

// In-memory copy: lets the task keep working in the same JS runtime even if a
// keychain read fails (e.g. device locked before first unlock).
let cached: Id<"games"> | null | undefined;

export async function getActiveGameId(): Promise<Id<"games"> | null> {
  if (cached !== undefined) return cached;
  try {
    const value = await SecureStore.getItemAsync(ACTIVE_GAME_KEY, SECURE_STORE_OPTIONS);
    cached = (value as Id<"games"> | null) ?? null;
    return cached;
  } catch (e) {
    console.warn("[location] could not read active game", e);
    return null;
  }
}

export async function setActiveGameId(gameId: Id<"games">): Promise<void> {
  cached = gameId;
  await SecureStore.setItemAsync(ACTIVE_GAME_KEY, gameId, SECURE_STORE_OPTIONS);
}

export async function clearActiveGameId(): Promise<void> {
  cached = null;
  try {
    await SecureStore.deleteItemAsync(ACTIVE_GAME_KEY, SECURE_STORE_OPTIONS);
  } catch (e) {
    console.warn("[location] could not clear active game", e);
  }
}
