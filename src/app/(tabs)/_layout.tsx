import { NativeTabs } from "expo-router/native-tabs";

import { Colors } from "@/constants/theme";

/** Ana sayfa · Sıralama · Profil. Host/join/game screens sit above this in the root stack. */
export default function TabsLayout() {
  return (
    <NativeTabs
      tintColor={Colors.hunter}
      iconColor={{ default: Colors.textMuted, selected: Colors.hunter }}
      labelStyle={{
        default: { color: Colors.textMuted, fontWeight: "600" },
        selected: { color: Colors.hunter, fontWeight: "700" },
      }}
      backgroundColor={Colors.surface}
      blurEffect="systemChromeMaterialDark"
      shadowColor={Colors.border}
      indicatorColor={Colors.surfaceRaised}
      rippleColor={Colors.surfaceRaised}
      labelVisibilityMode="labeled"
      minimizeBehavior="never"
    >
      <NativeTabs.Trigger name="index" contentStyle={{ backgroundColor: Colors.background }}>
        <NativeTabs.Trigger.Label>Ana sayfa</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="leaderboard" contentStyle={{ backgroundColor: Colors.background }}>
        <NativeTabs.Trigger.Label>Sıralama</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "trophy", selected: "trophy.fill" }} md="emoji_events" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile" contentStyle={{ backgroundColor: Colors.background }}>
        <NativeTabs.Trigger.Label>Profil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }}
          md="account_circle"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
