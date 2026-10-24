import type { Id } from "../../convex/_generated/dataModel";

export type GamePhase = "lobby" | "headStart" | "hunting" | "over";

/** Screen that belongs to a game phase. */
export function gameRoute(gameId: Id<"games">, phase: GamePhase) {
  switch (phase) {
    case "lobby":
      return `/game/${gameId}/lobby` as const;
    case "over":
      return `/game/${gameId}/results` as const;
    default:
      return `/game/${gameId}/play` as const;
  }
}

export function phaseForStatus(status: "lobby" | "headStart" | "hunting" | "ended"): GamePhase {
  return status === "ended" ? "over" : status;
}
