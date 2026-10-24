import { useEffect, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { Marker } from "react-native-maps";

import { Colors } from "@/constants/theme";
import type { LatLng } from "@/engine";
import { toCoord } from "@/lib/map";
import { AppText } from "./text";

/** Solid team-coloured dot with a name tag. `faded` for delayed positions. */
export function PlayerMarker({
  position,
  color,
  label,
  faded,
  isMe,
}: {
  position: LatLng;
  color: string;
  label: string;
  faded?: boolean;
  isMe?: boolean;
}) {
  return (
    <Marker coordinate={toCoord(position)} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false} zIndex={isMe ? 3 : 2}>
      <View style={[styles.wrap, faded && styles.faded]}>
        <View style={[styles.dot, { backgroundColor: color }, isMe && styles.me]} />
        <View style={styles.tag}>
          <AppText style={styles.tagText} numberOfLines={1}>
            {label}
          </AppText>
        </View>
      </View>
    </Marker>
  );
}

/** Ghost marker for a runner's last ping position, with a pulsing ring. */
export function PingMarker({ position, label }: { position: LatLng; label: string }) {
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1600, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.2] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] });

  return (
    <Marker coordinate={toCoord(position)} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges zIndex={1}>
      <View style={styles.wrap}>
        <View style={styles.pingBox}>
          <Animated.View style={[styles.ring, { opacity, transform: [{ scale }] }]} />
          <View style={styles.ghost} />
        </View>
        <View style={styles.tag}>
          <AppText style={styles.tagText} numberOfLines={1}>
            {label}
          </AppText>
        </View>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  faded: { opacity: 0.45 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 3, borderColor: Colors.background },
  me: { width: 22, height: 22, borderRadius: 11, borderColor: Colors.text },
  tag: {
    marginTop: 2,
    backgroundColor: Colors.overlay,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    maxWidth: 140,
  },
  tagText: { fontSize: 11, fontWeight: "700" },
  pingBox: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  ring: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: Colors.runner,
  },
  ghost: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(61, 214, 245, 0.35)",
    borderWidth: 2,
    borderColor: Colors.runner,
    borderStyle: "dashed",
  },
});
