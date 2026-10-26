import { useQuery } from "convex/react";
import { router } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { api } from "../../../convex/_generated/api";
import { AppText } from "@/components/text";
import { Colors, Radius, Spacing, teamColor } from "@/constants/theme";
import { gameRoute, phaseForStatus } from "@/lib/routes";
import { statusLabel, type MyGame } from "./game-row";

/** "Resume" card for a game that has not ended. Left border in my team colour. */
export function ActiveGameCard({ game }: { game: MyGame }) {
  const info = useQuery(api.games.byId, { gameId: game.gameId });
  const accent = game.team ? teamColor(game.team) : Colors.text;

  const role =
    game.status === "lobby"
      ? game.isHost
        ? "Oyuncuları bekliyorsun"
        : "Kurucunun başlatmasını bekliyorsun"
      : game.myStatus === "tagged"
        ? "Yakalandın · izliyorsun"
        : game.team === "hunter"
          ? "Avcısın"
          : game.team === "runner"
            ? "Kaçaksın"
            : "Oyundasın";
  const counts =
    info && game.status !== "lobby"
      ? ` · ${info.runners.active}/${info.runners.total} kaçak serbest`
      : info && game.status === "lobby"
        ? ` · ${info.playerCount} oyuncu`
        : "";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${statusLabel[game.status]}, oyun ${game.code}. Devam et`}
      onPress={() => router.push(gameRoute(game.gameId, phaseForStatus(game.status)))}
    >
      {({ pressed }) => (
        <View style={[styles.card, { borderLeftColor: accent }, pressed && styles.pressed]}>
          <View style={styles.top}>
            <PulseDot color={game.status === "lobby" ? Colors.textMuted : Colors.danger} />
            <AppText style={styles.status}>{statusLabel[game.status]}</AppText>
            <AppText variant="mono" style={styles.code}>
              {game.code}
            </AppText>
          </View>
          <AppText variant="caption" color={Colors.text}>
            <AppText variant="caption" color={accent} style={styles.role}>
              {role}
            </AppText>
            {counts}
          </AppText>
          <AppText style={styles.cta} color={accent}>
            Devam et ›
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

function PulseDot({ color }: { color: string }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.out(Easing.quad) }), -1, false);
  }, [reduce, t]);
  const ring = useAnimatedStyle(() => ({
    opacity: 0.6 * (1 - t.value),
    transform: [{ scale: 1 + t.value * 1.6 }],
  }));
  return (
    <View style={styles.dotWrap}>
      {reduce ? null : <Animated.View style={[styles.dot, styles.ring, { backgroundColor: color }, ring]} />}
      <View style={[styles.dot, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  pressed: { opacity: 0.75 },
  top: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  status: { flex: 1, fontWeight: "800" },
  code: { fontSize: 16, letterSpacing: 3, color: Colors.textMuted },
  role: { fontWeight: "800" },
  cta: { alignSelf: "flex-end", fontWeight: "800", marginTop: Spacing.xs },
  dotWrap: { width: 10, height: 10, alignItems: "center", justifyContent: "center" },
  dot: { width: 10, height: 10, borderRadius: 5 },
  ring: { position: "absolute" },
});
