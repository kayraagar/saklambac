import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Share, StyleSheet, View } from "react-native";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { ErrorText } from "@/components/error-text";
import { Loading } from "@/components/loading";
import { Screen } from "@/components/screen";
import { Segmented, type SegmentOption } from "@/components/segmented";
import { AppText } from "@/components/text";
import { Colors, Spacing } from "@/constants/theme";
import { MIN_PLAYERS, type RolePreference } from "@/engine";
import { useGame, usePhaseRedirect } from "@/hooks/use-game";
import { errorMessage } from "@/lib/errors";
import { formatMeters, formatMinutes } from "@/lib/format";

type Lobby = FunctionReturnType<typeof api.games.lobby>;

const PREFS: SegmentOption<RolePreference>[] = [
  { value: "hunter", label: "Avcı", color: Colors.hunter },
  { value: "runner", label: "Kaçak", color: Colors.runner },
  { value: "random", label: "Rastgele", color: Colors.text },
];
const prefLabel: Record<RolePreference, string> = { hunter: "Avcı", runner: "Kaçak", random: "Rastgele" };
const prefColor: Record<RolePreference, string> = {
  hunter: Colors.hunter,
  runner: Colors.runner,
  random: Colors.textMuted,
};

export default function LobbyScreen() {
  const gameId = useLocalSearchParams<{ id: string }>().id as Id<"games">;
  const lobby = useQuery(api.games.lobby, { gameId });
  const { phase } = useGame(gameId);
  usePhaseRedirect(gameId, phase, ["lobby"]);

  const setPref = useMutation(api.games.setPref);
  const setReady = useMutation(api.games.setReady);
  const start = useMutation(api.games.start);
  const leave = useMutation(api.games.leave);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!lobby) return <Loading />;
  const me = lobby.players.find((p) => p.isMe);

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const onStart = async () => {
    setBusy(true);
    await run(() => start({ gameId }));
    setBusy(false);
  };

  const onLeave = () =>
    Alert.alert("Oyundan ayrıl", "Lobiden çıkmak istediğine emin misin?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Ayrıl",
        style: "destructive",
        onPress: () => {
          router.replace("/");
          leave({ gameId }).catch(() => {});
        },
      },
    ]);

  const footer = (
    <>
      <ErrorText message={error} />
      {lobby.isHost ? (
        <>
          {!lobby.canStart.ok ? <AppText variant="caption">{lobby.canStart.reason}</AppText> : null}
          {lobby.canStart.ok && !lobby.allReady ? (
            <AppText variant="caption">Herkes hazır değil, yine de başlatabilirsin.</AppText>
          ) : null}
          <Button title="Oyunu başlat" onPress={onStart} loading={busy} disabled={!lobby.canStart.ok} />
        </>
      ) : me ? (
        <Button
          title={me.ready ? "Hazırım ✓" : "Hazır mısın?"}
          variant={me.ready ? "secondary" : "primary"}
          onPress={() => run(() => setReady({ gameId, ready: !me.ready }))}
        />
      ) : null}
      <Button title="Ayrıl" variant="ghost" onPress={onLeave} />
    </>
  );

  return (
    <Screen edges={["bottom"]} footer={footer}>
      <CodeCard code={lobby.code} />

      <AppText variant="label">Tercihin</AppText>
      {me ? (
        <Segmented options={PREFS} value={me.pref} onChange={(pref) => run(() => setPref({ gameId, pref }))} />
      ) : null}
      <AppText variant="caption">{hunterHint(lobby)}</AppText>

      <AppText variant="label">Oyuncular ({lobby.players.length})</AppText>
      <Card>
        {lobby.players.map((p) => (
          <View key={p.playerId} style={styles.player}>
            <AppText style={styles.flex} numberOfLines={1}>
              {p.name}
              {p.isMe ? " (sen)" : ""}
              {p.isHost ? "  👑" : ""}
            </AppText>
            <AppText style={styles.pref} color={prefColor[p.pref]}>
              {prefLabel[p.pref]}
            </AppText>
            <AppText style={styles.ready} color={p.ready || p.isHost ? Colors.hunter : Colors.textFaint}>
              {p.isHost ? "Kurucu" : p.ready ? "Hazır" : "Bekliyor"}
            </AppText>
          </View>
        ))}
      </Card>

      <AppText variant="label">Kurallar</AppText>
      <Card>
        <Rule label="Alan çapı" value={formatMeters(lobby.settings.zone.radiusM * 2)} />
        <Rule label="Av süresi" value={formatMinutes(lobby.settings.roundMs)} />
        <Rule label="Ping aralığı" value={formatMinutes(lobby.settings.pingIntervalMs)} />
        <Rule label="Kaçış süresi" value={formatMinutes(lobby.settings.headStartMs)} />
        <Rule label="Yakalananlar avcı olur" value={lobby.settings.taggedJoinHunters ? "Evet" : "Hayır"} />
        <Rule label="İzleyiciler canlı görür" value={lobby.settings.taggedSeeLive ? "Evet" : "60 sn gecikmeli"} />
        {lobby.isHost ? (
          <Button
            title="Ayarları düzenle"
            variant="secondary"
            compact
            onPress={() => router.push(`/game/${gameId}/settings`)}
          />
        ) : null}
      </Card>
    </Screen>
  );
}

function hunterHint(lobby: Lobby): string {
  const n = lobby.players.length;
  const { min, max } = lobby.hunterRange;
  if (n < MIN_PLAYERS) return `En az ${MIN_PLAYERS} oyuncu gerekli (şu an ${n}).`;
  return min === max ? `${n} oyuncuyla ${min} avcı` : `${n} oyuncuyla ${min}–${max} avcı`;
}

function CodeCard({ code }: { code: string }) {
  const share = () =>
    Share.share({ message: `Saklambaç oyunuma katıl! Kod: ${code}` }).catch(() => {});
  return (
    <Card style={styles.codeCard}>
      <AppText variant="label">Oyun kodu</AppText>
      <AppText variant="mono" style={styles.code} selectable accessibilityLabel={`Oyun kodu ${code.split("").join(" ")}`}>
        {code}
      </AppText>
      <Button title="Paylaş" variant="runner" compact onPress={share} />
    </Card>
  );
}

function Rule({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.rule}>
      <AppText variant="caption">{label}</AppText>
      <AppText style={styles.ruleValue}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  codeCard: { alignItems: "center", paddingVertical: Spacing.lg },
  code: { fontSize: 48, letterSpacing: 8, color: Colors.hunter },
  player: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, minHeight: 36 },
  pref: { fontWeight: "700", width: 76, textAlign: "right" },
  ready: { fontWeight: "700", width: 76, textAlign: "right", fontSize: 14 },
  rule: { flexDirection: "row", justifyContent: "space-between" },
  ruleValue: { fontWeight: "700" },
});
