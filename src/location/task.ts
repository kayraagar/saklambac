/**
 * Side-effect module: defines the background location task.
 * Must be evaluated at JS bundle start (before/independent of any React tree),
 * so the OS can deliver updates after a headless relaunch. Import it once from
 * the app entry / root layout:  `import "@/location/task";`
 */
import type { LocationObject } from "expo-location";
import * as TaskManager from "expo-task-manager";

import { api } from "../../convex/_generated/api";
import { getActiveGameId, LOCATION_TASK_NAME } from "./activeGame";
import { authedHttpClient } from "./authToken";
import { stopGameTracking } from "./tracking";

type LocationTaskData = { locations?: LocationObject[] };

let lastSentAt = 0;
let inFlight = false;

async function handleLocations(locations: LocationObject[]): Promise<void> {
  if (locations.length === 0) return;
  // Batch: only the newest fix matters.
  const newest = locations.reduce((a, b) => (b.timestamp > a.timestamp ? b : a));
  if (newest.timestamp <= lastSentAt || inFlight) return;

  const gameId = await getActiveGameId();
  if (!gameId) {
    // Tracking outlived its game (e.g. storage cleared): stop.
    await stopGameTracking();
    return;
  }

  const client = await authedHttpClient();
  if (!client) return; // signed out / token expired and not refreshable: skip quietly.

  inFlight = true;
  try {
    const res = await client.mutation(api.locations.report, {
      gameId,
      lat: newest.coords.latitude,
      lng: newest.coords.longitude,
      at: newest.timestamp,
    });
    lastSentAt = newest.timestamp;
    if (!res.accepted) await stopGameTracking();
  } catch (e) {
    // Network errors, auth errors, ConvexError (e.g. not a player any more).
    console.warn("[location] report failed", e);
  } finally {
    inFlight = false;
  }
}

if (!TaskManager.isTaskDefined(LOCATION_TASK_NAME)) {
  TaskManager.defineTask<LocationTaskData>(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
      console.warn("[location] task error", error.message);
      return;
    }
    try {
      await handleLocations(data?.locations ?? []);
    } catch (e) {
      console.warn("[location] task failed", e);
    }
  });
}
