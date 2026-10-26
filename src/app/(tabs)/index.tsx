import { useQuery } from "convex/react";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/button";
import { Avatar, Hunter, Runner } from "@/components/characters";
import { ActiveGameCard } from "@/components/home/active-game-card";
import { GameRow } from "@/components/home/game-row";
import { HowToPlayCard } from "@/components/home/how-to-play-card";
import { MiniLeaderboard } from "@/components/home/mini-leaderboard";
import { StatRow, StatTile } from "@/components/home/stat-tile";
import { Screen } from "@/components/screen";
import { AppText } from "@/components/text";
import { Colors, Radius, Spacing } from "@/constants/theme";

const enter = (i: number) => FadeInDown.delay(i * 60).springify().damping(18);

export default function Home() {
  const me = useQuery(api.profiles.me);
  const games = useQuery(api.games.myGames);
  const stats = useQuery(api.stats.mine, {});
  const board = useQuery(api.stats.leaderboard, { board: "hunter", window: "week", limit: 3 });

  const name = me?.profile?.name ?? "…";
  const active = games?.filter((g) => g.status !== "ended") ?? [];
  const past = games?.filter((g) => g.status === "ended").slice(0, 3) ?? [];
  const firstTime = stats !== undefined && stats.all.gamesPlayed === 0;

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="caption">Merhaba,</AppText>
          <AppText variant="title" numberOfLines={1}>
            {name}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Profil"
          hitSlop={8}
          onPress={() => router.navigate("/profile")}
        >
          <Avatar name={me?.profile?.name ?? "?"} uri={me?.profile?.avatarUrl} size={44} />
        </Pressable>
      </View>

      {active.map((g, i) => (
        <Animated.View key={g.gameId} entering={enter(i)}>
          <ActiveGameCard game={g} />
        </Animated.View>
      ))}

      <Animated.View entering={enter(1)} style={styles.hero}>
        <View style={styles.glowHunter} />
        <View style={styles.glowRunner} />
        <View
          style={styles.cast}
          accessible
          accessibilityLabel="Avcı Doğan dürbünle bakıyor, kaçak Çevik saklanıyor."
        >
          <Hunter pose="look" size={112} />
          <Runner pose="hide" size={112} mirrored />
        </View>
        <AppText variant="heading" style={styles.heroTitle}>
          Bugün kim saklanıyor?
        </AppText>
        <AppText variant="caption" style={styles.center}>
          Bir oyun kur ya da arkadaşının kodunu gir.
        </AppText>
        <View style={styles.heroButtons}>
          <Button title="Oyun kur" onPress={() => router.push("/host")} />
          <Button title="Koda katıl" variant="runner" onPress={() => router.push("/join")} />
        </View>
      </Animated.View>

      {stats === undefined ? (
        <ActivityIndicator color={Colors.textMuted} style={styles.loader} />
      ) : firstTime ? (
        <Animated.View entering={enter(2)} style={styles.firstCard}>
          <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <Runner pose="run" size={80} />
          </View>
          <AppText style={styles.flex} color={Colors.text}>
            İlk oyununu oyna, puanların burada görünsün.
          </AppText>
        </Animated.View>
      ) : (
        <Animated.View entering={enter(2)} style={styles.section}>
          <AppText variant="label">Bu haftan</AppText>
          <StatRow>
            <StatTile value={stats.week.points.toLocaleString("tr-TR")} label="puan" color={Colors.hunter} />
            <StatTile value={String(stats.week.gamesPlayed)} label="oyun" />
            <StatTile value={String(stats.week.wins)} label="galibiyet" />
            <StatTile
              value={!stats.listed ? "Gizli" : stats.week.rank === null ? "—" : `#${stats.week.rank}`}
              label="sıra"
              color={Colors.runner}
            />
          </StatRow>

          <View style={styles.sectionHead}>
            <AppText variant="label" style={styles.flex}>
              Bu haftanın avcıları
            </AppText>
            <Pressable
              accessibilityRole="link"
              hitSlop={12}
              onPress={() => router.navigate({ pathname: "/leaderboard", params: { board: "hunter", window: "week" } })}
            >
              <AppText variant="label" color={Colors.hunter}>
                Tümü ›
              </AppText>
            </Pressable>
          </View>
          <MiniLeaderboard
            rows={board?.rows}
            unit="puan"
            color={Colors.hunter}
            team="hunter"
            emptyText="Bu hafta henüz oyun yok. İlk sen ol!"
          />
        </Animated.View>
      )}

      <Animated.View entering={enter(3)}>
        <HowToPlayCard />
      </Animated.View>

      {past.length > 0 ? (
        <Animated.View entering={enter(4)} style={styles.section}>
          <AppText variant="label">Son oyunlar</AppText>
          {past.map((g) => (
            <GameRow key={g.gameId} game={g} />
          ))}
        </Animated.View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: Spacing.md, paddingTop: Spacing.sm },
  flex: { flex: 1 },
  center: { textAlign: "center" },
  loader: { marginTop: Spacing.md },
  hero: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: Spacing.md,
    paddingTop: Spacing.lg,
    gap: Spacing.sm,
    overflow: "hidden",
  },
  glowHunter: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    left: -40,
    top: -60,
    backgroundColor: Colors.hunter,
    opacity: 0.12,
  },
  glowRunner: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    right: -50,
    top: -30,
    backgroundColor: Colors.runner,
    opacity: 0.12,
  },
  cast: { flexDirection: "row", justifyContent: "center", alignItems: "flex-end", gap: Spacing.lg },
  heroTitle: { textAlign: "center", fontSize: 24, fontWeight: "800" },
  heroButtons: { gap: Spacing.sm, marginTop: Spacing.sm },
  firstCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  section: { gap: Spacing.sm },
  sectionHead: { flexDirection: "row", alignItems: "center", marginTop: Spacing.sm },
});
