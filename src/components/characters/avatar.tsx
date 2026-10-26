// Initial in a circle with a ring in the team colour (leaderboards, home, profile).
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { Colors, Fonts } from "@/constants/theme";
import { reachableUrl } from "@/lib/storage-url";
import { AppText } from "../text";

/** First letter, upper-cased the Turkish way (i → İ, ı → I). */
export function initialOf(name: string): string {
  const ch = [...name.trim()][0] ?? "?";
  if (ch === "i") return "İ";
  if (ch === "ı") return "I";
  return ch.toUpperCase();
}

export function Avatar({
  name,
  team,
  size = 40,
  uri,
}: {
  name: string;
  /** Profile photo; falls back to the initial. */
  uri?: string | null;
  team?: "hunter" | "runner" | null;
  size?: number;
}) {
  const ring =
    team === "hunter"
      ? Colors.hunter
      : team === "runner"
        ? Colors.runner
        : Colors.border;
  const ink =
    team === "hunter"
      ? Colors.hunter
      : team === "runner"
        ? Colors.runner
        : Colors.text;
  const border = Math.max(2, Math.round(size / 18));
  return (
    <View
      accessible={false}
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: ring,
          borderWidth: border,
        },
      ]}
    >
      {uri ? (
        <Image
          source={{ uri: reachableUrl(uri) }}
          style={{
            width: size - border * 2,
            height: size - border * 2,
            borderRadius: size / 2,
          }}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <AppText
          style={{
            fontSize: Math.round(size * 0.42),
            lineHeight: Math.round(size * 0.52),
            fontFamily: Fonts.rounded,
          }}
          color={ink}
          allowFontScaling={false}
        >
          {initialOf(name)}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    backgroundColor: Colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
