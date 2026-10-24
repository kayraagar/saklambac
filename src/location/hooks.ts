import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import { AppState, Linking } from "react-native";

export type LocationPermissionStatus = "granted" | "denied" | "undetermined" | "foregroundOnly";

async function readStatus(): Promise<LocationPermissionStatus> {
  const fg = await Location.getForegroundPermissionsAsync();
  if (fg.status !== "granted") return fg.status === "denied" ? "denied" : "undetermined";
  const bg = await Location.getBackgroundPermissionsAsync();
  return bg.status === "granted" ? "granted" : "foregroundOnly";
}

/** Re-checks whenever the app returns to the foreground (e.g. back from Settings). */
export function useLocationPermission(): {
  status: LocationPermissionStatus;
  request: () => Promise<void>;
} {
  const [status, setStatus] = useState<LocationPermissionStatus>("undetermined");

  const refresh = useCallback(
    () =>
      readStatus().then(setStatus, (e) => {
        console.warn("[location] permission check failed", e);
      }),
    [],
  );

  useEffect(() => {
    let active = true;
    const check = () =>
      readStatus().then(
        (s) => {
          if (active) setStatus(s);
        },
        (e) => console.warn("[location] permission check failed", e),
      );
    void check();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void check();
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  const request = useCallback(async () => {
    try {
      const fg = await Location.requestForegroundPermissionsAsync();
      if (fg.status !== "granted") {
        if (!fg.canAskAgain) await Linking.openSettings();
        return;
      }
      const bg = await Location.requestBackgroundPermissionsAsync();
      // iOS: if the system won't prompt again, send the user to Settings.
      if (bg.status !== "granted" && !bg.canAskAgain) await Linking.openSettings();
    } catch (e) {
      console.warn("[location] permission request failed", e);
    } finally {
      await refresh();
    }
  }, [refresh]);

  return { status, request };
}

/** Live foreground position while mounted; null until the first fix or without permission. */
export function useMyPosition(): { lat: number; lng: number } | null {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [appActive, setAppActive] = useState(AppState.currentState === "active");

  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => setAppActive(s === "active"));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!appActive) return;
    let cancelled = false;
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (cancelled || perm.status !== "granted") return;
        const s = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 3000 },
          (loc) => setPos({ lat: loc.coords.latitude, lng: loc.coords.longitude }),
        );
        if (cancelled) s.remove();
        else sub = s;
      } catch (e) {
        console.warn("[location] watchPosition failed", e);
      }
    })();
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [appActive]);

  return pos;
}
