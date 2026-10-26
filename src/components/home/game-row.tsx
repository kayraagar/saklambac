import type { FunctionReturnType } from "convex/server";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { api } from "../../../convex/_generated/api";
import { Card } from "@/components/card";
import { AppText } from "@/components/text";
import { Colors, Spacing, teamColor, teamLabel } from "@/constants/theme";
import { formatClock } from "@/lib/format";
import { gameRoute, phaseForStatus } from "@/lib/routes";

export type MyGame = FunctionReturnType<typeof api.games.myGames>[number];

export const statusLabel: Record<MyGame["status"], string> = {
  lobby: "Lobide",
  headStart: "Kaçış süresi",
  hunting: "Av sürüyor",
  ended: "Bitti",
};

export function winnerLabel(winner: MyGame["winner"]): string {
  return winner === "hunters" ? "Avcılar kazandı" : winner === "runners" ? "Kaçaklar kazandı" : "Bitti";
}

/** One game in a list (code, status, my team). Tapping opens the screen for its phase. */
export function GameRow({ game }: { game: MyGame }) {
  const sub = game.status === "ended" ? winnerLabel(game.winner) : statusLabel[game.status];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Oyun ${game.code}, ${sub}`}
      onPress={() => router.push(gameRoute(game.gameId, phaseForStatus(game.status)))}
    >
      {({ pressed }) => (
        <Card style={[styles.row, pressed && styles.pressed]}>
          <View style={[styles.dot, { backgroundColor: teamColor(game.team) }]} />
          <View style={styles.flex}>
            <AppText variant="mono" style={styles.code}>
              {game.code}
            </AppText>
            <AppText variant="caption">
              {sub} · {formatClock(game.startedAt ?? game.createdAt)}
              {game.isHost ? " · Kurucu" : ""}
            </AppText>
          </View>
          {game.team ? (
            <AppText style={styles.team} color={teamColor(game.team)}>
              {teamLabel(game.team)}
            </AppText>
          ) : null}
          <AppText color={Colors.textMuted}>›</AppText>
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  pressed: { opacity: 0.7 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  code: { fontSize: 18, letterSpacing: 3 },
  team: { fontWeight: "800" },
});
