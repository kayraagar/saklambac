import { router, Stack, type ErrorBoundaryProps } from "expo-router";
import { StyleSheet, View } from "react-native";

import { Button } from "@/components/button";
import { AppText } from "@/components/text";
import { Colors, Spacing } from "@/constants/theme";
import { errorMessage } from "@/lib/errors";

export default function GameLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="lobby" options={{ title: "Lobi" }} />
      <Stack.Screen name="play" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="results" options={{ title: "Sonuç", headerBackVisible: false, gestureEnabled: false }} />
      <Stack.Screen name="radio" options={{ title: "Takım telsizi", presentation: "modal" }} />
      <Stack.Screen name="settings" options={{ title: "Oyun ayarları", presentation: "modal" }} />
    </Stack>
  );
}

/** Query errors (e.g. "Bu oyunun oyuncusu değilsin.") land here instead of crashing the app. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.root}>
      <AppText variant="heading">Oyun açılamadı</AppText>
      <AppText variant="caption" style={styles.center}>
        {errorMessage(error, error.message)}
      </AppText>
      <Button title="Tekrar dene" variant="secondary" onPress={() => void retry()} />
      <Button title="Ana sayfa" onPress={() => router.replace("/")} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    justifyContent: "center",
    gap: Spacing.md,
  },
  center: { textAlign: "center" },
});
