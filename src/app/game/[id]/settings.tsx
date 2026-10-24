import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Loading } from "@/components/loading";
import { SettingsEditor } from "@/components/settings-editor";

export default function EditSettings() {
  const gameId = useLocalSearchParams<{ id: string }>().id as Id<"games">;
  const lobby = useQuery(api.games.lobby, { gameId });
  const update = useMutation(api.games.updateSettings);

  if (!lobby) return <Loading />;
  return (
    <SettingsEditor
      initial={lobby.settings}
      submitLabel="Kaydet"
      onSubmit={async (settings) => {
        await update({ gameId, settings });
        router.back();
      }}
    />
  );
}
