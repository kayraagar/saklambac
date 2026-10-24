import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { StyleSheet } from "react-native";
import MapView, { Circle } from "react-native-maps";

import type { api } from "../../convex/_generated/api";
import { Colors, teamColor } from "@/constants/theme";
import type { LatLng, Team, Zone } from "@/engine";
import { formatAgo } from "@/lib/format";
import { DARK_MAP_STYLE, regionFor, toCoord } from "@/lib/map";
import { PingMarker, PlayerMarker } from "./player-marker";

type MapViewData = FunctionReturnType<typeof api.map.view>;

/** Full-screen game map: zone, visible players, last ping ghosts and the local player. */
export function GameMap({
  zone,
  view,
  me,
  myTeam,
  now,
}: {
  zone: Zone;
  view: MapViewData | undefined;
  me: LatLng | null;
  myTeam: Team | null;
  now: number;
}) {
  const [initialRegion] = useState(() => regionFor(zone.center, zone.radiusM, 1.2));
  const live = view?.live ?? [];
  const delayed = view?.delayed ?? [];
  const liveIds = new Set(live.map((p) => p.playerId as string));
  const names = new Map<string, string>([...live, ...delayed].map((p) => [p.playerId as string, p.name]));
  const ping = view?.lastPing;

  return (
    <MapView
      style={StyleSheet.absoluteFill}
      initialRegion={initialRegion}
      userInterfaceStyle="dark"
      customMapStyle={DARK_MAP_STYLE}
      showsPointsOfInterests={false}
      showsCompass={false}
      toolbarEnabled={false}
      pitchEnabled={false}
    >
      <Circle
        center={toCoord(zone.center)}
        radius={zone.radiusM}
        strokeColor={Colors.hunter}
        strokeWidth={3}
        fillColor="rgba(200, 241, 53, 0.06)"
      />

      {ping?.runners
        .filter((r) => !liveIds.has(r.playerId))
        .map((r) => (
          <PingMarker
            key={`ping-${r.playerId}`}
            position={r.position}
            label={`${names.get(r.playerId) ?? "Kaçak"} · ${formatAgo(now - ping.at)}`}
          />
        ))}

      {delayed.map((p) => (
        <PlayerMarker
          key={`d-${p.playerId}`}
          position={p}
          color={teamColor(p.team)}
          label={`${p.name} · ${formatAgo(now - p.at)}`}
          faded
        />
      ))}

      {live
        .filter((p) => !(p.isMe && me))
        .map((p) => (
          <PlayerMarker
            key={`l-${p.playerId}`}
            position={p}
            color={teamColor(p.team)}
            label={p.isMe ? "Sen" : p.name}
            isMe={p.isMe}
          />
        ))}

      {me ? <PlayerMarker key="me" position={me} color={teamColor(myTeam)} label="Sen" isMe /> : null}
    </MapView>
  );
}
