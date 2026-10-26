import type { FunctionReturnType } from "convex/server";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { api } from "../../../convex/_generated/api";
import { Avatar } from "@/components/characters";
import { AppText } from "@/components/text";
import { Colors, Radius, Spacing } from "@/constants/theme";

type LeaderboardResult = FunctionReturnType<typeof api.stats.leaderboard>;
export type LeaderboardRow = LeaderboardResult["rows"][number];

const medal = [Colors.hunter, Colors.text, Colors.textMuted];

/** Top few rows of a board (home page). `undefined` → loading. */
export function MiniLeaderboard({
  rows,
  unit,
  color = Colors.text,
  team,
  emptyText,
}: {
  rows: LeaderboardRow[] | undefined;
  unit: string;
  color?: string;
  team?: "hunter" | "runner";
  emptyText: string;
}) {
  return (
    <View style={styles.card}>
      {rows === undefined ? (
        <ActivityIndicator color={Colors.textMuted} style={styles.pad} />
      ) : rows.length === 0 ? (
        <AppText variant="caption" style={[styles.pad, styles.center]}>
          {emptyText}
        </AppText>
      ) : (
        rows.map((r, i) => (
          <View
            key={r.userId}
            style={[styles.row, i > 0 && styles.divider, r.isMe && styles.me]}
            accessible
            accessibilityLabel={`${r.rank}. ${r.name}${r.isMe ? " (sen)" : ""}, ${r.value} ${unit}`}
          >
            <AppText style={styles.rank} color={medal[r.rank - 1] ?? Colors.textMuted}>
              {r.rank}
            </AppText>
            <Avatar name={r.name} uri={r.avatarUrl} team={team ?? null} size={32} />
            <View style={styles.flex}>
              <AppText style={styles.name} numberOfLines={1}>
                {r.name}
                {r.isMe ? <AppText variant="caption"> (sen)</AppText> : null}
              </AppText>
              <AppText variant="caption" numberOfLines={1}>
                @{r.username}
              </AppText>
            </View>
            <AppText style={styles.value} color={color}>
              {r.value.toLocaleString("tr-TR")}
            </AppText>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  pad: { padding: Spacing.lg },
  center: { textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.md, paddingHorizontal: Spacing.md, minHeight: 60 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  me: { backgroundColor: "rgba(200, 241, 53, 0.08)" },
  rank: { width: 20, fontSize: 18, fontWeight: "800", textAlign: "center", fontVariant: ["tabular-nums"] },
  flex: { flex: 1 },
  name: { fontWeight: "700" },
  value: { fontSize: 18, fontWeight: "800", fontVariant: ["tabular-nums"] },
});
