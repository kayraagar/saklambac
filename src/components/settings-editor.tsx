import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors, Spacing } from "@/constants/theme";
import { SETTING_LIMITS, validateSettings, type GameSettings, type LatLng } from "@/engine";
import { errorMessage } from "@/lib/errors";
import { formatMeters, formatMinutes } from "@/lib/format";
import { Button } from "./button";
import { Card } from "./card";
import { ErrorText } from "./error-text";
import { Stepper } from "./stepper";
import { AppText } from "./text";
import { ToggleRow } from "./toggle-row";
import { ZonePicker } from "./zone-picker";

const MIN = 60_000;
const L = SETTING_LIMITS;

/** Zone map + rule controls; used for creating a game and for editing it in the lobby. */
export function SettingsEditor({
  initial,
  recenterTo,
  submitLabel,
  onSubmit,
}: {
  initial: GameSettings;
  recenterTo?: LatLng | null;
  submitLabel: string;
  onSubmit: (s: GameSettings) => Promise<void>;
}) {
  const [s, setS] = useState<GameSettings>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const patch = (p: Partial<GameSettings>) => setS((prev) => ({ ...prev, ...p }));

  const check = validateSettings(s);
  const submit = async () => {
    if (!check.ok) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(s);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["bottom"]}>
      <ZonePicker
        center={s.zone.center}
        radiusM={s.zone.radiusM}
        recenterTo={recenterTo}
        onCenterChange={(center) => setS((prev) => ({ ...prev, zone: { ...prev.zone, center } }))}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="caption">Haritayı kaydırarak oyun alanını yerleştir. Alanın merkezi haritanın merkezidir.</AppText>
        <Card>
          <Stepper
            label="Alan çapı"
            value={s.zone.radiusM * 2}
            min={L.zoneDiameterM.min}
            max={L.zoneDiameterM.max}
            step={100}
            format={formatMeters}
            onChange={(d) => setS((prev) => ({ ...prev, zone: { ...prev.zone, radiusM: d / 2 } }))}
          />
          <Stepper
            label="Av süresi"
            value={s.roundMs}
            min={L.roundMs.min}
            max={L.roundMs.max}
            step={5 * MIN}
            format={formatMinutes}
            onChange={(roundMs) => patch({ roundMs })}
          />
          <Stepper
            label="Ping aralığı"
            value={s.pingIntervalMs}
            min={L.pingIntervalMs.min}
            max={L.pingIntervalMs.max}
            step={MIN}
            format={formatMinutes}
            onChange={(pingIntervalMs) => patch({ pingIntervalMs })}
          />
          <Stepper
            label="Kaçış süresi"
            value={s.headStartMs}
            min={L.headStartMs.min}
            max={L.headStartMs.max}
            step={MIN}
            format={formatMinutes}
            onChange={(headStartMs) => patch({ headStartMs })}
          />
        </Card>
        <Card>
          <ToggleRow
            label="Yakalananlar avcı olur"
            hint="Yakalanan kaçak avcı takımına geçer."
            value={s.taggedJoinHunters}
            onChange={(taggedJoinHunters) => patch({ taggedJoinHunters })}
          />
          <ToggleRow
            label="İzleyiciler canlı görür"
            hint="Kapalıysa yakalananlar konumları 60 sn gecikmeli görür."
            value={s.taggedSeeLive}
            onChange={(taggedSeeLive) => patch({ taggedSeeLive })}
          />
        </Card>
        {!check.ok ? check.errors.map((e) => <ErrorText key={e} message={e} />) : null}
        <ErrorText message={error} />
      </ScrollView>
      <View style={styles.footer}>
        <Button title={submitLabel} onPress={submit} loading={busy} disabled={!check.ok} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, gap: Spacing.md },
  footer: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
});
