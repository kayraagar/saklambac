# Saklambaç v2: tanıtım turu, sıralama ve ana sayfa (design spec)

Status: design spec, ready to implement · Date: 2026-10-26 · Scope: UX + data design. No code in this doc.

Owner feedback: the app feels bare. Today you sign in and land straight on "Oyun kur / Koda katıl". v2 adds:
1. A first-launch **tanıtım turu** (swipeable slides with cartoon characters).
2. **Stats and leaderboards** (best hunters, most games played, and so on).
3. A real **home page** and a **bottom tab bar**.

Ground rules for every implementer:
- Keep the palette from `src/constants/theme.ts`: bg `#0E1116`, surface `#171B22`, surfaceRaised `#202631`, border `#2A313D`, lime `#C8F135` (avcı), cyan `#3DD6F5` (kaçak), danger `#FF5A5F`.
- **Turkish casing:** never use `textTransform: "uppercase"`. It turns "i" into "I" instead of "İ". Write every label as its final string, for example "En iyi avcılar" or "SIRALAMA" if you really need caps (and type "İ" yourself). P2 also removes the existing `textTransform` from the `label` variant in `src/components/text.tsx`. That is a live bug today.
- Expo SDK 58: check the versioned docs before you touch an API (see `AGENTS.md`). The facts below were checked in `node_modules`:
  - `react-native-svg` is **not installed**. P1 installs it with `npx expo install react-native-svg`.
  - `@expo/vector-icons` is **not installed**. Use `expo-symbols` (installed) and the `sf`/`md` icon props of native tabs.
  - `@react-native-async-storage` is **not installed**. Use `expo-secure-store` (installed) for the tour flag.
  - `expo-router/native-tabs` exists (with `NativeTabs.Trigger`, `Icon sf=… md=…`, `Label`). `expo-router/tabs` (JS tabs) is the fallback.
  - `react-native-reanimated` 4.7 is installed. Use it for all animation.

---

## A. Benchmark

Facts marked † were checked on the web on 2026-10-26: scramhideandseek.com, the Hunting Game App Store page, Strava Local Legends coverage, the Duolingo leagues blog, Clash Royale release notes, and the Pokémon GO medals wiki. The other facts are long-standing, well-known product behaviour.

| Product | Onboarding | Ranking / stats | Home & navigation | Social | Borrow for Saklambaç |
|---|---|---|---|---|---|
| **SCRAM** (closest competitor) | Email code / Google; **demo round against bots**† before playing with friends; join by invite link or 6-char code† | Round-end screen with stats; shareable round card; route history (per our analysis report). No public leaderboard† | Minimal: host / join | Team radio, live teammates, tagged players spectate† | Their rules explainer is clear: zone → head start → pings → in-person tag → win condition†. Our slides follow the same order. A "demo round" is a later idea for us. |
| **Hunting Game** (iOS, real-life manhunt) | Quick **in-game tour**†; consent and age gate at sign-in | **XP + coins after each round** (runner win, hunter catch)†; friend level-up notifications† | Home groups **profile, friends, ways to play**† in one place; widgets and Live Activities for live games† | Friend list, friend and game invites with push† | Reward per action after a round (catch, survive). A home screen that combines "play" with "me". Later: a Live Activity for the active game. |
| **Jet Lag: The Game – Hide and Seek** | No official app†. Fan tools (MapCalipers etc.) are map utilities† | None (the show tracks "time hidden" as the score) | n/a | n/a | **Survival time as the score unit.** It is easy to explain: "You stayed hidden for 23 minutes." |
| **Pokémon GO** | A character guide (Professor Willow) talks you through it; you **play right after avatar setup**†. Later tutorials happen through tasks, not slides† | **Medals with 4 tiers** bronze / silver / gold / platinum on the profile† (e.g. Jogger 10 km → 10,000 km†); km walked | Map-first; a single main-menu ball → Pokédex / Shop / Profile | Friends, gifts, trading | A **mascot narrator** (our phone referee "Düdük"). Tiered medals as a later achievement system. **Distance walked** as a stat. |
| **Ingress** | Story-driven tutorial with a narrator voice | Agent level (AP), **badges** (tiered), many lifetime counters on the agent profile | Scanner (map) + "OPS" menu | Factions, comms chat | A lifetime counter wall on the profile. Two-faction identity (lime vs cyan). |
| **Zombies, Run!** | Account creation, short tutorial† | Distance, duration, pace per run†; a timeline of chase events† | Tab bar: Home / Missions / Base / Codex / Settings† (later simplified) | Little | **Event timeline on the results screen** ("12:04 pinglendin, 18:30 yakalandın"). Keep the tab bar to a few tabs; they cut theirs down. |
| **Strava** | Sport pick → connect friends → first activity | Segment leaderboards; **Local Legend = most efforts in a rolling 90 days, not the fastest**† (rewards consistency); histogram of "how many more to catch #1"† | 5 tabs: Home feed, Maps, Record, Groups, You | Clubs, follows, kudos | **Rank consistency, not only skill** → our "En çok oynayanlar" board. Show "#1'e 3 oyun kaldı". Later: a "Mahalle efsanesi" per area. |
| **Duolingo** | Character-led, playful (Duo + cast); value first, account later; goal picker | **Weekly leagues reset every Sunday**†, ~30-person groups, tiers Bronze→Diamond†; XP; streaks | Bottom tabs: Learn, Leagues, Quests, Profile, Shop | Friends, follow, friend quests | A **weekly reset** keeps the board winnable for newcomers. Characters with strong silhouettes and simple shapes. Show the tour **before** sign-in. A tab dedicated to leagues. |
| **Among Us** | No tutorial slides; **role reveal splash** ("Crewmate" / "Impostor") with a coloured silhouette | Basic lifetime stats page (games, wins per role, tasks) | Lobby-centric | Lobby chat, codes | Stats **split by role** (avcı vs kaçak). A big role-reveal moment uses the team colour and character. |
| **Clash Royale** | Scripted first battles; explains one mechanic at a time | **Trophies: + on win, − on loss**; arenas as floors you can't drop below†; seasonal partial reset† | Swipe tabs: Shop / Cards / Battle (centre) / Clan / Events | Clans, friend leaderboard† | A centre "Battle" CTA = our big "Oyun kur" hero. **Never take points away** (trophy floors) because we are a casual game. Friends leaderboard later. |

### Key takeaways

1. **Characters do the teaching.** Duolingo, Pokémon GO and Among Us all use one strong character per concept. Ours: a lime hunter, a cyan runner, and a phone referee who narrates the pings.
2. **Teach the rules in the order you play them** (SCRAM): zone → head start → ping → in-person tag → who wins. One idea per slide. Show the tour **before** sign-in so value comes before the account (Duolingo).
3. **Rewards only add, are earned per action, and are explainable** (Hunting Game coins, Clash Royale floors). Per round: participation + win + catches (avcı) + minutes survived (kaçak). The points never go down.
4. **A weekly reset plus an all-time board** (Duolingo leagues, Strava). The weekly board keeps newcomers in the race. Ranking by games played rewards consistency, like Strava's Local Legend.
5. **Keep the home screen and tab bar small**: 3 tabs. Play is the hero on the home screen, not a tab (Clash Royale's centre battle; Zombies, Run! cut its tab count). Live game screens cover the tab bar.

Later ideas from the benchmark: demo round against bots (SCRAM), Live Activity / widget for the active game (Hunting Game), tiered medals (Pokémon GO), friends leaderboard (Clash Royale, Duolingo), event timeline (Zombies, Run!), "Mahalle efsanesi" per area (Strava).

---

## B1. Onboarding tour (tanıtım turu)

Do not confuse the two onboarding flows:
- `onboarding.tsx` (existing) is **profile setup** (name + username). Keep it as is.
- `onboarding-tour.tsx` (new) is the **slides**. The flow on first launch is: tour → sign-in → profile setup → home.

### Behaviour

| Item | Spec |
|---|---|
| When | First launch on this install, **before sign-in**. The flag is in SecureStore: key `saklambac.tourSeen.v1`, value `"1"`. |
| Replay | Profile → "Nasıl oynanır" and the home card "Nasıl oynanır?" both open `/how-to-play` (same component, `mode="replay"`). |
| Pager | Horizontal `ScrollView` with `pagingEnabled` (or `FlatList` with `pagingEnabled`). No new pager dependency. Dots are driven by the scroll offset through reanimated `useAnimatedScrollHandler`. |
| Controls | Top right: **"Atla"** (ghost, hidden on the last slide). Bottom: dots + primary button **"İleri"**. On the last slide the button reads **"Başlayalım"** (first run) or **"Tamam"** (replay). Swiping also works. |
| Completion | First run: `markTourSeen()` → the guard flips → the router shows `sign-in` automatically. Replay: `router.back()`. "Atla" does the same as completion. |
| Accessibility | Every slide's SVG gets `accessible accessibilityLabel` describing the scene. Buttons are ≥ 48 pt. Respect `useReducedMotion()` from reanimated: show a static pose, no loops. |
| Layout | Illustration area takes the top ~55% (square, max 320 pt), then the title (`variant="title"`, 28–32 pt) and a single-sentence body (`variant="body"`, `textMuted`). Each slide has a soft radial glow behind the characters in the team colour at 12% opacity. |

### Slides (final Turkish copy)

| # | Title | Body (one sentence) | Characters / pose · scene | Animation |
|---|---|---|---|---|
| 1 | **Mahallen artık oyun alanı** | Saklambaç sokakta, yürüyerek ve koşarak oynanır; telefonun da hakemin olur. | Doğan `idle`, Çevik `idle`, Düdük `idle` stand side by side on a pavement line, with a simple rooftop skyline in `#202631` behind them. | The three pop in staggered (scale 0.6→1, spring, 80 ms apart). Düdük blinks every 3 s. |
| 2 | **Önce kaçaklar dağılır** | Avans süresinde kaçaklar bölgenin içinde saklanır, avcılar ise gözünü kapatıp bekler. | Çevik `run` (left → right) inside a dashed circle (the zone); Doğan `wait` (hands over eyes) at the edge. A countdown ring around the zone. | Çevik bobs (translateY ±4, 400 ms loop). The ring's stroke-dashoffset animates once over 2 s. |
| 3 | **Ping! Konumlar bir anlık görünür** | Avcılar kaçakları yalnızca ping anında haritada görür; aradaki zamanda tahmin etmek gerekir. | Düdük `ping` in the centre emitting rings; three cyan dots on a mini grid map fade in, then fade to 30%. Doğan `look` (binoculars) at the side. | Rings scale 0.4→1.6 with opacity 0.8→0, repeated every 1.6 s. The dots appear in sync with each ring. |
| 4 | **Bölgenin dışına çıkma** | Bölge dışında 30 saniyeden fazla kalan kaçak, avcılara canlı görünür. | Çevik `run` stepping over the dashed zone line; a small danger-coloured "30" badge; Düdük `whistle`. | Çevik slides out, the badge shakes (rotate ±6°), and Çevik turns red-tinted (opacity overlay of danger at 20%). |
| 5 | **Yakala, kaçak onaylasın** | Yakalama yüz yüze olur; yakalanan kaçak bunu kendi telefonundan onaylar. | Doğan `point` touching Çevik's shoulder; Çevik `caught` (arms up, eyes closed); a lime check badge above. | Doğan slides in, then the check badge pops (scale 0→1.2→1). |
| 6 | **Puan topla, zirveye çık** | Her oyun puan kazandırır; haftalık sıralamada mahallenin en iyisi sen ol. | A podium with three steps: Doğan `cheer` on #1, Çevik `cheer` on #2, Düdük on #3 holding a trophy. | The podium rises (translateY 40→0), then the characters jump in place (±6 every 900 ms). |

`accessibilityLabel` examples: "Avcı Doğan, kaçak Çevik ve hakem telefon Düdük yan yana duruyor." / "Hakem telefon ping atıyor, haritada üç kaçak noktası beliriyor."

### Character design brief

Style: flat, geometric, chunky. No outlines except a 3 pt dark (`#0E1116`) stroke on the outer silhouette so the characters stand out on the dark background. Two tones per character: the base colour, plus a 15% darker shade for the far limbs and shadows. Eyes are always the same: a white oval (`#F2F4F7`) with a `#0E1116` pupil circle and a 1.5 r white highlight dot. No mouths except in emotional poses (simple arc path).

All characters use **viewBox `0 0 200 200`**, the ground line at y = 184, and are drawn facing right. A mirror is `transform="scale(-1,1) translate(-200,0)"`. Every part is a `<G>` so poses only move or rotate groups (`rotation` + `originX/originY`), which makes reanimated `useAnimatedProps` easy to wire.

#### 1. Doğan, the hunter (lime `#C8F135`, shade `#9DBF1F`)

| Part | Shape (react-native-svg) |
|---|---|
| Body | Bean: `Rect x=60 y=70 w=80 h=100 rx=40` |
| Cap | Half-circle dome `Path d="M58 78 A42 42 0 0 1 142 78 Z"` in shade colour + visor `Rect x=120 y=72 w=36 h=10 rx=5` (the visor points the way he faces) |
| Eyes | Two ovals `Ellipse cx=92/116 cy=98 rx=9 ry=11`; **angled brows** `Rect w=18 h=5 rx=2.5` rotated ±12° above the eyes: a determined look |
| Arms | Capsules `Rect w=16 h=46 rx=8`, pivot at the shoulder (x=64/136, y=112) |
| Legs | Capsules `Rect w=18 h=26 rx=9` at x=78 and x=104, y=160; shoes are `Ellipse rx=14 ry=7` in `#202631` |
| Prop | Binoculars: two `Circle r=9` + `Rect` bridge in `#202631`, lens highlight in `#3A4352` |

Silhouette test: the cap visor plus the bean body must read clearly as a shape filled with a single colour.

Poses: `idle` (arms down), `wait` (both arms rotated up −150° so the hands cover the eyes, brows hidden), `look` (binoculars at the eyes, one arm up), `point` (front arm rotated −80° straight forward, back arm down), `cheer` (both arms −160°, mouth arc open).

#### 2. Çevik, the runner (cyan `#3DD6F5`, shade `#22A9C7`)

| Part | Shape |
|---|---|
| Body | Egg / teardrop leaning forward: `Path d="M100 62 C140 62 150 120 140 150 C132 172 68 172 60 150 C50 120 60 62 100 62 Z"` rotated 8° forward |
| Hood ears | Two small rounded triangles on top: `Path d="M78 70 L84 48 L96 64 Z"` and `M104 64 L116 46 L122 70 Z` (a fox-hoodie hint, the key silhouette feature) |
| Headband | `Rect x=62 y=88 w=76 h=8 rx=4` in shade + **two trailing ribbons** behind (`Path` with a 2-segment zigzag, rotating ±10° in the run loop) |
| Eyes | Same oval eyes, slightly wider apart (cx 90/114, cy 104), brows raised (curious, sneaky) |
| Legs | Capsules `Rect w=16 h=30 rx=8`. In `run`, front leg +35° and back leg −40°; shoes are `Ellipse` in `#F2F4F7` (white sneakers = speed) |
| Arms | Short capsules `w=14 h=36` |

Poses: `idle`, `run` (body tilt 12°, legs split, arms opposite, ribbons streaming), `hide` (peeking: the body is clipped by a `#202631` wall or bush rect on the left with a `ClipPath`, only the eyes and one ear visible), `caught` (arms straight up, eyes as `^ ^` arcs, small sweat drop `Path` in white), `cheer`.

#### 3. Düdük, the referee phone (body `#202631`, screen `#0E1116`, accent lime + cyan)

| Part | Shape |
|---|---|
| Body | Phone `Rect x=62 y=40 w=76 h=136 rx=18` in `#202631`, 3 pt border `#2A313D` |
| Screen | `Rect x=70 y=52 w=60 h=104 rx=10` in `#0E1116`; the face is drawn **on the screen**: two lime pill eyes `Rect w=10 h=16 rx=5`, mouth arc |
| Referee touch | A whistle on a lanyard: a `Circle r=7` plus a `Rect` mouthpiece in `#F2F4F7`, hung on a `Path` cord; a thin stripe bar at the top of the screen (black/white `Rect`s): a "hakem" hint |
| Limbs | Thin noodle arms/legs `Path` with stroke 6, `strokeLinecap="round"`, colour `#9AA3B2` |

Poses: `idle` (holds a stopwatch: `Circle r=12` + crown `Rect`), `ping` (the screen shows a cyan radar: 3 concentric `Circle` strokes + a sweep `Path`; the rings are the animated layer), `whistle` (the whistle is raised to the screen mouth, cheeks = 2 lime circles, 3 short "sound" lines), `trophy` (holds a lime cup made of `Path`).

Component API (P1 builds; P2 may import):

```ts
// src/components/characters/index.ts
export type HunterPose = "idle" | "wait" | "look" | "point" | "cheer";
export type RunnerPose = "idle" | "run" | "hide" | "caught" | "cheer";
export type RefereePose = "idle" | "ping" | "whistle" | "trophy";
type CharacterProps<P> = { pose?: P; size?: number /* px, default 160 */; animated?: boolean /* default true */; mirrored?: boolean };
export function Hunter(props: CharacterProps<HunterPose>): JSX.Element;   // "Doğan"
export function Runner(props: CharacterProps<RunnerPose>): JSX.Element;   // "Çevik"
export function Referee(props: CharacterProps<RefereePose>): JSX.Element; // "Düdük"
export function Avatar(props: { name: string; team?: "hunter" | "runner" | null; size?: number }): JSX.Element; // initial in a circle, ring in team colour
```

---

## B2. Stats and leaderboard system

### What to record (per finished game, per player)

Record it in the same transaction that ends the game: inside `finishGame()` in `convex/games.ts`, right after `ctx.db.patch(game._id, { status: "ended", … })`. Every end path goes through there: `endRound`, `maybeFinish` from `confirmTagged`, `leave` during play, and `locations.report` if it calls `maybeFinish`. The early `if (game.status === "ended") return` makes it **idempotent**. Lobby abandonments (`leave` with no `startedAt`) are skipped because they never reach `finishGame`.

Derivations from the existing data (no schema change to `players` needed):

| Field | Derivation |
|---|---|
| `startTeam` | `p.taggedAt !== undefined ? "runner" : p.team`. Only runners can be tagged, so a tagged player is a runner even if they were converted to hunter. |
| `endTeam` | `p.team` |
| `outcome` | `"win"` if (`endTeam === "hunter"` and `winner === "hunters"`) or (`endTeam === "runner"` and `winner === "runners"`), else `"loss"` |
| `huntStart` | `engine.headStartEndAt(game.startedAt, game.settings)` |
| `survivedMs` (runner start only) | `clamp((p.taggedAt ?? endedAt) − huntStart, 0, settings.roundMs)` |
| `tagsMade` (team credit) | Count the players `r` with `r.taggedAt !== undefined` where *p was a hunter at `r.taggedAt`*. That is: `startTeam(p) === "hunter"`, or (`p.team === "hunter"` and `p.taggedAt < r.taggedAt`). **The current game does not record who made the tag** (the runner confirms their own tag), so every hunter on the team gets credit for every catch. This is labelled "Takım yakalaması" in the UI. Later: an optional "Seni kim yakaladı?" picker in `confirmTagged` gives individual credit. |
| `distanceM` | Optional, filled later by `internal.stats.computeDistance` (see below). `null` until then. |
| Skipped | Players with `status === "left"` get no row: leaving forfeits the game. |

`ranked = activePlayerCountAtEnd >= 3 && (endedAt − huntStart) >= 5 * 60_000`. Unranked games are stored for history with `points: 0` and are excluded from boards. This stops quick 2-player farming. `hunterRange` allows 2-player games.

### Points formula (simple, never negative)

Pure function in `src/engine/points.ts` (new file, P1, with vitest tests). Convex imports it directly as `../src/engine/points`. Do not edit `src/engine/index.ts`.

| Line item (`key`) | Turkish label | Points | Role bucket |
|---|---|---|---|
| `played` | Oyunu tamamladın | **+10** | `startTeam` |
| `win` | Takımın kazandı | **+50** | `endTeam` |
| `tags` | Takım yakalaması ×N | **+20 each** | hunter |
| `survival` | Hayatta kalma (dk) | **+3 per full minute** of `survivedMs` | runner |
| `survivor` | Sona kadar yakalanmadın | **+30** (runner still `active` at the end) | runner |

`points = sum`. Also `hunterPoints` = the sum of hunter-bucket items, and `runnerPoints` = the sum of runner-bucket items. If the game is unranked, everything is 0 and the breakdown is still returned for display, with the note "Bu oyun sıralamaya sayılmadı".

Examples:
- A 45-minute game; a runner caught at minute 20 whose team still won: 10 + 50 + 60 = **120**.
- A hunter in a team that caught 3 out of 4 runners and lost: 10 + 60 = **70**.
- A runner who survived the full 45 minutes and won: 10 + 50 + 135 + 30 = **225**.

Explainer sheet copy (the leaderboard "?" button), titled **"Puanlar nasıl hesaplanır?"**:
- Her tamamlanan oyun: +10
- Takımın kazanırsa: +50
- Avcıyken takımının her yakalaması: +20
- Kaçakken hayatta kaldığın her dakika: +3
- Sona kadar yakalanmazsan: +30
- 3'ten az oyunculu ya da 5 dakikadan kısa oyunlar sıralamaya sayılmaz.

### Aggregation choice

**Write-time aggregates.** Computed queries would need to scan every game, and `cleanupExpired` deletes `players` after 7 days anyway, so the history must be copied out at game end.

- `gameResults` holds one immutable row per (game, user). It is never deleted by `cleanupExpired` and holds no locations.
- `playerStats` holds one row per user, all-time totals.
- `weeklyStats` holds one row per (user, week). "Bu hafta" resets by key, so no cron is needed.

Week key: ISO week in Turkey time (fixed UTC+3; Turkey has had no DST since 2016). `weekKey(ms) → "2026-W44"`. The week starts **Monday 00:00 TR**. Put it in `src/engine/points.ts` as `weekKeyTR(ms)` and `weekEndsAtTR(ms)`, with tests.

### Convex schema additions (`convex/schema.ts`)

```ts
// validators.ts may get: export const outcomeV = v.union(v.literal("win"), v.literal("loss"));
gameResults: defineTable({
  gameId: v.id("games"),          // game row may be deleted later; id kept for reference
  userId: v.id("users"),
  code: v.string(),
  endedAt: v.number(),
  weekKey: v.string(),
  startTeam: teamV,
  endTeam: teamV,
  outcome: v.union(v.literal("win"), v.literal("loss")),
  winner: winnerV,
  ranked: v.boolean(),
  tagsMade: v.number(),
  survivedMs: v.number(),         // 0 for start-hunters
  survivedToEnd: v.boolean(),
  durationMs: v.number(),         // endedAt - startedAt
  playerCount: v.number(),
  points: v.number(),
  hunterPoints: v.number(),
  runnerPoints: v.number(),
  breakdown: v.array(v.object({ key: v.string(), label: v.string(), points: v.number() })),
  distanceM: v.optional(v.number()),
})
  .index("by_user_endedAt", ["userId", "endedAt"])
  .index("by_game", ["gameId"])
  .index("by_game_user", ["gameId", "userId"]),

playerStats: defineTable({
  userId: v.id("users"),
  listed: v.boolean(),            // leaderboard opt-out mirror
  gamesPlayed: v.number(),        // ranked + unranked finished games
  rankedGames: v.number(),
  wins: v.number(),
  hunterGames: v.number(), hunterWins: v.number(),
  runnerGames: v.number(), runnerWins: v.number(),
  tagsMade: v.number(),
  survivedMs: v.number(),
  bestSurvivalMs: v.number(),
  distanceM: v.number(),
  points: v.number(), hunterPoints: v.number(), runnerPoints: v.number(),
  lastPlayedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_listed_points", ["listed", "points"])
  .index("by_listed_hunterPoints", ["listed", "hunterPoints"])
  .index("by_listed_runnerPoints", ["listed", "runnerPoints"])
  .index("by_listed_gamesPlayed", ["listed", "gamesPlayed"]),

weeklyStats: defineTable({
  userId: v.id("users"),
  weekKey: v.string(),
  listed: v.boolean(),
  gamesPlayed: v.number(), wins: v.number(), tagsMade: v.number(), survivedMs: v.number(),
  points: v.number(), hunterPoints: v.number(), runnerPoints: v.number(),
})
  .index("by_user_week", ["userId", "weekKey"])
  .index("by_week_listed_points", ["weekKey", "listed", "points"])
  .index("by_week_listed_hunterPoints", ["weekKey", "listed", "hunterPoints"])
  .index("by_week_listed_runnerPoints", ["weekKey", "listed", "runnerPoints"])
  .index("by_week_listed_gamesPlayed", ["weekKey", "listed", "gamesPlayed"]),
```

`profiles` gets `hideFromLeaderboard: v.optional(v.boolean())`. It is optional, so existing rows stay valid. It is the source of truth for `listed`.

Names and usernames are **not** denormalised. The leaderboard query reads `profiles.by_user` for each of ≤ 50 rows, so renames show up immediately.

### Functions (`convex/stats.ts`, new)

| Name | Kind | Args | Returns / effect |
|---|---|---|---|
| `recordGameResults(ctx, game, winner, now)` | **plain helper** (exported TS function), called from `finishGame` | — | Inserts `gameResults` per non-left player; upserts `playerStats` + `weeklyStats` (only `ranked` rows add points; `gamesPlayed` counts every row); then `ctx.scheduler.runAfter(0, internal.stats.computeDistance, { gameId })` |
| `computeDistance` | internalMutation | `{ gameId }` | For each result row: read `positionHistory.by_player_at` for the player (`take(5000)`), sum `engine.distanceM` between consecutive points, skip segments faster than 8 m/s or longer than 300 m (GPS jumps), patch `gameResults.distanceM`, and add it to `playerStats.distanceM`. Runs within seconds, long before the 7-day cleanup. |
| `mine` | query | `{}` | `MyStats` (below). Zeros if there is no row yet. |
| `leaderboard` | query | `{ board: Board, window: Window, limit?: number /* default 50, max 100 */ }` | `LeaderboardResult` |
| `forGame` | query | `{ gameId }` | `GameResultView \| null` (null if the caller has no row, e.g. they left) |
| `recentResults` | query | `{ limit?: number /* default 20 */ }` | `RecentResult[]`, newest first, via `by_user_endedAt` desc |
| `setListed` | mutation | `{ listed: boolean }` | Patches `profiles.hideFromLeaderboard = !listed`, the `playerStats.listed` row, and **all** of the user's `weeklyStats` rows (`by_user_week`, which is bounded) |
| `backfill` | internalMutation | `{}` | One-off: for ended games still in the DB (≤ 7 days) without `gameResults` rows, call `recordGameResults`. Run once from the dashboard. |

`games.ts` change (the only edit there): `import { recordGameResults } from "./stats"` and one line in `finishGame` after the patch, `await recordGameResults(ctx, { ...game, status: "ended", endedAt: now, winner }, winner, now);`.

Rank computation: Convex has no `COUNT`. To get my rank, query the same index with `.gt(field, myValue)` and `.take(1000)`, then `rank = n + 1`. If `n === 1000`, return `rank: null` and show "1000+". Ties share a rank (competition ranking: 1, 2, 2, 4). Rows with value 0 are excluded from boards with `.gt(field, 0)`.

### Return shapes (the P1 ↔ P2 contract)

```ts
type Board = "points" | "hunter" | "runner" | "games";
type Window = "week" | "all";

type MyStats = {
  listed: boolean;
  all:  { gamesPlayed: number; wins: number; winRate: number /*0..1*/; hunterGames: number; runnerGames: number;
          tagsMade: number; survivedMs: number; bestSurvivalMs: number; distanceM: number;
          points: number; hunterPoints: number; runnerPoints: number; rank: number | null };
  week: { weekKey: string; endsAt: number; gamesPlayed: number; wins: number; points: number; rank: number | null };
};

type LeaderboardRow = { rank: number; userId: Id<"users">; name: string; username: string;
                        value: number; gamesPlayed: number; isMe: boolean };
type LeaderboardResult = { board: Board; window: Window; weekKey: string; endsAt: number | null;
                           rows: LeaderboardRow[]; me: LeaderboardRow | null /* null if unlisted or no games */ };

type GameResultView = { points: number; ranked: boolean; outcome: "win" | "loss";
                        startTeam: Team; endTeam: Team; tagsMade: number; survivedMs: number;
                        distanceM: number | null; breakdown: { key: string; label: string; points: number }[];
                        week: { points: number; rank: number | null } };

type RecentResult = { gameId: Id<"games">; code: string; endedAt: number; startTeam: Team; endTeam: Team;
                      outcome: "win" | "loss"; points: number; ranked: boolean; tagsMade: number;
                      survivedMs: number; distanceM: number | null; playerCount: number };
```

`value` per board: `points` → points, `hunter` → hunterPoints, `runner` → runnerPoints, `games` → gamesPlayed.

### Leaderboards shown

| Board key | Turkish title | Unit shown | Colour |
|---|---|---|---|
| `points` | Genel sıralama | "puan" | text |
| `hunter` | En iyi avcılar | "puan" (avcı) | lime |
| `runner` | En iyi kaçaklar | "puan" (kaçak) | cyan |
| `games` | En çok oynayanlar | "oyun" | text |

Windows: **Bu hafta** (default) and **Tüm zamanlar**.

Scope: **Herkes** (v2). An **Arkadaşlar** chip is visible but disabled with the label "Yakında". It needs a `friendships` table later.

### Privacy

- Leaderboards show the **name + @username only**. Never email, location, area or game codes.
- Opt-out: Profile → "Sıralamada görün" toggle (default on) → `stats.setListed`. When off, you disappear from every board immediately, but you still see your own stats and rank as "Gizli".
- `gameResults` stores no coordinates. `distanceM` is a single number. Raw `positionHistory` still expires after 7 days as before.
- Later: delete stats on account deletion.

### Badges / achievements (later, list only)

- **İlk av**: your first catch.
- **Hayalet**: survive a full game without ever being exposed out of the zone.
- **Seri avcı**: 5 team catches in one game.
- **Maratoncu**: 10 / 50 / 100 km in total (bronze / silver / gold tiers).
- **Haftanın avcısı** / **Haftanın kaçağı**: finish #1 on a weekly board.
- **Sadık oyuncu**: play in 4 weeks in a row (a streak).
- **Mahalle efsanesi**: the most games in one area in 90 days.
- **Kurucu**: host 10 games.
- **Kalabalık**: play a game with 10+ players.

---

## B3. Information architecture

### Tab bar (3 tabs)

| Tab | Label | iOS SF Symbol (`sf`) | Android (`md`) | Holds |
|---|---|---|---|---|
| `index` | **Ana sayfa** | `house` / `house.fill` | `home` | Hero CTAs, active game resume, my week strip, mini leaderboard, how-to-play, last games |
| `leaderboard` | **Sıralama** | `trophy` / `trophy.fill` | `emoji_events` | 4 boards × 2 windows, my row pinned, points explainer |
| `profile` | **Profil** | `person.crop.circle` / `person.crop.circle.fill` | `account_circle` | My stats, recent games, settings, sign out |

Implementation: `NativeTabs` from `expo-router/native-tabs`. The props are confirmed in `node_modules` as `NativeTabs.Trigger` with `Icon sf={{default, selected}} md=…` and `Label`. Set the tint to `Colors.hunter`, use a dark background, and keep labels always visible. If it misbehaves on Android in SDK 58, fall back to `Tabs` from `expo-router/tabs` with a `tabBarIcon` that renders `SymbolView` (expo-symbols). Check the SDK 58 docs to confirm `SymbolView` on Android; otherwise use a small inline SVG icon. Play is **not** a tab: "Oyun kur" is the home hero.

### Where things sit

```
Root Stack (src/app/_layout.tsx, AuthGate)
├─ [guard firstRun]      onboarding-tour          (slides, no header)
├─ [guard signedOut]     sign-in
├─ [guard needsProfile]  onboarding               (profile setup, unchanged)
└─ [guard inApp]
   ├─ (tabs)             ← NativeTabs: index · leaderboard · profile
   ├─ host               (push, header "Oyun kur")
   ├─ join               (push, header "Koda katıl")
   ├─ how-to-play        (modal, same tour component, mode="replay")
   └─ game/[id]          (full-screen stack above tabs: lobby / play / results / radio / settings)
```

Guards:
- `firstRun = tourSeen === false`
- `signedOut = !firstRun && (existing signedOut)`
- `needsProfile` and `inApp` are unchanged, but also require `!firstRun`. A signed-in user who reinstalls sees the tour once (fine), and the guard then flips.
- Splash: wait until `tourSeen !== undefined` as well.

Existing navigation keeps working:
- `router.dismissTo("/")` (results) and `router.replace("/")` (game ErrorBoundary) resolve to `(tabs)/index`.
- `gameRoute()` in `src/lib/routes.ts` is unchanged.
- `src/app/index.tsx` must be **deleted** (moved to `(tabs)/index.tsx`), or the two `/` routes conflict.

### Expo Router file tree (new)

```
src/app/
├─ _layout.tsx                 P2  (edit: (tabs), tour gate, how-to-play screen)
├─ onboarding-tour.tsx         P1  NEW  first-run slides
├─ how-to-play.tsx             P1  NEW  replay (modal)
├─ sign-in.tsx                 —   unchanged
├─ onboarding.tsx              —   unchanged (profile setup)
├─ host.tsx                    —   unchanged
├─ join.tsx                    —   unchanged
├─ index.tsx                   P2  DELETE (moved)
├─ (tabs)/
│  ├─ _layout.tsx              P2  NEW  NativeTabs
│  ├─ index.tsx                P2  NEW  Ana sayfa
│  ├─ leaderboard.tsx          P1  NEW  Sıralama
│  └─ profile.tsx              P2  NEW  Profil
└─ game/[id]/…                 —   unchanged, except results.tsx (P1)
```

---

## B4. Wireframes

### Onboarding slide (1 of 6)

```
┌──────────────────────────────────┐
│                           Atla   │  ghost, textMuted
│                                  │
│        ░░░ soft lime glow ░░░    │
│     ╭───╮    ╭─╮    ┌────┐       │
│     │◉ ◉│   /◉ ◉\   │ ◕◕ │       │  Doğan · Çevik · Düdük
│     ╰─┬─╯   ╲___╱   └─┬──┘       │
│   ▁▁▁▁┴▁▁▁▁▁▁▁┴▁▁▁▁▁▁▁┴▁▁▁▁▁     │  pavement + skyline
│                                  │
│  Mahallen artık oyun alanı       │  title 30pt
│  Saklambaç sokakta, yürüyerek    │  body textMuted
│  ve koşarak oynanır; telefonun   │
│  da hakemin olur.                │
│                                  │
│        ● ○ ○ ○ ○ ○               │  dots (active = lime pill 18×6)
│  ┌────────────────────────────┐  │
│  │           İleri            │  │  primary (lime)
│  └────────────────────────────┘  │  last slide: "Başlayalım" / "Tamam"
└──────────────────────────────────┘
```

### Ana sayfa

```
┌──────────────────────────────────┐
│ Merhaba,                    (K)  │  Avatar → Profil tab
│ Kayra                            │  title
│                                  │
│ ┌──────────────────────────────┐ │  ACTIVE GAME CARD (only if a non-ended game)
│ │● Av sürüyor        K7Q2FX    │ │  left border in team colour
│ │ Kaçaksın · 3/4 kaçak serbest │ │
│ │                  Devam et ›  │ │  → gameRoute(id, phaseForStatus)
│ └──────────────────────────────┘ │
│ ┌──────────────────────────────┐ │  HERO (surface, radius lg)
│ │   [Doğan look]  [Çevik hide] │ │  characters 96px
│ │   Bugün kim saklanıyor?      │ │  heading
│ │ ┌──────────────────────────┐ │ │
│ │ │        Oyun kur          │ │ │  primary lime → /host
│ │ └──────────────────────────┘ │ │
│ │ ┌──────────────────────────┐ │ │
│ │ │       Koda katıl         │ │ │  runner cyan → /join
│ │ └──────────────────────────┘ │ │
│ └──────────────────────────────┘ │
│ Bu haftan                        │  label
│ ┌──────┬──────┬──────┬──────┐    │  stat tiles (stats.mine().week)
│ │ 245  │  4   │  2   │ #12  │    │
│ │ puan │ oyun │galib.│ sıra │    │  rank null → "—"; hidden → "Gizli"
│ └──────┴──────┴──────┴──────┘    │
│ Bu haftanın avcıları   Tümü ›    │  → Sıralama tab (board=hunter, week)
│ ┌──────────────────────────────┐ │  stats.leaderboard({board:"hunter",window:"week",limit:3})
│ │ 1  Elif   @elif        320   │ │
│ │ 2  Mert   @mert        280   │ │
│ │ 3  Kayra  @kayra (sen) 245   │ │  isMe row tinted
│ └──────────────────────────────┘ │  empty: "Bu hafta henüz oyun yok. İlk sen ol!"
│ ┌──────────────────────────────┐ │
│ │ [Düdük whistle] Nasıl oynanır?│ │  → /how-to-play
│ │ Kuralları 1 dakikada öğren ›  │ │
│ └──────────────────────────────┘ │
│ Son oyunlar                      │  label; last 3 ended (games.myGames)
│  K7Q2FX · Avcılar kazandı · Avcı │
├──────────────────────────────────┤
│  ⌂ Ana sayfa   🏆 Sıralama  ◯ Profil │
└──────────────────────────────────┘
```

Empty first-time state: hide "Bu haftan" and the mini leaderboard if `mine().all.gamesPlayed === 0`. Show instead a card with `[Çevik run]`: "İlk oyununu oyna, puanların burada görünsün."

### Sıralama

```
┌──────────────────────────────────┐
│ Sıralama                     (?) │  ? → "Puanlar nasıl hesaplanır?" sheet
│ [ Bu hafta | Tüm zamanlar ]      │  Segmented (existing component)
│ (Genel) (Avcılar) (Kaçaklar) (Oyun)│  chips, horizontal scroll; active chip in board colour
│ (Herkes) (Arkadaşlar · Yakında)  │  scope chips; second disabled
│ Sıfırlanmaya 3 gün 4 sa          │  caption, week only (endsAt)
│ ┌──────────────────────────────┐ │  PODIUM top 3
│ │   [2]      [1]      [3]      │ │  Avatar circles, #1 larger with crown
│ │  Mert     Elif     Can       │ │
│ │  280      320      210       │ │
│ └──────────────────────────────┘ │
│  4  Deniz  @deniz         190    │  FlatList rows 4..50
│  5  Ayşe   @ayse          175    │
│  …                               │
├──────────────────────────────────┤
│ #12  Sen  @kayra   245 puan      │  pinned "me" bar (if me && rank > visible)
├──────────────────────────────────┤
│  ⌂ Ana sayfa   🏆 Sıralama  ◯ Profil │
└──────────────────────────────────┘
```

- Unit labels: "puan", or "oyun" for the games board.
- Empty state: `[Referee trophy]` "Bu hafta henüz kimse puan almadı. Bir oyun kur, zirve senin olsun."
- Unlisted user: the pinned bar reads "Sıralamada gizlisin · Profil'den açabilirsin".

### Profil

```
┌──────────────────────────────────┐
│        (  K  )                   │  Avatar 72, ring lime/cyan by most-played role
│        Kayra                     │  title
│        @kayra                    │  caption
│ ┌──────┬──────┬──────┐           │  stats.mine().all
│ │ 1.240│  18  │ %56  │           │
│ │ puan │ oyun │galib.│           │
│ ├──────┼──────┼──────┤           │
│ │  23  │ 31 dk│ 12,4 │           │
│ │yakal.│en uzun│ km  │           │  "Takım yakalaması", "En uzun kaçış", "Mesafe"
│ └──────┴──────┴──────┘           │
│ Avcı ███████░░░ Kaçak            │  role split bar (hunterGames vs runnerGames)
│ 10 oyun · 640 p   8 oyun · 600 p │
│ Son oyunlar                      │  stats.recentResults({limit:10})
│  ● Kazandın · Kaçak · +225  K7Q2 │  left dot in startTeam colour
│  ● Kaybettin · Avcı · +70   M3PX │  unranked → "Sayılmadı"
│ Ayarlar                          │  label
│  Sıralamada görün          [on]  │  ToggleRow → stats.setListed
│  Nasıl oynanır               ›   │  → /how-to-play
│  Çıkış yap                       │  danger text, confirm Alert:
│                                  │  "Çıkış yapılsın mı?" [Vazgeç] [Çıkış yap]
│  Sürüm 1.0.0                     │  caption (expo-constants)
├──────────────────────────────────┤
│  ⌂ Ana sayfa   🏆 Sıralama  ◯ Profil │
└──────────────────────────────────┘
```

Formatting:
- Thousands separator: `toLocaleString("tr-TR")`.
- Win rate: "%56" (Turkish puts the percent sign first).
- Distance: "12,4 km" with a comma; "—" while null.
- Durations: "31 dk".

### Sonuç (results), updated

```
┌──────────────────────────────────┐
│ Sonuç                            │
│      [Çevik cheer]  or [caught]  │  character by personal outcome
│      Kaçaklar kazandı            │  title, winner colour
│      Hayatta kaldın!             │  heading (existing personalResult)
│ ┌──────────────────────────────┐ │
│ │          +225 puan           │ │  big number, count-up animation 0→N (600ms)
│ │ Oyunu tamamladın        +10  │ │  breakdown from stats.forGame
│ │ Takımın kazandı         +50  │ │
│ │ Hayatta kalma (45 dk)  +135  │ │
│ │ Sona kadar yakalanmadın +30  │ │
│ │ ──────────────────────────── │ │
│ │ Bu hafta: 470 puan · #7      │ │
│ └──────────────────────────────┘ │
│ ┌──────────────────────────────┐ │  existing stat card (unchanged)
│ │ Takımın           Kaçak      │ │
│ │ Hayatta kalan kaçak  2/4     │ │
│ │ …                            │ │
│ └──────────────────────────────┘ │
│ ┌────────────┐ ┌───────────────┐ │
│ │ Sıralama   │ │  Ana sayfa    │ │  secondary → router.dismissTo("/leaderboard"); primary → dismissTo("/")
│ └────────────┘ └───────────────┘ │
└──────────────────────────────────┘
```

- Unranked: the number is greyed, with the caption "Bu oyun sıralamaya sayılmadı (en az 3 oyuncu ve 5 dakika gerekir)."
- `forGame` null (the player left): hide the points card.
- Distance: if `distanceM` arrives later, the query updates reactively and adds the row "Yürüdüğün mesafe 1,8 km" (info only, 0 points).

---

## B5. Implementation split (no overlapping files)

### P1: tour + characters + stats backend + leaderboard screen + results points

| File | Action |
|---|---|
| `package.json`, lockfile | `npx expo install react-native-svg`. **Only P1 touches these.** |
| `convex/schema.ts` | Add `gameResults`, `playerStats`, `weeklyStats`; add `profiles.hideFromLeaderboard?` |
| `convex/validators.ts` | Optional `outcomeV` |
| `convex/stats.ts` | NEW: everything in B2 |
| `convex/games.ts` | Import + one call in `finishGame` (no other changes) |
| `src/engine/points.ts`, `src/engine/__tests__/points.test.ts` | NEW: `scoreGame()`, `weekKeyTR()`, `weekEndsAtTR()` |
| `src/components/characters/{index.ts,hunter.tsx,runner.tsx,referee.tsx,avatar.tsx,parts.tsx}` | NEW |
| `src/components/onboarding-tour.tsx` | NEW: pager + slides, prop `mode: "firstRun" \| "replay"` |
| `src/lib/tour.ts` | NEW: SecureStore flag + subscription |
| `src/app/onboarding-tour.tsx`, `src/app/how-to-play.tsx` | NEW: thin route wrappers |
| `src/app/(tabs)/leaderboard.tsx` | NEW |
| `src/components/leaderboard/{podium.tsx,leaderboard-row.tsx,points-sheet.tsx}` | NEW |
| `src/app/game/[id]/results.tsx` | Edit: points card + "Sıralama" button |
| `CONTRACT.md` | Append the "Stats" section (functions + shapes from B2) |

### P2: tabs + home + profile

| File | Action |
|---|---|
| `src/app/_layout.tsx` | Edit: replace `index` with `(tabs)`; add the `onboarding-tour` (firstRun guard) and `how-to-play` (inApp, `presentation: "modal"`, `headerShown: false`) screens; splash waits for `useTourSeen()` |
| `src/app/index.tsx` | DELETE |
| `src/app/(tabs)/_layout.tsx` | NEW: NativeTabs, 3 triggers (`index`, `leaderboard`, `profile`) |
| `src/app/(tabs)/index.tsx` | NEW: Ana sayfa |
| `src/app/(tabs)/profile.tsx` | NEW: Profil |
| `src/components/home/{active-game-card.tsx,stat-tile.tsx,mini-leaderboard.tsx,how-to-play-card.tsx,game-row.tsx}` | NEW (move `GameRow` here from the old index) |
| `src/components/text.tsx` | Edit: remove `textTransform: "uppercase"` from `label` (Turkish casing fix) |

No file appears in both lists. `src/components/{button,card,segmented,toggle-row,screen}.tsx` are **read-only** for both packages. If a variant is missing, compose locally instead of editing.

### Interface between P1 and P2

| P2 uses | Provided by P1 | Contract |
|---|---|---|
| Tour gate in the root layout | `src/lib/tour.ts` | `useTourSeen(): boolean \| undefined` (undefined while SecureStore loads; reactive via `useSyncExternalStore`), `markTourSeen(): Promise<void>`, `resetTour(): Promise<void>` (dev only). Key `saklambac.tourSeen.v1`. |
| Route names | P1 route files | `onboarding-tour` (first run; P1 calls `markTourSeen()` and does **not** navigate, the guard does), `how-to-play` (replay; P1 calls `router.back()`), `(tabs)/leaderboard` (P2's tab layout declares the trigger `name="leaderboard"`). Optional search params on leaderboard: `?board=hunter&window=week` (strings matching `Board`/`Window`; P1 reads them via `useLocalSearchParams` and they default to `points`/`week`). |
| Home/profile data | `convex/stats.ts` | `api.stats.mine({})` → `MyStats`; `api.stats.leaderboard({board, window, limit})` → `LeaderboardResult`; `api.stats.recentResults({limit})` → `RecentResult[]`; `api.stats.setListed({listed})` → `null`. Shapes are in B2. Errors are `ConvexError` with Turkish `err.data`, as elsewhere. |
| Illustrations | `@/components/characters` | `Hunter`, `Runner`, `Referee`, `Avatar` (API in B1). |
| Existing | already there | `api.games.myGames` (active game card + last games), `api.profiles.me`, `gameRoute`/`phaseForStatus`. |

Ordering:
- **P1 lands `convex/schema.ts` + `convex/stats.ts` + `src/lib/tour.ts` + `src/components/characters/index.ts` first (milestone P1a).** After that, `api.stats.*` types exist and P2 typechecks.
- Until then, P2 may stub with `useQuery(api.stats.mine)`-shaped local mocks and a placeholder `View` for characters, but it must not create any of P1's files.
- The leaderboard tab trigger needs P1's `leaderboard.tsx` to exist at merge time. If P2 merges first, it ships with a temporary 2-tab layout.

### Acceptance checklist

- First install → 6 slides → "Başlayalım" → sign-in. Killing the app mid-tour shows it again. After completion it never shows again. Profile → "Nasıl oynanır" replays it as a modal.
- Finishing a 3+ player game of 5+ minutes writes one `gameResults` row per non-left player. `playerStats` and `weeklyStats` are incremented exactly once, even if `endRound` and `confirmTagged` race (thanks to the `finishGame` idempotency).
- The results screen shows `+N puan` with a breakdown that matches `scoreGame()` tests.
- Turning off "Sıralamada görün" removes me from all 8 board/window combinations immediately.
- No `textTransform` anywhere in `src/`. A grep for `textTransform` returns nothing.
- The tabs are hidden on host/join/game screens. Back from results lands on Ana sayfa with tabs visible.
