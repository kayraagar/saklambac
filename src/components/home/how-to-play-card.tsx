import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { Referee } from "@/components/characters";
import { AppText } from "@/components/text";
import { Colors, Radius, Spacing } from "@/constants/theme";

/** Home entry to the rules replay (`/how-to-play`), with Düdük whistling. */
export function HowToPlayCard() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Nasıl oynanır? Kuralları 1 dakikada öğren"
      onPress={() => router.push("/how-to-play")}
    >
      {({ pressed }) => (
        <View style={[styles.card, pressed && styles.pressed]}>
          <View style={styles.art} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <Referee pose="whistle" size={72} />
          </View>
          <View style={styles.flex}>
            <AppText variant="heading">Nasıl oynanır?</AppText>
            <AppText variant="caption">Kuralları 1 dakikada öğren</AppText>
          </View>
          <AppText variant="heading" color={Colors.hunter}>
            ›
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  pressed: { opacity: 0.75 },
  art: { width: 72, height: 72 },
  flex: { flex: 1, gap: 2 },
});
