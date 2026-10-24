import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Circle, type Region } from "react-native-maps";

import { Colors } from "@/constants/theme";
import type { LatLng } from "@/engine";
import { DARK_MAP_STYLE, regionFor, toCoord } from "@/lib/map";

/**
 * Pan the map to place the zone: the zone center is always the map center,
 * with a live circle overlay. `recenterTo` (e.g. the user's first GPS fix)
 * moves the map once, unless the user has already panned.
 */
export function ZonePicker({
  center,
  radiusM,
  onCenterChange,
  recenterTo,
}: {
  center: LatLng;
  radiusM: number;
  onCenterChange: (c: LatLng) => void;
  recenterTo?: LatLng | null;
}) {
  const mapRef = useRef<MapView>(null);
  const [initialRegion] = useState(() => regionFor(center, radiusM));
  const touched = useRef(false);
  const recentered = useRef(false);

  useEffect(() => {
    if (!recenterTo || touched.current || recentered.current) return;
    recentered.current = true;
    mapRef.current?.animateToRegion(regionFor(recenterTo, radiusM), 400);
  }, [recenterTo, radiusM]);

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
        showsUserLocation
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
    </View>
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
});
