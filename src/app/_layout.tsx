// Defines the background location TaskManager task; must run at app start.
import "@/location/task";

import { ConvexAuthProvider, useConvexAuth } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { DarkTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { api } from "../../convex/_generated/api";
import { Colors } from "@/constants/theme";
import { convex, secureAuthStorage } from "@/lib/convex";
import { useTourSeen } from "@/lib/tour";
import { useNotificationRouting } from "@/notifications";

SplashScreen.preventAutoHideAsync();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.hunter,
    background: Colors.background,
    card: Colors.surface,
    text: Colors.text,
    border: Colors.border,
    notification: Colors.danger,
  },
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ConvexAuthProvider client={convex} storage={secureAuthStorage}>
        <ThemeProvider value={theme}>
          <StatusBar style="light" />
          <AuthGate />
        </ThemeProvider>
      </ConvexAuthProvider>
    </SafeAreaProvider>
  );
}

/**
 * First launch → tour; signed out → sign-in; signed in without a profile →
 * onboarding (profile setup); else the app (tabs + full-screen game stack).
 * The splash stays up until we know which.
 */
function AuthGate() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const me = useQuery(api.profiles.me, isAuthenticated ? {} : "skip");
  const tourSeen = useTourSeen();
  useNotificationRouting();

  const ready = tourSeen !== undefined && !isLoading && (!isAuthenticated || me !== undefined);
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  const firstRun = tourSeen === false;
  const signedOut = !firstRun && (!isAuthenticated || me === null);
  const needsProfile = !firstRun && isAuthenticated && me != null && me.profile === null;
  const inApp = !firstRun && isAuthenticated && me !== null && me?.profile !== null;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Protected guard={firstRun}>
        <Stack.Screen name="onboarding-tour" options={{ headerShown: false, animation: "fade" }} />
      </Stack.Protected>
      <Stack.Protected guard={signedOut}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={needsProfile}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={inApp}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: "Ana sayfa" }} />
        <Stack.Screen name="host" options={{ title: "Oyun kur" }} />
        <Stack.Screen name="join" options={{ title: "Koda katıl" }} />
        <Stack.Screen name="how-to-play" options={{ presentation: "modal", headerShown: false }} />
        <Stack.Screen name="game/[id]" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
