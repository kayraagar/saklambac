import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Linking } from "react-native";

import type { LatLng } from "@/engine";

export type MapLocationStatus = "checking" | "undetermined" | "granted" | "denied";

/**
 * Foreground-only location for map screens (zone picker). Asks for "while using" permission once on mount
 * if the user hasn't decided yet — never background permission, never jumps to Settings on its own.
 *
 * `position` starts with the last known fix (fast, may be a bit stale), then switches to live GPS fixes
 * (`precise: true`). Without permission it still tries the last known position.
 */
export function useMapLocation(): {
  status: MapLocationStatus;
  position: LatLng | null;
  precise: boolean;
  request: () => Promise<void>;
  openSettings: () => void;
} {
  const [status, setStatus] = useState<MapLocationStatus>("checking");
  const [position, setPosition] = useState<LatLng | null>(null);
  const [precise, setPrecise] = useState(false);
  const preciseRef = useRef(false);
  const asked = useRef(false);

  // Check (and ask once) on mount; re-check when coming back from Settings.
  useEffect(() => {
    let active = true;
    const check = async (): Promise<MapLocationStatus> => {
      const perm = await Location.getForegroundPermissionsAsync();
      if (perm.status === "granted") return "granted";
      if (perm.status === "undetermined" && perm.canAskAgain && !asked.current) {
        asked.current = true;
        if (active) setStatus("undetermined");
        const res = await Location.requestForegroundPermissionsAsync();
        return res.status === "granted" ? "granted" : res.status === "denied" ? "denied" : "undetermined";
      }
      return perm.status === "undetermined" && perm.canAskAgain ? "undetermined" : "denied";
    };
    const run = () =>
      check().then(
        (s) => {
          if (active) setStatus(s);
        },
        (e) => {
          console.warn("[map-location] permission check failed", e);
          if (active) setStatus("denied");
        },
      );
    void run();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void run();
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  // Fallback / fast first fix: last known position (works only if the OS lets us read it).
  useEffect(() => {
    if (status === "checking") return;
    let cancelled = false;
    Location.getLastKnownPositionAsync({ maxAge: 10 * 60_000 })
      .then((loc) => {
        if (cancelled || !loc || preciseRef.current) return;
        setPosition({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [status]);

  // Live fixes while permission is granted.
  useEffect(() => {
    if (status !== "granted") return;
    let cancelled = false;
    let sub: Location.LocationSubscription | null = null;
    Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 3000 }, (loc) => {
      preciseRef.current = true;
      setPrecise(true);
      setPosition({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    })
      .then((s) => {
        if (cancelled) s.remove();
        else sub = s;
      })
      .catch((e) => console.warn("[map-location] watchPosition failed", e));
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [status]);

  const request = useCallback(async () => {
    try {
      const res = await Location.requestForegroundPermissionsAsync();
      if (res.status === "granted") return setStatus("granted");
      setStatus("denied");
      if (!res.canAskAgain) await Linking.openSettings();
    } catch (e) {
      console.warn("[map-location] permission request failed", e);
    }
  }, []);

  const openSettings = useCallback(() => {
    Linking.openSettings().catch(() => {});
  }, []);

  return { status, position, precise, request, openSettings };
}
