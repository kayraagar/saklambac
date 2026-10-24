import { StyleSheet, View } from "react-native";

import { Colors, Radius, Spacing } from "@/constants/theme";
import { AppText } from "./text";

export function Banner({ title, subtitle, color }: { title: string; subtitle?: string; color: string }) {
  return (
    <View style={[styles.banner, { borderColor: color }]} accessibilityRole="summary">
      <AppText style={styles.bannerTitle} color={color}>
        {title}
      </AppText>
      {subtitle ? <AppText style={styles.bannerSub}>{subtitle}</AppText> : null}
    </View>
  );
}

export function StatRow({ stats }: { stats: { label: string; value: string; color?: string }[] }) {
  return (
    <View style={styles.stats}>
      {stats.map((s) => (
        <View key={s.label} style={styles.stat}>
          <AppText variant="mono" style={styles.statValue} color={s.color}>
            {s.value}
          </AppText>
          <AppText style={styles.statLabel}>{s.label}</AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: Colors.overlay,
    borderRadius: Radius.md,
    borderWidth: 2,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 2,
  },
  bannerTitle: { fontSize: 20, fontWeight: "900" },
  bannerSub: { fontSize: 14, fontWeight: "600", color: Colors.text },
  stats: {
    flexDirection: "row",
    backgroundColor: Colors.overlay,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
  },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 18 },
  statLabel: { fontSize: 11, fontWeight: "700", color: Colors.textMuted, textTransform: "uppercase" },
});
