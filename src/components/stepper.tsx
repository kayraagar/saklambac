import { Pressable, StyleSheet, View } from "react-native";

import { Colors, Radius, Spacing } from "@/constants/theme";
import { AppText } from "./text";

/** Labelled −/+ control clamped to [min, max]. */
export function Stepper({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)));
  return (
    <View style={styles.row}>
      <AppText style={styles.label}>{label}</AppText>
      <View style={styles.controls}>
        <StepButton text="−" label={`${label} azalt`} disabled={value <= min} onPress={() => set(value - step)} />
        <AppText variant="mono" style={styles.value}>
          {format(value)}
        </AppText>
        <StepButton text="+" label={`${label} artır`} disabled={value >= max} onPress={() => set(value + step)} />
      </View>
    </View>
  );
}

function StepButton({
  text,
  label,
  disabled,
  onPress,
}: {
  text: string;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.btn, { opacity: disabled ? 0.3 : pressed ? 0.7 : 1 }]}
    >
      <AppText style={styles.btnText}>{text}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48 },
  label: { flex: 1, fontWeight: "600" },
  controls: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  value: { minWidth: 76, textAlign: "center" },
  btn: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { fontSize: 22, fontWeight: "800" },
});
