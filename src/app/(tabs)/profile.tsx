import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import Constants from "expo-constants";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";

import { api } from "../../../convex/_generated/api";
import { Avatar } from "@/components/characters";
import { StatRow, StatTile } from "@/components/home/stat-tile";
import { Screen } from "@/components/screen";
import { AppText } from "@/components/text";
import { ToggleRow } from "@/components/toggle-row";
import { Colors, Radius, Spacing, teamColor, teamLabel } from "@/constants/theme";
import { errorMessage } from "@/lib/errors";
import { formatMinutes } from "@/lib/format";

type RecentResult = FunctionReturnType<typeof api.stats.recentResults>[number];

const num = (n: number) => n.toLocaleString("tr-TR");
const km = (m: number) => `${(m / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} km`;

export default function Profile() {
  const me = useQuery(api.profiles.me);
  const stats = useQuery(api.stats.mine, {});
  const recent = useQuery(api.stats.recentResults, { limit: 10 });
  const setListed = useMutation(api.stats.setListed);
  const { signOut } = useAuthActions();
  // Optimistic switch value while the mutation runs.
  const [pendingListed, setPendingListed] = useState<boolean | null>(null);

  const profile = me?.profile;
  const all = stats?.all;
  const mainTeam =
    all && all.hunterGames + all.runnerGames > 0
      ? all.hunterGames >= all.runnerGames
        ? ("hunter" as const)
        : ("runner" as const)
      : null;
  const listed = pendingListed ?? stats?.listed ?? true;

  const onToggleListed = (value: boolean) => {
    setPendingListed(value);
    setListed({ listed: value })
      .catch((e: unknown) => Alert.alert("Kaydedilemedi", errorMessage(e)))
      .finally(() => setPendingListed(null));
  };

  const confirmSignOut = () =>
    Alert.alert("Çıkış yapılsın mı?", undefined, [
      { text: "Vazgeç", style: "cancel" },
      { text: "Çıkış yap", style: "destructive", onPress: () => void signOut() },
    ]);

  return (
    <Screen>
      <View style={styles.head}>
        <Avatar name={profile?.name ?? "?"} team={mainTeam} size={72} />
        <AppText variant="title" style={styles.center} numberOfLines={1}>
          {profile?.name ?? "…"}
        </AppText>
        {profile ? <AppText variant="caption">@{profile.username}</AppText> : null}
      </View>

      {all === undefined ? (
        <ActivityIndicator color={Colors.textMuted} />
      ) : (
        <View style={styles.section}>
          <StatRow>
            <StatTile value={num(all.points)} label="puan" color={Colors.hunter} />
            <StatTile value={num(all.gamesPlayed)} label="oyun" />
            <StatTile value={`%${Math.round(all.winRate * 100)}`} label="galibiyet" />
          </StatRow>
          <StatRow>
            <StatTile value={num(all.tagsMade)} label="Takım yakalaması" color={Colors.hunter} />
            <StatTile
              value={all.bestSurvivalMs > 0 ? formatMinutes(all.bestSurvivalMs) : "—"}
              label="En uzun kaçış"
              color={Colors.runner}
            />
            <StatTile value={all.distanceM > 0 ? km(all.distanceM) : "—"} label="Mesafe" />
          </StatRow>
          <AppText variant="caption" style={styles.center}>
            Genel sıra: {!listed ? "Gizli" : all.rank === null ? (all.points > 0 ? "1000+" : "—") : `#${all.rank}`}
          </AppText>
          {all.hunterGames + all.runnerGames > 0 ? <RoleSplit all={all} /> : null}
        </View>
      )}

      <View style={styles.section}>
        <AppText variant="label">Son oyunlar</AppText>
        {recent === undefined ? (
          <ActivityIndicator color={Colors.textMuted} />
        ) : recent.length === 0 ? (
          <AppText variant="caption">Henüz biten bir oyunun yok.</AppText>
        ) : (
          <View style={styles.list}>
            {recent.map((r, i) => (
              <ResultRow key={r.gameId} result={r} first={i === 0} />
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <AppText variant="label">Ayarlar</AppText>
        <View style={styles.list}>
          <View style={styles.item}>
            <ToggleRow
              label="Sıralamada görün"
              hint="Kapalıyken adın sıralamalarda görünmez."
              value={listed}
              onChange={onToggleListed}
            />
          </View>
          <LinkRow title="Nasıl oynanır" onPress={() => router.push("/how-to-play")} />
          <LinkRow title="Çıkış yap" color={Colors.danger} onPress={confirmSignOut} chevron={false} />
        </View>
      </View>

      <AppText variant="caption" style={[styles.center, styles.version]} color={Colors.textFaint}>
        Sürüm {Constants.expoConfig?.version ?? "1.0.0"}
      </AppText>
    </Screen>
  );
}

function RoleSplit({ all }: { all: NonNullable<FunctionReturnType<typeof api.stats.mine>>["all"] }) {
  const total = all.hunterGames + all.runnerGames;
  return (
    <View
      style={styles.split}
      accessible
      accessibilityLabel={`Avcı ${all.hunterGames} oyun, ${all.hunterPoints} puan. Kaçak ${all.runnerGames} oyun, ${all.runnerPoints} puan.`}
    >
      <View style={styles.splitLabels}>
        <AppText style={styles.bold} color={Colors.hunter}>
          Avcı
        </AppText>
        <AppText style={styles.bold} color={Colors.runner}>
          Kaçak
        </AppText>
      </View>
      <View style={styles.bar}>
        <View style={{ flex: all.hunterGames, backgroundColor: Colors.hunter }} />
        <View style={{ flex: all.runnerGames, backgroundColor: Colors.runner }} />
        {total === 0 ? <View style={styles.flex} /> : null}
      </View>
      <View style={styles.splitLabels}>
        <AppText variant="caption">
          {all.hunterGames} oyun · {num(all.hunterPoints)} p
        </AppText>
        <AppText variant="caption">
          {all.runnerGames} oyun · {num(all.runnerPoints)} p
        </AppText>
      </View>
    </View>
  );
}

function ResultRow({ result: r, first }: { result: RecentResult; first: boolean }) {
  const outcome = r.outcome === "win" ? "Kazandın" : "Kaybettin";
  return (
    <View style={[styles.item, styles.resultRow, !first && styles.divider]}>
      <View style={[styles.dot, { backgroundColor: teamColor(r.startTeam) }]} />
      <View style={styles.flex}>
        <AppText style={styles.bold} color={r.outcome === "win" ? Colors.text : Colors.textMuted}>
          {outcome} · {teamLabel(r.startTeam)}
        </AppText>
        <AppText variant="caption">
          {new Date(r.endedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} · {r.playerCount}{" "}
          oyuncu
        </AppText>
      </View>
      <View style={styles.right}>
        {r.ranked ? (
          <AppText style={styles.points} color={Colors.hunter}>
            +{num(r.points)}
          </AppText>
        ) : (
          <AppText variant="caption">Sayılmadı</AppText>
        )}
        <AppText variant="mono" style={styles.code}>
          {r.code}
        </AppText>
      </View>
    </View>
  );
}

function LinkRow({
  title,
  onPress,
  color = Colors.text,
  chevron = true,
}: {
  title: string;
  onPress: () => void;
  color?: string;
  chevron?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {({ pressed }) => (
        <View style={[styles.item, styles.linkRow, styles.divider, pressed && styles.pressed]}>
          <AppText style={[styles.flex, styles.linkText]} color={color}>
            {title}
          </AppText>
          {chevron ? <AppText color={Colors.textMuted}>›</AppText> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: "center", gap: Spacing.xs, paddingVertical: Spacing.md },
  center: { textAlign: "center" },
  flex: { flex: 1 },
  bold: { fontWeight: "700" },
  section: { gap: Spacing.sm },
  list: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  item: { paddingHorizontal: Spacing.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  pressed: { backgroundColor: Colors.surfaceRaised },
  linkRow: { flexDirection: "row", alignItems: "center", minHeight: 52 },
  linkText: { fontWeight: "600" },
  resultRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md, minHeight: 60, paddingVertical: Spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  right: { alignItems: "flex-end", gap: 2 },
  points: { fontSize: 17, fontWeight: "800", fontVariant: ["tabular-nums"] },
  code: { fontSize: 12, letterSpacing: 2, color: Colors.textMuted },
  split: {
    gap: Spacing.xs,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  splitLabels: { flexDirection: "row", justifyContent: "space-between" },
  bar: { flexDirection: "row", height: 10, borderRadius: 5, overflow: "hidden", backgroundColor: Colors.surfaceRaised },
  version: { marginTop: Spacing.md },
});
