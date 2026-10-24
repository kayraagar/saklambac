import { StyleSheet, Text, type TextProps } from "react-native";

import { Colors, Fonts } from "@/constants/theme";

type Variant = "title" | "heading" | "body" | "label" | "caption" | "mono";

export function AppText({
  variant = "body",
  color,
  style,
  ...rest
}: TextProps & { variant?: Variant; color?: string }) {
  return <Text {...rest} style={[styles.base, styles[variant], color ? { color } : null, style]} />;
}

const styles = StyleSheet.create({
  base: { color: Colors.text, fontFamily: Fonts.rounded },
  title: { fontSize: 32, fontWeight: "800", letterSpacing: -0.5 },
  heading: { fontSize: 20, fontWeight: "700" },
  body: { fontSize: 16, fontWeight: "500" },
  label: { fontSize: 14, fontWeight: "700", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.8 },
  caption: { fontSize: 13, fontWeight: "500", color: Colors.textMuted },
  mono: { fontFamily: Fonts.mono, fontSize: 16, fontWeight: "700", fontVariant: ["tabular-nums"] },
});
