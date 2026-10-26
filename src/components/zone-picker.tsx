import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import MapView, { Circle, type Region } from "react-native-maps";

import { Colors, Radius, Spacing } from "@/constants/theme";
import type { LatLng } from "@/engine";
import { DARK_MAP_STYLE, regionFor, toCoord } from "@/lib/map";
import { AppText } from "./text";
import { useMapLocation } from "./use-map-location";

/**
 * Pan the map to place the zone: the zone center is always the map center,
 * with a live circle overlay. With `autoCenter`, the map (and so the zone) jumps to
 * the user's position when it first arrives — once, and never after the user has panned.
 */
export function ZonePicker({
  center,
  radiusM,
  onCenterChange,
  autoCenter = false,
}: {
  center: LatLng;
  radiusM: number;
  onCenterChange: (c: LatLng) => void;
  autoCenter?: boolean;
}) {
  const mapRef = useRef<MapView>(null);
  const [initialRegion] = useState(() => regionFor(center, radiusM));
  const touched = useRef(false);
  const centeredOn = useRef<"none" | "approx" | "precise">("none");
  const loc = useMapLocation();

  const goTo = (p: LatLng, ms = 400) => {
    mapRef.current?.animateToRegion(regionFor(p, radiusM), ms);
    onCenterChange(p);
  };

  // Auto-center: first on the last known fix, then once more on the first live GPS fix
  // (unless the user has started dragging in between).
  useEffect(() => {
    if (!autoCenter || !loc.position || touched.current) return;
    const level = loc.precise ? "precise" : "approx";
    if (centeredOn.current === "precise" || centeredOn.current === level) return;
    centeredOn.current = level;
    goTo(loc.position);
    // goTo is recreated each render; only position changes matter here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCenter, loc.position, loc.precise]);

  // Zoom to fit when the diameter changes.
  const lastRadius = useRef(radiusM);
  useEffect(() => {
    if (lastRadius.current === radiusM) return;
    lastRadius.current = radiusM;
    mapRef.current?.animateToRegion(regionFor(center, radiusM), 250);
    // Only react to radius changes; center comes from the map itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radiusM]);

  const onRegion = (r: Region, details?: { isGesture?: boolean }) => {
    if (details?.isGesture) touched.current = true;
    onCenterChange({ lat: r.latitude, lng: r.longitude });
  };

  const locateMe = () => {
    if (loc.position) return goTo(loc.position);
    if (loc.status === "denied") return loc.openSettings();
    void loc.request();
  };

  return (
    <View style={styles.wrap}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        onRegionChange={onRegion}
        onRegionChangeComplete={onRegion}
        onPanDrag={() => (touched.current = true)}
        userInterfaceStyle="dark"
        customMapStyle={DARK_MAP_STYLE}
        showsUserLocation={loc.status === "granted"}
        showsMyLocationButton={false}
        showsPointsOfInterests={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
      >
        <Circle
          center={toCoord(center)}
          radius={radiusM}
          strokeColor={Colors.hunter}
          strokeWidth={3}
          fillColor="rgba(200, 241, 53, 0.12)"
        />
      </MapView>
      <View pointerEvents="none" style={styles.crosshair}>
        <View style={styles.dot} />
      </View>

      {loc.status === "undetermined" ? (
        <View style={styles.banner} pointerEvents="box-none">
          <AppText variant="caption" style={styles.bannerText}>
            Oyun alanını bulunduğun yere yerleştirmek için konum iznine ihtiyacımız var.
          </AppText>
          <BannerButton title="İzin ver" onPress={() => void loc.request()} />
        </View>
      ) : loc.status === "denied" ? (
        <View style={styles.banner} pointerEvents="box-none">
          <AppText variant="caption" style={styles.bannerText}>
            Konum izni kapalı. Alanı elle yerleştirebilir ya da izin verebilirsin.
          </AppText>
          <BannerButton title="Ayarları aç" onPress={loc.openSettings} />
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Konumuma git"
        onPress={locateMe}
        style={({ pressed }) => [styles.locate, pressed && styles.pressed]}
      >
        <AppText style={styles.locateText} color={Colors.hunter}>
          ◎ Konumuma git
        </AppText>
      </Pressable>
    </View>
  );
}

function BannerButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.bannerButton, pressed && styles.pressed]}
    >
      <AppText style={styles.bannerButtonText} color={Colors.onAccent}>
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 300, overflow: "hidden", backgroundColor: Colors.surface },
  crosshair: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.hunter,
    borderWidth: 3,
    borderColor: Colors.background,
  },
  banner: {
    position: "absolute",
    top: Spacing.sm,
    left: Spacing.sm,
    right: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.overlay,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
  },
  bannerText: { flex: 1, color: Colors.text },
  bannerButton: {
    backgroundColor: Colors.hunter,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  bannerButtonText: { fontSize: 13, fontWeight: "800" },
  locate: {
    position: "absolute",
    right: Spacing.sm,
    bottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    minHeight: 40,
    justifyContent: "center",
  },
  locateText: { fontSize: 14, fontWeight: "800" },
  pressed: { opacity: 0.7 },
});
