import { useMutation } from "convex/react";
import { router } from "expo-router";
import { useState } from "react";

import { api } from "../../convex/_generated/api";
import { SettingsEditor } from "@/components/settings-editor";
import { defaultSettings } from "@/engine";
import { DEFAULT_CENTER } from "@/lib/map";
import { useMyPosition } from "@/location";

export default function Host() {
  const create = useMutation(api.games.create);
  const myPos = useMyPosition();
  const [initial] = useState(() => defaultSettings(myPos ?? DEFAULT_CENTER));

  return (
    <SettingsEditor
      initial={initial}
      recenterTo={myPos}
      submitLabel="Oyunu oluştur"
      onSubmit={async (settings) => {
        const { gameId } = await create({ settings });
        router.replace(`/game/${gameId}/lobby`);
      }}
    />
  );
}
