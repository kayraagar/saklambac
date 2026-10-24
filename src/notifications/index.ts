import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { AndroidImportance, AndroidNotificationVisibility } from "expo-notifications";
import { type Href, router } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { authedHttpClient } from "../location/authToken";

export const GAME_CHANNEL_ID = "game";

// Foreground: show the banner, never play a sound (a ringing phone gives a hider away).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let channelsReady: Promise<void> | null = null;

/**
 * Android channels: vibration only, no sound. Sound/vibration are fixed at
 * channel creation (only name/description can change later), so get them right.
 * "default" is configured the same way because the backend currently sends
 * `channelId: "default"`.
 */
function ensureChannels(): Promise<void> {
  if (Platform.OS !== "android") return Promise.resolve();
  channelsReady ??= (async () => {
    const silentBuzz: Notifications.NotificationChannelInput = {
      name: "Oyun",
      description: "Ping, yakalanma ve tur bildirimleri (sessiz titreşim)",
      importance: AndroidImportance.HIGH,
      sound: null,
      enableVibrate: true,
      vibrationPattern: [0, 250, 150, 250],
      lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
    };
    await Notifications.setNotificationChannelAsync(GAME_CHANNEL_ID, silentBuzz);
    await Notifications.setNotificationChannelAsync("default", { ...silentBuzz, name: "Genel" });
  })().catch((e) => {
    channelsReady = null;
    console.warn("[push] channel setup failed", e);
  });
  return channelsReady;
}

void ensureChannels();

function easProjectId(): string | undefined {
  const fromEas = Constants.easConfig?.projectId;
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return fromEas ?? extra?.eas?.projectId;
}

/** Never throws; logs and returns on any failure. */
export async function registerPushForGame(gameId: Id<"games">): Promise<void> {
  try {
    // Android 13+: a channel must exist before the permission prompt can appear.
    await ensureChannels();

    if (!Device.isDevice) {
      console.warn("[push] push tokens need a physical device; skipping registration");
      return;
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      ({ status } = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: false, allowSound: false },
      }));
    }
    if (status !== "granted") {
      console.warn("[push] notification permission not granted");
      return;
    }

    const projectId = easProjectId();
    if (!projectId) {
      console.warn(
        "[push] No EAS projectId (Constants.easConfig / expoConfig.extra.eas.projectId). " +
          "Run `npx eas-cli@latest init` to create one; push registration skipped.",
      );
      return;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    const client = await authedHttpClient();
    if (!client) {
      console.warn("[push] not signed in; push token not registered");
      return;
    }
    await client.mutation(api.push.registerToken, { gameId, token });
  } catch (e) {
    console.warn("[push] registerPushForGame failed", e);
  }
}

type GameNotificationData = { type?: unknown; gameId?: unknown };

/**
 * Root-layout hook: tapping a game notification ({type, gameId}) opens
 * /game/<gameId>. Covers cold start (the hook returns the launch response) and
 * warm taps. Pure navigation, no Convex.
 */
export function useNotificationRouting(): void {
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!response) return;
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const id = response.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;

    const data = response.notification.request.content.data as GameNotificationData | undefined;
    if (data && typeof data.gameId === "string" && data.gameId.length > 0) {
      router.push(`/game/${data.gameId}` as Href);
    }
    // Don't re-route on remount / next launch.
    void Notifications.clearLastNotificationResponseAsync().catch(() => {});
  }, [response]);
}
