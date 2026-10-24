# Saklambaç — build contract

Working name: **Saklambaç** (placeholder). Real-life, neighbourhood-scale hide-and-seek for 3+ players on foot.
Product reference: `../SCRAM-analiz-raporu.md` (a competitor's feature analysis). Copy mechanics only — never its
name, logo, colours, copy or assets.

Stack: Expo SDK 58 + Expo Router (`src/app/`), Convex 1.48 (`convex/`), `@convex-dev/auth` (email OTP via Resend),
`expo-location` + `expo-task-manager`, `expo-notifications`, `react-native-maps`. Vitest for engine tests.
Read `AGENTS.md`: Expo APIs change per SDK — check versioned docs, don't trust memory.

## Ownership (agents edit only their own paths)

| Area | Paths |
|---|---|
| Engine | `src/engine/**` (except `types.ts`, owned by the lead) |
| Backend | `convex/**` |
| UI | `src/app/**`, `src/components/**`, `src/constants/**`, `src/hooks/**` (except below) |
| Location + push | `src/location/**`, `src/notifications/**`, `app.json` plugin/permission entries |

Shared types live in `src/engine/types.ts`. Ask the lead for changes rather than redefining types elsewhere.

## Engine API (`src/engine/index.ts`) — pure functions, no I/O, `now` always passed in

```ts
generateGameCode(rand?: () => number): string
validateSettings(s: GameSettings): { ok: true } | { ok: false; errors: string[] }
defaultSettings(center: LatLng): GameSettings
hunterRange(playerCount: number): { min: number; max: number } // e.g. 6 → 1..3; never 0 hunters or 0 runners
assignTeams(prefs: { playerId: string; pref: RolePreference }[], rand?: () => number): Record<string, Team> | { error: string }
canStart(players: { team?: Team }[]): { ok: true } | { ok: false; reason: string }
distanceM(a: LatLng, b: LatLng): number // haversine
isInZone(p: LatLng, zone: Zone): boolean
phaseAt(startedAt: number, s: GameSettings, now: number): "headStart" | "hunting" | "over"
nextPingAt(startedAt: number, s: GameSettings, now: number): number | null // pings at headStartEnd + k*interval, k ≥ 1
updateOutOfZone(player: PlayerState, zone: Zone, now: number): PlayerState["outOfZoneSince"]
isExposed(player: PlayerState, now: number): boolean // runner outside zone > OUT_OF_ZONE_GRACE_MS
visibility(viewer: PlayerState, target: PlayerState, s: GameSettings, now: number): Visibility
checkWinner(players: PlayerState[], phase: "headStart" | "hunting" | "over"): Winner | null
```

Visibility rules:

- Self → live.
- Same team, both active → live.
- Viewer is an active hunter, target is an active runner → `live` if exposed, else `pingOnly`.
- Viewer is an active runner, target is a hunter → `hidden`.
- Viewer is tagged → `live` if `taggedSeeLive` else `delayed`. A tagged runner converted to hunter (when `taggedJoinHunters`) is `team: "hunter"`, `status: "active"`.
- Target tagged/left → `hidden`, except to tagged spectators.

## Convex data model (`convex/schema.ts`)

Plus the `authTables` from `@convex-dev/auth`:

- **profiles**: `userId`, `name`, `username`
- **games**: `code` (indexed), `hostId`, `status: GameStatus`, `settings: GameSettings`, `startedAt?`, `endedAt?`, `winner?`, `expiresAt` (createdAt + 7 days)
- **players**: `gameId`, `userId`, `name`, `pref: RolePreference`, `team?`, `status: PlayerStatus`, `ready: boolean`, `pushToken?`, `outOfZoneSince?`, `taggedAt?`. Indexes: `by_game`, `by_game_user`.
- **positions**: latest position per player, upserted (`gameId`, `playerId`, `lat`, `lng`, `at`). Index `by_game`.
- **positionHistory**: append-only, for delayed spectator view and future trails.
- **pings**: `gameId`, `at`, `runners: {playerId, lat, lng}[]`
- **messages**: `gameId`, `team: Team`, `playerId`, `name`, `text`, `at`. Text is profanity-masked server-side.

## Convex functions (UI and location code call exactly these)

**Mutations**
- `games.create({ settings })` → `{ gameId, code }` (caller becomes host + player)
- `games.join({ code })` → `{ gameId }`
- `games.setPref({ gameId, pref })`
- `games.setReady({ gameId, ready })`
- `games.updateSettings({ gameId, settings })`: host only, lobby only
- `games.start({ gameId })`: host only. Assigns teams via the engine, sets `startedAt`, schedules pings and the round end.
- `games.leave({ gameId })`
- `games.confirmTagged({ gameId })`: the runner confirms their own tag
- `locations.report({ gameId, lat, lng, at })`: also updates `outOfZoneSince`
- `messages.send({ gameId, text })`
- `push.registerToken({ gameId, token })`
- `profiles.upsert({ name, username })`

**Queries**
- `games.byId({ gameId })`: game + settings + phase + `nextPingAt` + runner counts
- `games.lobby({ gameId })`: players with pref/ready, `canStart`, `hunterRange`
- `games.myGames()`
- `map.view({ gameId })`: positions filtered by `engine.visibility` for the caller → `{ live: Pos[], delayed: Pos[], lastPing: PingSnapshot | null }`. **Never send data the caller may not see.**
- `messages.list({ gameId })`: caller's team only
- `profiles.me()`

**Internal / scheduled**
- `games.firePing`: writes a ping, sends "Ping!" push to runners and hunters, reschedules itself
- `games.endRound`
- `games.cleanupExpired`: cron, hourly
- `push.send`: Expo push HTTP API

Server time is authoritative: the client shows countdowns computed from `startedAt` + settings returned by the queries.

## Theme (our own)

Dark night palette:

- Background `#0E1116`, surface `#171B22`
- Accent lime `#C8F135` (hunters), cyan `#3DD6F5` (runners)
- Danger `#FF5A5F`
- Bold rounded sans (system font)

Turkish-first UI copy, English as a later add.
