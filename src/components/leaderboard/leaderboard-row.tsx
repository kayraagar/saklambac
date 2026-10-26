import { StyleSheet, View } from "react-native";

import type { LeaderboardRow } from "../../../convex/stats";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { Avatar } from "../characters";
import { AppText } from "../text";

/** Rank shown to the user; ranks past the 1000-row scan read "1000+". */
export function rankLabel(rank: number | null): string {
  if (rank === null || rank > 1000) return "1000+";
  return String(rank);
}

export const formatValue = (n: number) => n.toLocaleString("tr-TR");

export function LeaderboardRowView({
  row,
  unit,
  accent,
  pinned,
}: {
  row: LeaderboardRow;
  unit: string;
  accent: string;
  /** The sticky "me" bar under the list. */
  pinned?: boolean;
}) {
  const me = row.isMe;
  return (
    <View
      accessible
      accessibilityLabel={`${rankLabel(row.rank)}. sıra, ${row.name}${me ? " (sen)" : ""}, ${formatValue(row.value)} ${unit}`}
      style={[styles.row, me && styles.me, me && { borderColor: accent }, pinned && styles.pinned]}
    >
      <AppText variant="mono" style={styles.rank} color={me ? accent : Colors.textMuted} numberOfLines={1}>
        {pinned ? `#${rankLabel(row.rank)}` : rankLabel(row.rank)}
      </AppText>
      <Avatar name={row.name} size={36} />
      <View style={styles.who}>
        <AppText numberOfLines={1} style={styles.name}>
          {pinned ? "Sen" : row.name}
        </AppText>
        {row.username ? (
          <AppText variant="caption" numberOfLines={1}>
            @{row.username}
            {me && !pinned ? " (sen)" : ""}
          </AppText>
        ) : null}
      </View>
      <View style={styles.value}>
        <AppText variant="mono" color={me ? accent : Colors.text}>
          {formatValue(row.value)}
        </AppText>
        <AppText variant="caption">{unit}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm + 4,
    minHeight: 56,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  me: { backgroundColor: Colors.surfaceRaised },
  pinned: { backgroundColor: Colors.surface },
  rank: { width: 44, textAlign: "center", fontSize: 15 },
  who: { flex: 1, minWidth: 0 },
  name: { fontWeight: "700" },
  value: { alignItems: "flex-end" },
});
