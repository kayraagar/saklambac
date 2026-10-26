import { useMutation } from "convex/react";
import { router } from "expo-router";
import { useState } from "react";

import { api } from "../../convex/_generated/api";
import { SettingsEditor } from "@/components/settings-editor";
import { defaultSettings } from "@/engine";
import { DEFAULT_CENTER } from "@/lib/map";

export default function Host() {
  const create = useMutation(api.games.create);
  // The zone picker asks for location and moves the zone to the user once a fix arrives.
  const [initial] = useState(() => defaultSettings(DEFAULT_CENTER));

  return (
    <SettingsEditor
      initial={initial}
      autoCenter
      submitLabel="Oyunu oluştur"
      onSubmit={async (settings) => {
        const { gameId } = await create({ settings });
        router.replace(`/game/${gameId}/lobby`);
      }}
    />
  );
}
