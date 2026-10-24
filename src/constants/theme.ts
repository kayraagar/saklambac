import { Platform } from "react-native";

import type { Team } from "@/engine";

/** Saklambaç night palette (see CONTRACT.md → Theme). Dark only. */
export const Colors = {
  background: "#0E1116",
  surface: "#171B22",
  surfaceRaised: "#202631",
  border: "#2A313D",
  text: "#F2F4F7",
  textMuted: "#9AA3B2",
  textFaint: "#5C6575",
  hunter: "#C8F135",
  runner: "#3DD6F5",
  danger: "#FF5A5F",
  onAccent: "#0E1116",
  overlay: "rgba(14, 17, 22, 0.82)",
} as const;

export const teamColor = (team: Team | null | undefined): string =>
  team === "hunter" ? Colors.hunter : team === "runner" ? Colors.runner : Colors.textMuted;

export const teamLabel = (team: Team | null | undefined): string =>
  team === "hunter" ? "Avcı" : team === "runner" ? "Kaçak" : "—";

export const Fonts = {
  rounded: Platform.select({ ios: "ui-rounded", default: undefined }),
  mono: Platform.select({ ios: "ui-monospace", default: "monospace" }),
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const Radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;
