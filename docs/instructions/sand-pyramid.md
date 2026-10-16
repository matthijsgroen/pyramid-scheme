# The sand pyramid — plan

A plan for later. The designer asked for the design and its impact now. The slices at the end say what to
build when the work is picked up.

## The design

**wizard_3, the Chamber of Ma'at, opens on a pyramid full of sand.** Its first pyramid is buried floor to
ceiling. The player can walk in, see the sand and walk out, and nothing in it can be reached. Because a
journey's pyramids stay in order, wizard_3's pyramids 2 to 6 wait behind it.

**The sand clears through work done elsewhere.** Sand levers stand in the pyramids of wizard_1, wizard_2
and wizard_4. Each pull clears one more stretch of wizard_3's first pyramid. The clearing is one-way, and
cleared sand never comes back.

**The levers count, and the sand clears in a fixed order.** A pull does not open a region named on that
lever. It adds one to a count, and the regions clear in order: the first pull clears region 1, the second
region 2, and so on. So whichever journey the player does first, the first clearing is always the entrance
stretch, and every clearing is one they can walk to. If a lever opened its own region, a player who
pulled the wizard_4 lever first would clear a hall behind sand that is still there, and see nothing.

**The wizard journeys are open together.** Holding the wizard tier key opens wizard_1 to wizard_4 at once.
Inside a journey the pyramids stay in order, so the `levelNr` cursor stays. Only the order between journeys
is free.

**The lever looks different from the standard lever.** A floor lever (`toggle`) swings both ways and works
on its own floor. A sand lever is pulled once, never goes back, and works on another site. The player
should see that before they touch it.

## Levers: how many, where, what each clears

**Six levers, two in each of the other three journeys.** None of them is in a journey's last pyramid, so
that finishing a journey is never what the sand waits for. That keeps wizard_4's last pyramid free for the
ending.

| Lever | Journey  | Pyramid | Pyramids in journey |
| ----- | -------- | ------- | ------------------- |
| A     | wizard_1 | 1       | 4                   |
| B     | wizard_1 | 3       | 4                   |
| C     | wizard_2 | 2       | 5                   |
| D     | wizard_2 | 4       | 5                   |
| E     | wizard_4 | 2       | 6                   |
| F     | wizard_4 | 4       | 6                   |

**Each lever is the end reward of its pyramid's hub-floor main path** (`mainEndReward`, which `buildSite`
sets per floor; today it is a `fragmentSlot`). It stands on the spine, so finishing that pyramid means
pulling it, and no player misses it. Changing what a reward is costs no re-carve
(`docs/game-design/world-spec-stability.md:34`), so the lever pyramids keep their walls. The fragment slot it
replaces has to be found elsewhere in the tier; see the baked data below.

**What the six pulls clear in wizard_3's first pyramid.** Today that pyramid has three floors
(`src/data/generatedWorld.ts`, wizard_3 from :16326):

- floor 0: seven rooms in one section, ending at the stairs;
- floor 1, the hub: a seven-room main path plus ten side sections;
- floor 2: a seven-room ward-wing floor behind `wizard_a_1`.

| Pulls | Clears                                                       | What it opens                                                 |
| ----- | ------------------------------------------------------------ | ------------------------------------------------------------- |
| 0     | the entrance cell only                                       | the arrival: "It is full"                                     |
| 1     | floor 0, first half of the spine                             | the first walk in                                             |
| 2     | floor 0, the rest of the spine and the stairs                | the hub floor is seen                                         |
| 3     | the hub's main path, up to its midpoint                      |                                                               |
| 4     | the hub's main path to the exit                              | **the pyramid can be finished**, and wizard_3 pyramid 2 opens |
| 5     | the hub's side sections                                      | the side loot                                                 |
| 6     | floor 2, the ward wing (it still needs `wizard_a_1` as well) | the last of it                                                |

**Four pulls finish the pyramid; six clear it all.** The two extra pulls are loot pockets, not progress.
Any four of the six levers will do.

**Pulls 3 and 4 cover the spine.** No side section clears before the main path, so the sand reads as
coming out of the building from the front to the back.

## The sand, once opened

- **One-way.** A cleared region stays clear on every visit, whatever the player does. The lever is an
  activator (`docs/mods/mechanic-contract.md`, the controls), not a toggle.
- **Nothing to conceal.** A region that never closes again never hides explored ground, so the
  "hidden, not erased" rule (`mechanic-contract.md`, impassable regions) never fires here.
- **Torches.** A torch in a sand region is out until its region clears. After that nothing puts it out
  again, so it can be lit once and stays lit. No torch is placed there unless a wizard lock asks for one.

## The model: a counted key dressed as a lever, not a mechanism that reaches across sites

**Recommendation: each lever mints one unit of a global, monotonic key bucket `sand`. Region k of the
buried pyramid is a region gate that opens when the bucket holds at least k.** The lever is the look; the
key is what the game and the solver see.

Why not a mechanism whose state reaches across sites:

- **Mechanism state belongs to one floor of one pyramid.** It is saved per journey under the current
  pyramid: the key is `${levelNr}:${cellAddress}` (`src/app/state/useJourneys.ts:634-647`).
  `setMechanismStates` writes only to the active journey, and `getMechanismStates` reads only that
  journey's current pyramid (`useJourneys.ts:651-652`). A lever in wizard_2 cannot be read from wizard_3
  without a new cross-site read and write path.
- **The floor solver is per floor.** `floorLock` (`src/game/floorLock.ts`) walks one floor's mechanisms.
  It cannot walk a lever that stands in another journey.
- **The reachability solver already has the right shape.** Each lock is "held count of a bucket is at
  least its threshold" (`src/worldGen/reachability.ts:52-71`), and keys are global ids checked against one
  shared snapshot across every journey (`reachability.ts:273-278`). A counted bucket with thresholds 1 to
  6 is what it already does for map pieces.
- **A one-way pull is what a key is.** Held keys only grow: tomb keys have `addTombKey` and no remove
  (`src/mods/tombTreasure/app/useTombTreasureProgress.ts:54-60`). A lever that never goes back has nothing
  a mechanism adds.
- **The travel screen already understands keys.** `getUnexploredLevels` lights a pyramid when a
  remembered key set is now fully held (`useJourneys.ts:775-790`). A clearing that is a key gets the
  come-back pulse for free.

**How the count becomes key ids.** The held-keys provider turns n pulls into the ids `sand:1` to `sand:n`.
Region k's barrier doors carry `requiredKeyId: "sand:k"`. Every reader that checks
`heldKeys.has(id)` then works unchanged. The world solver counts the `sand` bucket and maps `sand:k` to
threshold k, the same way it maps `mapPiece:<tomb>`.

## State and save

**Cheapest: one record in the topology mod's own state, `sandLevers: Record<leverId, true>`.** It sits beside
the tomb-treasure mod's `tombKeys` (`useModState`). A held-keys provider registered with
`registerHeldKeysProvider` (`src/app/SiteMap/keyProviders.ts:44-55`) turns it into `sand:1..n`. With the
mod off the provider is gone, and the buried pyramid is plain ground (see toggle-off below).

- The lever's room is completed in its own pyramid's grid as usual. The record is what other sites read.
- **No change to the journey save.** The `levelNr` cursor stays (`StoredJourneyStateV3`,
  `useJourneys.ts:37-42`). Free order between journeys is computed, not stored.
- **No migration.** This release breaks save compatibility anyway. A new field with an empty default is all
  it costs.

## Free order between journeys

`availablePyramidJourneyIds` (`src/app/pages/journeyAvailability.ts:31-46`) opens a journey only when the
one before it in its tier is completed (`if (!previous || isCompleted(previous.id))`). The change is to skip
that check for a tier marked free-order: authored data on the tier, set for wizard.

- **The solver already assumes free order between journeys.** `computeReachability` treats every journey
  in an unlocked tier as enterable (`reachability.ts:300-311`). The game would stop disagreeing with it.
- `nextPyramidJourneyId` (`journeyAvailability.ts:50-60`) offers the next journey in the list on the
  completion screen. In a free-order tier it should offer any open journey, or none.
- The tier unlock itself does not change. Wizard opens on any of `master_a_1..4`
  (`src/data/treasurePerks.ts:25-30`), behind `LAST_RELEASED_DIFFICULTY`
  (`src/data/difficultyLevels.ts:11`).

## What the solver needs so the world stays provably completable

1. **Levers are positional content.** A lever is an `endReward` like a tomb key (`RewardSpec`,
   `src/worldGen/dsl.ts:41`), harvested through the currency's `bucketForReward`. It is never placed into
   free slots.
2. **Barrier doors with an off-floor key.** Region gates on the buried floors are owned by `sand:k`, not by
   a mechanism on the floor. Today a gate whose key is authored is assumed to be minted on the same floor,
   and is never reported as a discovered lock (`src/game/siteValidator.ts:91-97`). An external key has to be
   a real lock to the solver.
3. **Order within a journey has to enter the solver.** Today "progressing between `levelIndex` values is
   plain sequential completion … outside this solver's scope" (`reachability.ts:73-77`). The buried pyramid
   breaks that assumption: wizard_3 pyramid 2 is reachable only once pyramid 1's exit is. The rule to add
   is general and true of the game: pyramid N+1 of a journey is enterable when pyramid N's exit is
   reachable.
4. **No cycle.** No lever may need anything only wizard_3 holds. The fixed point catches a cycle: the bucket
   never reaches 4 and the world fails as not winnable. A test pins that refusal.
5. **The count is a world check.** At least four levers reachable without wizard_3, and six reachable in
   all. This is the currency's own `worldValidator`, like mosaic's
   (`docs/mods/floor-topology-design.md`, the world must validate as solvable).

## The lever's look

A new realisation, `sandLever`, for the activator role. The standard lever is the `handle` family with
`drawing: { marker: "handle", art: "lever" }` (`src/mods/topology/game/handle/meta.ts`). It is drawn from
`leverBaseBack`, `leverArm` and `leverBaseFront` (`src/assets/tiles/default/`), and its arm angle comes from
the saved state (`src/app/SiteMap/SiteMapView.tsx:509-530`). The sand lever gets its own art key and a pulled
pose that never swings back.

**Art task, for `docs/instructions/art-tasks.md` (default-tier art, the same at every difficulty):**

> **sandLever** — a lever for the sand pyramid. Not the floor lever: a heavy stone post, a sun-disc or
> star-chart head instead of the plain handle, a channel of sand running down from its base into the
> floor. Two poses: set (head up, channel full) and pulled (head down, channel empty). Same projection and
> footprint as `leverBase` + `leverArm`. Masters in `art/masters/props/default/`.

The buried pyramid's sand uses the existing `sand` region-barrier realisation (`regionSand.png`,
`src/mods/topology/game/regionBarrier/meta.ts`). No new sand art is needed. Whether a whole floor under
`regionSand` reads as "full" and not as "a sandy floor" is a playtest question.

## The travel-screen read

Today `JourneyPathView` (`src/ui/atoms/JourneyPathView.tsx:196-275`) has three node states: completed,
current and future. `JourneyCard` has one emerald "still treasure to find here" dot
(`src/ui/organisms/JourneyCard.tsx:127-136`). Nothing says "buried", and nothing says "steep".

- **A buried node.** wizard_3's node 1 while fewer than four pulls are in: drawn as sand-filled, not as the
  amber "current" pulse. It says _this is not open yet_, which is about the world. It must not look like
  a harder pyramid, which is about the player (`floor-topology-design.md`, steep and buried).
- **"Sand moved" pulse.** After a pull, the buried node gets the emerald ring that completed nodes get
  today. This rides `getUnexploredLevels`: the pyramid's floors save a key set on arrival and on leaving
  (`src/app/SiteMap/useFloorExplorationRecorder.ts:49`). Two changes make it work:
  - `blockingKeys` (`src/app/SiteMap/floorExploration.ts:34-39`) has to count a region barrier's
    `requiredKeyId`, so the buried content saves the key set `[sand:k]`.
  - `JourneyPathView` has to draw the ring on the current node as well, not only on completed nodes.
- **Before the first visit** nothing has been saved, so a pull shows no ring. The arrival beat makes sure
  the player has stood in the sand once.
- **The journey card** for wizard_3 shows the buried state on its own, with the pull count as a small
  fill: four marks, filling.

## Toggle-off

With the topology mod off, levers are bare nodes (the end reward is just empty), sand region gates are plain
ground at their doors (`mechanic-contract.md`, torches and floods), and wizard_3's first pyramid is an ordinary pyramid.
Free order between journeys is core progression and stays.

## Who does what

- **The designer** owns the buried pyramid's layout as a wizard lock: which stretch is region 1 to 6, as a
  `.lock` in `src/game/locks/wizard/`. Also the lever art and the story beats.
- **Claude** builds the mechanics (the key bucket, the external owner in the lock notation, barrier doors
  opened by held keys, the solver edges, the travel read, the lever realisation) and places the levers.
- Until the designer writes the lock, the slices run on a made-up test lock. Tests never pin the designer's
  lock (`yarn lock` is the check on it).

## Impact

### For the player

- When the wizard tier opens, all four wizard journeys open at once.
- wizard_3 starts with a pyramid they cannot do yet. They see it buried and are sent elsewhere.
- Six of the fifteen other wizard pyramids end their hub floor at a sand lever. Pulling it clears a stretch in wizard_3. The
  travel screen pulses on the buried pyramid after each pull.
- wizard_3's later pyramids wait until four levers are pulled. In practice wizard_3 is the tier's late
  journey, without anything forcing which one comes first.

### Systems and files touched

| System        | What changes                                                                                                | Files                                                                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Progression   | a free-order flag per tier; skip the "previous completed" check; the "next journey" offer                   | `src/app/pages/journeyAvailability.ts`, `src/data/difficultyLevels.ts` or `journeyStructure.ts`                                           |
| Keys / save   | `sandLevers` record in topology mod state; a held-keys provider giving `sand:1..n`                          | `src/mods/topology/app/`, `src/app/SiteMap/keyProviders.ts`                                                                               |
| Barrier doors | held global keys passed to `openDoorsFor` and `douseFloor`; concealment counts key-owned barriers           | `src/game/mechanismDoors.ts`, `src/app/SiteMap/useAssembledFloor.ts:415-426`, `src/game/concealment.ts:6-20`                              |
| Lock notation | a region gate owned by an external counted key (`hall -[sand≥3]` or similar)                                | `src/game/lockNotation.ts`, `src/game/lockCompile.ts`, `src/game/floorLock.ts`                                                            |
| World solver  | `sand` bucket and thresholds; external keys as real locks; the within-journey order edge; a world check     | `src/worldGen/reachability.ts`, `src/game/siteValidator.ts`, `src/worldGen/placeFragments.ts`, topology mod descriptor                    |
| World-gen DSL | a `sandLever` end reward; a binding for the sand pyramid's lock                                             | `src/worldGen/dsl.ts`, `src/worldGen/rewards.ts`, `src/worldGen/spec/wizard.ts`                                                           |
| Map / travel  | buried node, pulse on the current node, card fill                                                           | `src/ui/atoms/JourneyPathView.tsx`, `src/ui/organisms/JourneyCard.tsx`, `src/app/pages/Travel.tsx`, `src/app/SiteMap/floorExploration.ts` |
| Site map art  | the `sandLever` drawing                                                                                     | `src/app/SiteMap/SiteMapView.tsx`, `src/assets/tiles/default/`, `art/masters/props/default/`                                              |
| Story         | the buried-pyramid arrival becomes wizard_3's arrival; the clearing beat; wizard arrivals come in any order | `docs/game-design/story/`, `public/locales/*/story*.json`                                                                                 |
| i18n          | buried node label, lever prompt                                                                             | `public/locales/en/`, `public/locales/nl/`                                                                                                |

### Baked data that moves

- **wizard_3 pyramid 1 re-carves.** Its three floors gain the regions of the sand lock. The rooms stay;
  the corridors move. Its loot may move with the regions.
- **Six wizard pyramids change one end reward each** (wizard_1 p1 and p3, wizard_2 p2 and p4, wizard_4 p2
  and p4). They do not re-carve. Each lever takes the place of a hub `fragmentSlot`, so six wizard
  hieroglyph fragments are placed again by the worklist and may land in other wizard rooms. If that spread
  is unwelcome, the lever takes a side section's end instead (open question 1).
- **No other tier moves.** Junior, expert and master bakes stay as they are.

### Risks

- **The within-journey order edge is new to the solver.** It is the soundness change in this plan, and the
  one to review with Opus.
- **A whole floor of sand may read as decoration.** If `regionSand` over every cell does not read as
  "full", the buried pyramid needs a denser fill.
- **Free order changes the story's ordering.** The story assumes arrivals in a tier come in order
  (`docs/game-design/story-and-time-brainstorm.md`, the rails). At wizard they no longer do, so Act V's
  beats must not lean on each other's order.
- **wizard_4 could be finished before wizard_3 is.** The story has wizard_3 weigh and wizard_4 close. If
  the order matters, it needs a key, not a convention.
- **Floor-key gates at wizard are still floor keys.** The sand lock sits on a pyramid whose hub already has
  ward gates (`wizard_a_1`, `wizard_a_3`, `wizard_a_4`). The claim rule ("a feature claims what it uses",
  `floor-topology-design.md`) must keep the sand regions and the ward gates apart.

## Slices, in build order (for later)

Rough sizes: S is about a day, M two to three days, L a week.

1. **Free order between journeys (S).** The tier flag, the availability check, the next-journey offer.
   Tests freeze: in a free-order tier every journey opens with the tier key; in any other tier the
   previous-completed rule still holds; the offer never names a closed journey.
2. **The sand key (S).** The `sandLevers` record, the provider giving `sand:1..n`, `addSandLever` only.
   Tests freeze: n pulls hold exactly `sand:1..n`; a pull twice counts once; the set only grows; mod off
   holds none.
3. **Barrier doors opened by held keys (M).** `openDoorsFor`, douse and concealment take global held keys;
   the notation and compile accept an external counted owner. Tests freeze, on a made-up lock: a region
   whose owner is `sand:k` is shut below k and open at k; it never shuts again; nothing is concealed; a
   torch in it lights after clearing.
4. **The solver (M, Opus).** The `sand` bucket, external keys as locks, the within-journey order edge, the
   cycle refusal, the count check. Tests freeze: a world whose sand pyramid needs a lever in its own journey
   is refused; a world with three reachable levers and a threshold of four is refused; pyramid N+1 is not
   reached while pyramid N's exit is shut.
5. **The lever (M).** The `sandLever` end reward in the DSL, its realisation and drawing (placeholder art
   until the designer's lands), the pull prompt. Tests freeze: taking the reward records the lever once;
   the drawing differs from the `handle` lever's; mod off leaves an empty end.
6. **The travel read (M).** Blocking keys count barrier doors, the buried node, the pulse on the current
   node, the card fill. Tests freeze: a buried pyramid's node is not drawn as current; one pull after a
   visit lights it; before any visit it does not.
7. **Placement and bake (M).** The designer's sand lock bound to wizard_3 pyramid 1, the six levers placed,
   the bake, the gate in a clean worktree. Checks: `yarn lock`, `yarn verify-content`, the world sweep.
   No unit test pins the lock or the placement.

## Open questions for the designer

1. **Spine or side path for the levers?** On the spine nobody misses one, but it takes a fragment slot; on
   a side path pulling one is a choice and it takes junk's place. The plan says spine.
2. **Four to finish, six to clear all?** Or should all six be needed before wizard_3 pyramid 2 opens?
3. **Is wizard_4 allowed to finish before wizard_3?** If the story needs "weighed, then closed", wizard_4's
   last pyramid needs the buried pyramid cleared first.
4. **One arrival or two?** wizard_3's arrival (Fez and the scale) and the buried-pyramid arrival ("It is
   full") now happen in the same place. Play both in order, merge them, or move the scale to the clearing
   ("Light. You want it LIGHT.")?
5. **Does a pull show anything where it is pulled?** A Fez line, or the sand channel emptying and
   nothing said.
