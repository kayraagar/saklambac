import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Loading } from "@/components/loading";
import { Screen } from "@/components/screen";
import { AppText } from "@/components/text";
import { Colors, Spacing, teamColor, teamLabel } from "@/constants/theme";
import { useGame, usePhaseRedirect, type GameInfo } from "@/hooks/use-game";
import { formatMinutes } from "@/lib/format";
import { stopGameTracking } from "@/location";

export default function Results() {
  const gameId = useLocalSearchParams<{ id: string }>().id as Id<"games">;
  const { data, phase } = useGame(gameId);
  usePhaseRedirect(gameId, phase, ["over"]);

  useEffect(() => {
    void stopGameTracking();
  }, []);

  if (!data) return <Loading />;
  const { game } = data;
  const winner = game.winner;

  return (
    <Screen edges={["bottom"]} footer={<Button title="Ana sayfa" onPress={() => router.dismissTo("/")} />}>
      <View style={styles.hero}>
        {winner ? (
          <AppText variant="title" style={styles.center} color={winner === "hunters" ? Colors.hunter : Colors.runner}>
            {winner === "hunters" ? "Avcılar kazandı" : "Kaçaklar kazandı"}
          </AppText>
        ) : (
          <AppText variant="title" style={styles.center}>
            {game.status === "ended" ? "Oyun bitti" : "Sonuç hesaplanıyor…"}
          </AppText>
        )}
        <AppText variant="heading" style={styles.center}>
          {personalResult(data)}
        </AppText>
      </View>

      <Card>
        <Stat label="Takımın" value={teamLabel(data.me.team)} color={teamColor(data.me.team)} />
        <Stat label="Hayatta kalan kaçak" value={`${data.runners.active}/${data.runners.total}`} />
        <Stat label="Yakalanan" value={`${data.runners.tagged}`} />
        <Stat label="Oyuncu" value={`${data.playerCount}`} />
        {game.startedAt && game.endedAt ? (
          <Stat label="Süre" value={formatMinutes(game.endedAt - game.startedAt)} />
        ) : null}
        <Stat label="Oyun kodu" value={game.code} />
      </Card>
    </Screen>
  );
}

function personalResult({ me, game }: GameInfo): string {
  if (!game.winner) return "";
  if (me.team === "runner") return me.status === "active" ? "Hayatta kaldın!" : "Yakalandın";
  if (me.taggedAt) return "Yakalandın, sonra avcı oldun";
  return game.winner === "hunters" ? "Avın başarılı!" : "Kaçaklar elinden kaçtı";
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="caption">{label}</AppText>
      <AppText style={styles.statValue} color={color}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: Spacing.sm, paddingVertical: Spacing.xl },
  center: { textAlign: "center" },
  stat: { flexDirection: "row", justifyContent: "space-between", minHeight: 28, alignItems: "center" },
  statValue: { fontWeight: "800" },
});
