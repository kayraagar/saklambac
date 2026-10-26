import { useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import type { Board, Window } from "../../../convex/stats";
import { Referee } from "@/components/characters";
import { LeaderboardRowView } from "@/components/leaderboard/leaderboard-row";
import { PointsSheet } from "@/components/leaderboard/points-sheet";
import { Podium } from "@/components/leaderboard/podium";
import { Segmented } from "@/components/segmented";
import { AppText } from "@/components/text";
import { Colors, Radius, Spacing } from "@/constants/theme";

const BOARDS: { value: Board; label: string; title: string; accent: string; unit: string }[] = [
  { value: "points", label: "Genel", title: "Genel sıralama", accent: Colors.text, unit: "puan" },
  { value: "hunter", label: "Avcılar", title: "En iyi avcılar", accent: Colors.hunter, unit: "puan" },
  { value: "runner", label: "Kaçaklar", title: "En iyi kaçaklar", accent: Colors.runner, unit: "puan" },
  { value: "games", label: "Oyun", title: "En çok oynayanlar", accent: Colors.text, unit: "oyun" },
];
const WINDOWS: { value: Window; label: string }[] = [
  { value: "week", label: "Bu hafta" },
  { value: "all", label: "Tüm zamanlar" },
];

const isBoard = (v: unknown): v is Board => BOARDS.some((b) => b.value === v);
const isWindow = (v: unknown): v is Window => v === "week" || v === "all";

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** "Sıfırlanmaya 3 gün 4 sa" / "Sıfırlanmaya 5 sa 12 dk". */
function resetCaption(ms: number): string {
  const min = Math.max(0, Math.floor(ms / 60_000));
  const days = Math.floor(min / 1440);
  const hours = Math.floor((min % 1440) / 60);
  const mins = min % 60;
  if (days > 0) return `Sıfırlanmaya ${days} gün ${hours} sa`;
  if (hours > 0) return `Sıfırlanmaya ${hours} sa ${mins} dk`;
  return `Sıfırlanmaya ${Math.max(1, mins)} dk`;
}

function Chip({
  label,
  selected,
  accent = Colors.text,
  disabled,
  onPress,
}: {
  label: string;
  selected?: boolean;
  accent?: string;
  disabled?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.chip,
        selected && { backgroundColor: accent, borderColor: accent },
        disabled && styles.chipDisabled,
      ]}
    >
      <AppText style={styles.chipLabel} color={selected ? Colors.onAccent : Colors.textMuted}>
        {label}
      </AppText>
    </Pressable>
  );
}

export default function LeaderboardScreen() {
  const params = useLocalSearchParams<{ board?: string; window?: string }>();
  const board: Board = isBoard(params.board) ? params.board : "points";
  const window: Window = isWindow(params.window) ? params.window : "week";
  const meta = BOARDS.find((b) => b.value === board)!;
  const [sheet, setSheet] = useState(false);
  const now = useNow(60_000);

  const result = useQuery(api.stats.leaderboard, { board, window, limit: 50 });
  const mine = useQuery(api.stats.mine, {});
  const current = result && result.board === board && result.window === window ? result : undefined;

  const rows = current?.rows ?? [];
  const meVisible = rows.some((r) => r.isMe);
  const hidden = mine !== undefined && !mine.listed;

  const empty = (
    <View style={styles.empty}>
      <Referee pose="trophy" size={140} />
      <AppText variant="heading" style={styles.center}>
        {window === "week" ? "Bu hafta henüz kimse puan almadı." : "Henüz kimse puan almadı."}
      </AppText>
      <AppText color={Colors.textMuted} style={styles.center}>
        Bir oyun kur, zirve senin olsun.
      </AppText>
    </View>
  );

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <AppText variant="title">Sıralama</AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Puanlar nasıl hesaplanır?"
            onPress={() => setSheet(true)}
            style={styles.help}
            hitSlop={6}
          >
            <AppText style={styles.helpLabel} color={Colors.text}>
              ?
            </AppText>
          </Pressable>
        </View>

        <Segmented options={WINDOWS} value={window} onChange={(w) => router.setParams({ window: w })} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {BOARDS.map((b) => (
            <Chip
              key={b.value}
              label={b.label}
              selected={b.value === board}
              accent={b.accent}
              onPress={() => router.setParams({ board: b.value })}
            />
          ))}
        </ScrollView>
        <View style={styles.chips}>
          <Chip label="Herkes" selected accent={Colors.textMuted} />
          <Chip label="Arkadaşlar · Yakında" disabled />
        </View>

        <View style={styles.captionRow}>
          <AppText variant="label" color={meta.accent === Colors.text ? Colors.textMuted : meta.accent}>
            {meta.title}
          </AppText>
          {window === "week" && current?.endsAt ? (
            <AppText variant="caption">{resetCaption(current.endsAt - now)}</AppText>
          ) : null}
        </View>
      </View>

      {current === undefined ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.textMuted} />
        </View>
      ) : (
        <FlatList
          data={rows.slice(3)}
          keyExtractor={(r) => r.userId}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            rows.length > 0 ? <Podium rows={rows.slice(0, 3)} unit={meta.unit} accent={meta.accent} /> : undefined
          }
          ListEmptyComponent={rows.length === 0 ? empty : undefined}
          renderItem={({ item }) => <LeaderboardRowView row={item} unit={meta.unit} accent={meta.accent} />}
        />
      )}

      {hidden ? (
        <View style={styles.meBar}>
          <AppText variant="caption" style={styles.center}>
            Sıralamada gizlisin · Profil&apos;den açabilirsin
          </AppText>
        </View>
      ) : current?.me && !meVisible ? (
        <View style={styles.meBar}>
          <LeaderboardRowView row={current.me} unit={meta.unit} accent={meta.accent} pinned />
        </View>
      ) : null}

      <PointsSheet visible={sheet} onClose={() => setSheet(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, gap: Spacing.sm + 4 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  help: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  helpLabel: { fontSize: 18, fontWeight: "800" },
  chips: { flexDirection: "row", gap: Spacing.sm },
  chip: {
    minHeight: 36,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  chipDisabled: { opacity: 0.45 },
  chipLabel: { fontSize: 14, fontWeight: "700" },
  captionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: Spacing.xs },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: Spacing.lg, paddingTop: Spacing.sm, gap: Spacing.xs },
  empty: { alignItems: "center", gap: Spacing.sm, paddingTop: Spacing.xl, paddingHorizontal: Spacing.md },
  center: { textAlign: "center" },
  meBar: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
});
