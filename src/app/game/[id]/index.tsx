import { Redirect, useLocalSearchParams } from "expo-router";

import type { Id } from "../../../../convex/_generated/dataModel";
import { Loading } from "@/components/loading";
import { useGame } from "@/hooks/use-game";
import { gameRoute } from "@/lib/routes";

/** `/game/<id>` (e.g. from a push notification tap): forward to the screen for the current phase. */
export default function GameIndex() {
  const gameId = useLocalSearchParams<{ id: string }>().id as Id<"games">;
  const { phase } = useGame(gameId);
  if (!phase) return <Loading />;
  return <Redirect href={gameRoute(gameId, phase)} />;
}
