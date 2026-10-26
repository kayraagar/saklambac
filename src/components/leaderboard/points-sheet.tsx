import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, Radius, Spacing } from "@/constants/theme";
import { POINTS } from "@/engine/points";
import { Button } from "../button";
import { AppText } from "../text";

const LINES: { label: string; points: string }[] = [
  { label: "Her tamamlanan oyun", points: `+${POINTS.played}` },
  { label: "Takımın kazanırsa", points: `+${POINTS.win}` },
  { label: "Avcıyken takımının her yakalaması", points: `+${POINTS.perTag}` },
  { label: "Kaçakken hayatta kaldığın her dakika", points: `+${POINTS.perSurvivedMinute}` },
  { label: "Sona kadar yakalanmazsan", points: `+${POINTS.survivor}` },
];

/** "Puanlar nasıl hesaplanır?" bottom sheet. */
export function PointsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Kapat" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.md }]}>
          <View style={styles.grabber} />
          <AppText variant="heading">Puanlar nasıl hesaplanır?</AppText>
          <View style={styles.list}>
            {LINES.map((l) => (
              <View key={l.label} style={styles.line}>
                <AppText style={styles.label}>{l.label}</AppText>
                <AppText variant="mono" color={Colors.hunter}>
                  {l.points}
                </AppText>
              </View>
            ))}
          </View>
          <AppText variant="caption">
            3&apos;ten az oyunculu ya da 5 dakikadan kısa oyunlar sıralamaya sayılmaz.
          </AppText>
          <AppText variant="caption">
            Puanlar hiç düşmez. Haftalık sıralama her pazartesi 00:00&apos;da sıfırlanır.
          </AppText>
          <Button title="Tamam" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end", backgroundColor: Colors.overlay },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  grabber: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: Colors.border },
  list: { gap: Spacing.sm },
  line: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
    minHeight: 40,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  label: { flex: 1 },
});
