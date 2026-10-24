import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

import type { Id } from "../../convex/_generated/dataModel";
import { clearActiveGameId, LOCATION_TASK_NAME, setActiveGameId } from "./activeGame";

export type StartResult = { ok: true; foregroundOnly?: boolean; note?: string } | { ok: false; reason: string };

// Balanced accuracy is ~100 m on iOS (kCLLocationAccuracyHundredMeters) and
// may skip GPS on Android. Switch to Location.Accuracy.High if zone checks feel
// too coarse in field tests (costs battery).
const TRACKING_ACCURACY = Location.Accuracy.High; // zone checks need ~10 m, Balanced is ~100 m on iOS

export async function startGameTracking(gameId: Id<"games">): Promise<StartResult> {
  try {
    if (!(await Location.hasServicesEnabledAsync())) {
      return { ok: false, reason: "Konum servisleri kapalı. Oynamak için telefonun konum servisini aç." };
    }

    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== "granted") {
      return {
        ok: false,
        reason: fg.canAskAgain
          ? "Oyuna katılmak için konum izni vermelisin."
          : "Konum izni kapalı. Ayarlar'dan Saklambaç için konum iznini aç.",
      };
    }

    // Must be asked after foreground. Android 11+ opens system settings; iOS may
    // show the "Always" upgrade prompt later (provisional) or not at all.
    let foregroundOnly = false;
    try {
      const bg = await Location.requestBackgroundPermissionsAsync();
      foregroundOnly = bg.status !== "granted";
    } catch (e) {
      console.warn("[location] background permission request failed", e);
      foregroundOnly = true;
    }

    await setActiveGameId(gameId);

    if (await isTracking()) {
      // Restart so new options / a new game id take effect cleanly.
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: TRACKING_ACCURACY,
      distanceInterval: 10,
      timeInterval: 10_000, // Android only
      deferredUpdatesInterval: 0,
      deferredUpdatesDistance: 0,
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.Fitness,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "Saklambaç oyunu sürüyor",
        notificationBody: "Oyun bitene kadar konumun takımınla paylaşılıyor.",
        notificationColor: "#C8F135",
        killServiceOnDestroy: false,
      },
    });

    if (foregroundOnly) {
      return {
        ok: true,
        foregroundOnly: true,
        note:
          "Arka plan konum izni verilmedi. Uygulama açıkken konumun paylaşılır; " +
          "telefon cebindeyken de oynamak için Ayarlar'dan konum iznini \"Her Zaman\" yap.",
      };
    }
    return { ok: true };
  } catch (e) {
    console.warn("[location] startGameTracking failed", e);
    await clearActiveGameId();
    return { ok: false, reason: "Konum takibi başlatılamadı. Uygulamayı açık tutup tekrar dene." };
  }
}

async function isTracking(): Promise<boolean> {
  try {
    return (
      (await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME)) &&
      (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME))
    );
  } catch {
    return false;
  }
}

/** Idempotent: safe to call when nothing is running. */
export async function stopGameTracking(): Promise<void> {
  await clearActiveGameId();
  try {
    if (await isTracking()) await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  } catch (e) {
    console.warn("[location] stopGameTracking failed", e);
  }
}
