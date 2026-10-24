import type { Region } from "react-native-maps";

import type { LatLng } from "@/engine";

/** Fallback when we have no position yet: Istanbul. */
export const DEFAULT_CENTER: LatLng = { lat: 41.0082, lng: 28.9784 };

const M_PER_DEG_LAT = 111_320;

/** A region that shows a circle of `radiusM` around `center` with some margin. */
export function regionFor(center: LatLng, radiusM: number, margin = 1.35): Region {
  const latDelta = ((radiusM * 2) / M_PER_DEG_LAT) * margin;
  const lngDelta = latDelta / Math.max(0.2, Math.cos((center.lat * Math.PI) / 180));
  return { latitude: center.lat, longitude: center.lng, latitudeDelta: latDelta, longitudeDelta: lngDelta };
}

export const toCoord = (p: LatLng) => ({ latitude: p.lat, longitude: p.lng });

/** Dark style for Google Maps (Android). iOS uses userInterfaceStyle="dark". */
export const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#1b2029" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a93a3" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0e1116" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a313d" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0b1a26" }] },
];
