import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/button";
import { GameMap } from "@/components/game-map";
import { Banner, StatRow } from "@/components/hud";
import { Loading } from "@/components/loading";
import { AppText } from "@/components/text";
import { Colors, Spacing, teamColor } from "@/constants/theme";
import { isInZone, nextPingAt, OUT_OF_ZONE_GRACE_MS, SPECTATOR_DELAY_MS } from "@/engine";
import { useGame, usePhaseRedirect, type GameInfo } from "@/hooks/use-game";
import { errorMessage } from "@/lib/errors";
import { formatCountdown } from "@/lib/format";
import type { GamePhase } from "@/lib/routes";
import { startGameTracking, stopGameTracking, useMyPosition } from "@/location";
import { registerPushForGame } from "@/notifications";

export default function Play() {
  const gameId = useLocalSearchParams<{ id: string }>().id as Id<"games">;
  const { data, now, phase } = useGame(gameId);
  usePhaseRedirect(gameId, phase, ["headStart", "hunting"]);
  const view = useQuery(api.map.view, { gameId });
  const myPos = useMyPosition();
  const tracking = useGameTracking(gameId, phase);

  if (!data || !phase) return <Loading />;
  const { game, me } = data;

  return (
    <View style={styles.root}>
      <GameMap zone={game.settings.zone} view={view} me={myPos} myTeam={me.team} now={now} />

      {phase === "headStart" && me.team === "hunter" ? <View style={styles.blind} pointerEvents="none" /> : null}

      <SafeAreaView style={styles.top} edges={["top"]} pointerEvents="box-none">
        <PhaseBanner data={data} phase={phase} now={now} />
        <StatRow
          stats={[
            { label: "Sonraki ping", value: pingLabel(data, now) },
            { label: "Kalan süre", value: data.roundEndsAt ? formatCountdown(data.roundEndsAt - now) : "—" },
            {
              label: "Kaçak",
              value: `${data.runners.active}/${data.runners.total}`,
              color: Colors.runner,
            },
          ]}
        />
        <ZoneWarning data={data} inZone={myPos ? isInZone(myPos, game.settings.zone) : true} now={now} />
        {tracking.error ? (
          <View style={styles.trackingError}>
            <AppText style={styles.flex} color={Colors.danger}>
              Konum paylaşılamıyor: {tracking.error}
            </AppText>
            <Button title="Tekrar dene" variant="secondary" compact onPress={tracking.retry} />
          </View>
        ) : null}
      </SafeAreaView>

      <SafeAreaView style={styles.bottom} edges={["bottom"]} pointerEvents="box-none">
        <View style={styles.actions}>
          <Button
            title="Telsiz"
            variant="secondary"
            style={styles.flex}
            onPress={() => router.push(`/game/${gameId}/radio`)}
          />
          <LeaveButton gameId={gameId} />
        </View>
        {me.team === "runner" && me.status === "active" ? (
          <TagButton gameId={gameId} enabled={phase === "hunting"} />
        ) : null}
      </SafeAreaView>
    </View>
  );
}

/** Starts location reporting + push once the round is live; stops it when the round is over. */
function useGameTracking(gameId: Id<"games">, phase: GamePhase | undefined) {
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const started = useRef<number | null>(null);
  const live = phase === "headStart" || phase === "hunting";

  useEffect(() => {
    if (!live || started.current === attempt) return;
    started.current = attempt;
    startGameTracking(gameId)
      .then((r) => setError(r.ok ? null : r.reason))
      .catch(() => setError("Konum takibi başlatılamadı."));
    registerPushForGame(gameId).catch(() => {});
  }, [live, gameId, attempt]);

  useEffect(() => {
    if (phase === "over") void stopGameTracking();
  }, [phase]);

  return { error, retry: () => setAttempt((a) => a + 1) };
}

function pingLabel(data: GameInfo, now: number): string {
  const { startedAt, settings, status } = data.game;
  if (startedAt === undefined || status === "ended") return "—";
  const at = nextPingAt(startedAt, settings, now);
  return at === null ? "Yok" : formatCountdown(at - now);
}

function PhaseBanner({ data, phase, now }: { data: GameInfo; phase: GamePhase; now: number }) {
  const { me, game } = data;
  const color = teamColor(me.team);

  if (me.status === "tagged") {
    return (
      <Banner
        title="Yakalandın · izleyicisin"
        subtitle={
          game.settings.taggedSeeLive
            ? "Herkesi canlı görüyorsun."
            : `Konumları ${SPECTATOR_DELAY_MS / 1000} sn gecikmeli görüyorsun.`
        }
        color={Colors.textMuted}
      />
    );
  }
  if (phase === "headStart") {
    const left = formatCountdown((data.headStartEndsAt ?? now) - now);
    return me.team === "hunter" ? (
      <Banner title={`Bekle, bakmak yok · ${left}`} subtitle="Kaçaklar saklanıyor. Süre bitince av başlar." color={color} />
    ) : (
      <Banner title={`Kaç! · ${left}`} subtitle="Avcılar beklerken uzaklaş ve saklan." color={color} />
    );
  }
  if (me.team === "hunter") {
    return (
      <Banner
        title={me.taggedAt ? "Artık avcısın!" : "Av başladı"}
        subtitle="Ping'lerde kaçakların son konumu haritada belirir."
        color={color}
      />
    );
  }
  return <Banner title="Saklan!" subtitle="Her ping'de konumun avcılara gösterilir." color={color} />;
}

function ZoneWarning({ data, inZone, now }: { data: GameInfo; inZone: boolean; now: number }) {
  const { me } = data;
  if (me.team !== "runner" || me.status !== "active" || inZone) return null;
  const since = me.outOfZoneSince;
  const left = since ? since + OUT_OF_ZONE_GRACE_MS - now : OUT_OF_ZONE_GRACE_MS;
  return (
    <Banner
      title="Alanın dışındasın!"
      subtitle={
        left > 0
          ? `${Math.ceil(left / 1000)} sn içinde dönmezsen avcılar seni canlı görür.`
          : "Avcılar seni şu an canlı görüyor. Hemen alana dön!"
      }
      color={Colors.danger}
    />
  );
}

function TagButton({ gameId, enabled }: { gameId: Id<"games">; enabled: boolean }) {
  const confirmTagged = useMutation(api.games.confirmTagged);
  const [busy, setBusy] = useState(false);
  const onPress = () =>
    Alert.alert("Yakalandın mı?", "Bir avcı sana dokunduysa onayla. Bu geri alınamaz.", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Evet, yakalandım",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await confirmTagged({ gameId });
          } catch (e) {
            Alert.alert("Olmadı", errorMessage(e));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  return <Button title="Yakalandım" variant="danger" onPress={onPress} loading={busy} disabled={!enabled} />;
}

function LeaveButton({ gameId }: { gameId: Id<"games"> }) {
  const leave = useMutation(api.games.leave);
  const onPress = () =>
    Alert.alert("Oyundan ayrıl", "Ayrılırsan bu oyuna geri dönemezsin.", [
      { text: "Kal", style: "cancel" },
      {
        text: "Ayrıl",
        style: "destructive",
        onPress: () => {
          void stopGameTracking();
          router.replace("/");
          leave({ gameId }).catch(() => {});
        },
      },
    ]);
  return <Button title="Ayrıl" variant="secondary" onPress={onPress} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  blind: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(14, 17, 22, 0.88)" },
  top: { position: "absolute", top: 0, left: 0, right: 0, padding: Spacing.md, gap: Spacing.sm },
  bottom: { position: "absolute", bottom: 0, left: 0, right: 0, padding: Spacing.md, gap: Spacing.sm },
  actions: { flexDirection: "row", gap: Spacing.sm },
  trackingError: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.overlay,
    padding: Spacing.sm,
    borderRadius: 12,
  },
});
