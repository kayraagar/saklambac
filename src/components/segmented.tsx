import { Pressable, StyleSheet, View } from "react-native";

import { Colors, Radius, Spacing } from "@/constants/theme";
import { AppText } from "./text";

export type SegmentOption<T extends string> = { value: T; label: string; color?: string };

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {options.map((o) => {
        const selected = o.value === value;
        const accent = o.color ?? Colors.text;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(o.value)}
            style={[styles.item, selected && { backgroundColor: accent }]}
          >
            <AppText style={styles.label} color={selected ? Colors.onAccent : Colors.textMuted}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    backgroundColor: Colors.surfaceRaised,
    borderRadius: Radius.md,
    padding: Spacing.xs,
    gap: Spacing.xs,
  },
  item: { flex: 1, minHeight: 44, borderRadius: Radius.sm, alignItems: "center", justifyContent: "center" },
  label: { fontWeight: "800", fontSize: 15 },
});
