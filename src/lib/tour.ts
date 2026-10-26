// First-launch tour flag (SecureStore) with a tiny reactive store so the root
// layout guard flips as soon as the tour is completed.
import * as SecureStore from "expo-secure-store";
import { useSyncExternalStore } from "react";

const KEY = "saklambac.tourSeen.v1";

let seen: boolean | undefined;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function set(next: boolean) {
  seen = next;
  for (const l of listeners) l();
}

function load() {
  if (seen !== undefined || loading) return;
  loading = SecureStore.getItemAsync(KEY)
    .then((v) => set(v === "1"))
    // SecureStore unavailable (e.g. web): show the tour; completion is kept in memory.
    .catch(() => set(false))
    .finally(() => {
      loading = null;
    });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  load();
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => seen;

/** `undefined` while SecureStore loads, then whether the tour was completed on this install. */
export function useTourSeen(): boolean | undefined {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export async function markTourSeen(): Promise<void> {
  set(true);
  try {
    await SecureStore.setItemAsync(KEY, "1");
  } catch {
    // Kept in memory for this session.
  }
}

/** Dev only: show the tour again on the next guard evaluation. */
export async function resetTour(): Promise<void> {
  set(false);
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    // ignore
  }
}
