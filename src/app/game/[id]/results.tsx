import { useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { GameResultView } from "../../../../convex/stats";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Hunter, Runner } from "@/components/characters";
import { Loading } from "@/components/loading";
import { Screen } from "@/components/screen";
import { AppText } from "@/components/text";
import { Colors, Spacing, teamColor, teamLabel } from "@/constants/theme";
import { useGame, usePhaseRedirect, type GameInfo } from "@/hooks/use-game";
import { formatMeters, formatMinutes } from "@/lib/format";
import { stopGameTracking } from "@/location";

export default function Results() {
  const gameId = useLocalSearchParams<{ id: string }>().id as Id<"games">;
  const { data, phase } = useGame(gameId);
  const result = useQuery(api.stats.forGame, { gameId });
  usePhaseRedirect(gameId, phase, ["over"]);

  useEffect(() => {
    void stopGameTracking();
  }, []);

  if (!data) return <Loading />;
  const { game } = data;
  const winner = game.winner;

  return (
    <Screen
      edges={["bottom"]}
      footer={
        <View style={styles.actions}>
          <Button
            title="Sıralama"
            variant="secondary"
            style={styles.flex}
            onPress={() => {
              // Back to the tabs first (dismissTo replaces when the href isn't in history), then switch tab.
              router.dismissTo("/");
              router.navigate("/leaderboard");
            }}
          />
          <Button title="Ana sayfa" style={styles.flex} onPress={() => router.dismissTo("/")} />
        </View>
      }
    >
      <View style={styles.hero}>
        {winner ? <Mascot data={data} /> : null}
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

      {result ? <PointsCard result={result} /> : null}

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

/** The character for my personal outcome: cheering on a win, caught / still looking on a loss. */
function Mascot({ data }: { data: GameInfo }) {
  const { me, game } = data;
  const won =
    (me.team === "hunter" && game.winner === "hunters") || (me.team === "runner" && game.winner === "runners");
  if (me.team === "runner") return <Runner pose={won ? "cheer" : "caught"} size={132} />;
  return <Hunter pose={won ? "cheer" : "look"} size={132} />;
}

/** 0 → target over `ms` (instant with reduced motion). */
function useCountUp(target: number, ms = 600): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(reduced ? target : 0);
  useEffect(() => {
    if (reduced) {
      const id = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(id);
    }
    const start = Date.now();
    let id = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / ms);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [target, ms, reduced]);
  return value;
}

function PointsCard({ result }: { result: GameResultView }) {
  const shown = useCountUp(result.points);
  const accent = result.ranked ? (result.endTeam === "hunter" ? Colors.hunter : Colors.runner) : Colors.textFaint;
  return (
    <Card style={styles.points}>
      <AppText style={styles.bigPoints} color={accent} accessibilityLabel={`${result.points} puan`}>
        +{shown.toLocaleString("tr-TR")} puan
      </AppText>
      {result.ranked ? null : (
        <AppText variant="caption" style={styles.center}>
          Bu oyun sıralamaya sayılmadı (en az 3 oyuncu ve 5 dakika gerekir).
        </AppText>
      )}
      <View style={styles.lines}>
        {result.breakdown.map((l) => (
          <View key={l.key} style={styles.stat}>
            <AppText color={result.ranked ? Colors.text : Colors.textMuted} style={styles.flex}>
              {l.label}
            </AppText>
            <AppText variant="mono" color={result.ranked ? Colors.text : Colors.textFaint}>
              +{l.points}
            </AppText>
          </View>
        ))}
        {result.distanceM !== null && result.distanceM > 0 ? (
          <View style={styles.stat}>
            <AppText color={Colors.textMuted} style={styles.flex}>
              Yürüdüğün mesafe
            </AppText>
            <AppText variant="mono" color={Colors.textMuted}>
              {formatMeters(result.distanceM)}
            </AppText>
          </View>
        ) : null}
      </View>
      <View style={styles.divider} />
      <AppText variant="caption">
        Bu hafta: {result.week.points.toLocaleString("tr-TR")} puan
        {result.week.rank !== null ? ` · #${result.week.rank}` : ""}
      </AppText>
    </Card>
  );
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
  hero: { alignItems: "center", gap: Spacing.sm, paddingVertical: Spacing.lg },
  actions: { flexDirection: "row", gap: Spacing.sm },
  flex: { flex: 1 },
  points: { gap: Spacing.sm, paddingVertical: Spacing.lg },
  bigPoints: { fontSize: 40, fontWeight: "900", textAlign: "center", fontVariant: ["tabular-nums"] },
  lines: { gap: Spacing.xs, marginTop: Spacing.xs },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border, marginVertical: Spacing.xs },
  center: { textAlign: "center" },
  stat: { flexDirection: "row", justifyContent: "space-between", minHeight: 28, alignItems: "center" },
  statValue: { fontWeight: "800" },
});
