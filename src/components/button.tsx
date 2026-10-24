import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { Colors, Radius, Spacing } from "@/constants/theme";
import { AppText } from "./text";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "runner";

const bg: Record<Variant, string> = {
  primary: Colors.hunter,
  runner: Colors.runner,
  secondary: Colors.surfaceRaised,
  danger: Colors.danger,
  ghost: "transparent",
};
const fg: Record<Variant, string> = {
  primary: Colors.onAccent,
  runner: Colors.onAccent,
  secondary: Colors.text,
  danger: Colors.text,
  ghost: Colors.textMuted,
};

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
  compact,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        { backgroundColor: bg[variant], opacity: inactive ? 0.4 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant]} />
      ) : (
        <AppText style={[styles.title, compact && styles.compactTitle]} color={fg[variant]}>
          {title}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  compact: { minHeight: 40, paddingHorizontal: Spacing.md, borderRadius: Radius.sm },
  title: { fontSize: 17, fontWeight: "800" },
  compactTitle: { fontSize: 15 },
});
