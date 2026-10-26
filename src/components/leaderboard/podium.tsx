import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import type { LeaderboardRow } from "../../../convex/stats";
import { Colors, Radius, Spacing } from "@/constants/theme";
import { Avatar } from "../characters";
import { AppText } from "../text";
import { formatValue } from "./leaderboard-row";

const STEP_HEIGHT = [0, 64, 44, 32]; // by podium place

function Crown({ color }: { color: string }) {
  return (
    <Svg width={30} height={20} viewBox="0 0 30 20">
      <Path
        d="M3 17 L1 5 L9 10 L15 2 L21 10 L29 5 L27 17 Z"
        fill={color}
        stroke={Colors.background}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function Spot({
  row,
  place,
  unit,
  accent,
}: {
  row: LeaderboardRow | undefined;
  place: 1 | 2 | 3;
  unit: string;
  accent: string;
}) {
  const first = place === 1;
  const size = first ? 72 : 56;
  return (
    <View
      style={styles.spot}
      accessible={!!row}
      accessibilityLabel={row ? `${row.rank}. sıra, ${row.name}, ${formatValue(row.value)} ${unit}` : undefined}
    >
      {row ? (
        <>
          <View style={styles.crown}>{first ? <Crown color={accent === Colors.text ? Colors.hunter : accent} /> : null}</View>
          <View style={[styles.avatarWrap, row.isMe && { borderColor: accent }]}>
            <Avatar name={row.name} uri={row.avatarUrl} size={size} team={first && accent !== Colors.text ? (accent === Colors.hunter ? "hunter" : "runner") : null} />
          </View>
          <AppText numberOfLines={1} style={styles.name}>
            {row.isMe ? "Sen" : row.name}
          </AppText>
          <AppText variant="mono" color={first ? accent : Colors.text} style={first ? styles.valueFirst : null}>
            {formatValue(row.value)}
          </AppText>
          <AppText variant="caption">{unit}</AppText>
        </>
      ) : (
        <View style={{ height: size + 70 }} />
      )}
      <View style={[styles.step, { height: STEP_HEIGHT[place] }, first && { backgroundColor: Colors.border }]}>
        <AppText variant="label" color={first ? Colors.text : Colors.textMuted}>
          {row ? row.rank : place}
        </AppText>
      </View>
    </View>
  );
}

/** Top three: #2 · #1 (larger, crowned) · #3. */
export function Podium({ rows, unit, accent }: { rows: LeaderboardRow[]; unit: string; accent: string }) {
  return (
    <View style={styles.root}>
      <Spot row={rows[1]} place={2} unit={unit} accent={accent} />
      <Spot row={rows[0]} place={1} unit={unit} accent={accent} />
      <Spot row={rows[2]} place={3} unit={unit} accent={accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  spot: { flex: 1, alignItems: "center", gap: 2 },
  crown: { height: 22, justifyContent: "flex-end" },
  avatarWrap: { borderRadius: 999, borderWidth: 2, borderColor: "transparent", padding: 2, marginBottom: 4 },
  name: { fontWeight: "700", maxWidth: "100%" },
  valueFirst: { fontSize: 20 },
  step: {
    alignSelf: "stretch",
    marginTop: Spacing.sm,
    borderTopLeftRadius: Radius.sm,
    borderTopRightRadius: Radius.sm,
    backgroundColor: Colors.surfaceRaised,
    alignItems: "center",
    paddingTop: Spacing.xs,
  },
});
