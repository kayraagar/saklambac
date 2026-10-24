import { useQuery } from "convex/react";
import { router } from "expo-router";
import { useEffect } from "react";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { phaseAt } from "@/engine";
import { gameRoute, type GamePhase } from "@/lib/routes";
import { useServerClock } from "./use-server-clock";

export type GameInfo = NonNullable<ReturnType<typeof useGameQuery>>;

function useGameQuery(gameId: Id<"games">) {
  return useQuery(api.games.byId, { gameId });
}

/**
 * `games.byId` plus a ticking server clock and a locally derived phase (so the
 * headStart → hunting switch shows on time even before the query re-runs).
 */
export function useGame(gameId: Id<"games">) {
  const data = useGameQuery(gameId);
  const now = useServerClock(data?.serverNow);

  let phase: GamePhase | undefined = data?.phase;
  if (data && data.game.status !== "lobby" && data.game.status !== "ended" && data.game.startedAt !== undefined) {
    phase = phaseAt(data.game.startedAt, data.game.settings, now);
  }
  return { data, now, phase };
}

/** Moves the user to the screen for the game's current phase (lobby → play → results). */
export function usePhaseRedirect(gameId: Id<"games">, phase: GamePhase | undefined, here: GamePhase[]) {
  const key = here.join(",");
  useEffect(() => {
    if (!phase || key.split(",").includes(phase)) return;
    router.replace(gameRoute(gameId, phase));
  }, [gameId, phase, key]);
}
