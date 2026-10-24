import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { api } from "../../convex/_generated/api";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Screen } from "@/components/screen";
import { AppText } from "@/components/text";
import { Colors, Spacing, teamColor, teamLabel } from "@/constants/theme";
import { formatClock } from "@/lib/format";
import { gameRoute, phaseForStatus } from "@/lib/routes";

type MyGame = FunctionReturnType<typeof api.games.myGames>[number];

const statusLabel: Record<MyGame["status"], string> = {
  lobby: "Lobide",
  headStart: "Kaçış süresi",
  hunting: "Av sürüyor",
  ended: "Bitti",
};

export default function Home() {
  const me = useQuery(api.profiles.me);
  const games = useQuery(api.games.myGames);
  const { signOut } = useAuthActions();

  const active = games?.filter((g) => g.status !== "ended") ?? [];
  const past = games?.filter((g) => g.status === "ended").slice(0, 10) ?? [];

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="caption">Merhaba,</AppText>
          <AppText variant="title">{me?.profile?.name ?? "…"}</AppText>
        </View>
        <Button title="Çıkış" variant="ghost" compact onPress={() => void signOut()} />
      </View>

      <Button title="Oyun kur" onPress={() => router.push("/host")} />
      <Button title="Koda katıl" variant="runner" onPress={() => router.push("/join")} />

      {games === undefined ? (
        <ActivityIndicator color={Colors.textMuted} style={styles.loader} />
      ) : (
        <>
          {active.length > 0 ? <AppText variant="label">Devam eden oyunlar</AppText> : null}
          {active.map((g) => (
            <GameRow key={g.gameId} game={g} />
          ))}
          {past.length > 0 ? <AppText variant="label">Geçmiş oyunlar</AppText> : null}
          {past.map((g) => (
            <GameRow key={g.gameId} game={g} />
          ))}
          {games.length === 0 ? (
            <AppText variant="caption" style={styles.empty}>
              Henüz oyunun yok. Bir oyun kur ya da arkadaşının kodunu gir.
            </AppText>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function GameRow({ game }: { game: MyGame }) {
  const sub =
    game.status === "ended"
      ? game.winner === "hunters"
        ? "Avcılar kazandı"
        : game.winner === "runners"
          ? "Kaçaklar kazandı"
          : "Bitti"
      : statusLabel[game.status];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(gameRoute(game.gameId, phaseForStatus(game.status)))}
    >
      {({ pressed }) => (
        <Card style={[styles.row, pressed && styles.pressed]}>
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
  header: { flexDirection: "row", alignItems: "center", paddingVertical: Spacing.md },
  flex: { flex: 1 },
  loader: { marginTop: Spacing.lg },
  empty: { textAlign: "center", marginTop: Spacing.lg },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  pressed: { opacity: 0.7 },
  code: { fontSize: 20, letterSpacing: 3 },
  team: { fontWeight: "800" },
});
