import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/text";
import { Colors, Radius, Spacing } from "@/constants/theme";

/** A big number with a small label under it. */
export function StatTile({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText style={styles.value} color={color} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
      <AppText variant="caption" numberOfLines={1} style={styles.label}>
        {label}
      </AppText>
    </View>
  );
}

/** Row of equal-width tiles. */
export function StatRow({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: Spacing.sm },
  tile: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
    gap: 2,
  },
  value: { fontSize: 24, fontWeight: "800", fontVariant: ["tabular-nums"] },
  label: { fontSize: 12 },
});
