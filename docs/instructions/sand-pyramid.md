# The sand pyramid — plan

A plan for later. The designer asked for the design and its impact now. The slices at the end say what to
build when the work is picked up.

## The design

**wizard_3, the Chamber of Ma'at, opens on a pyramid full of sand.** Its first pyramid is buried past the
arrival. The player can walk in, see the sand and walk out. Because a journey's pyramids stay in order,
wizard_3's later pyramids wait behind it.

**The sand clears through work done elsewhere.** Levers stand in the pyramids of the other wizard journeys.
Each lever has a name and clears the sand of that name, and nothing else. Clearing is one-way: cleared sand
never comes back.

**Any play order works, and a tool proves it.** The wizard journeys open together, so the player may pull
the levers in any order. The web walker (below) walks every order and proves each one finishes, so nothing
has to force the sand to clear from the front to the back.

**The sand works both ways.** Sections freed in wizard_3 hold keys that open things in the other journeys'
pyramids: a deep floor, a sealed side hall. The player goes back and forth between journeys. This is the
ward-gate shape the game already has (a gate here, its key from elsewhere), with both ends inside one tier.

**Sand may lie in any wizard_3 pyramid.** The first worked example is the designer's: wizard_3 pyramid 1
fully buried. Once its main path is clear the pyramid can be finished, and pyramid 2 opens. Side sections
still under sand are things to come back for.

**The order between wizard journeys is free; inside a journey it stays.** Holding the wizard tier key opens
wizard_1 to wizard_4 at once. Inside a journey the `levelNr` cursor stays.

**The lever looks different from the floor lever.** A floor lever (`toggle`) swings both ways and works on
its own floor. A sand lever is pulled once, never goes back, and works on another site. The player should
see that before they touch it.

## The web lock

The sand is written one level above the floor's lock, as a **web lock**: the idea and the notation of a
`.lock` (`../mods/mechanic-contract.md` §7, `yarn lock --help`), with pyramids and their sections as the
places. One web per tier; the wizard web lives at `src/game/locks/wizard/chamberOfMaat.web`. The designer
owns it, as they own master and wizard locks. Claude builds the format, the walker and the placement.

### Notation

A web has four kinds of line.

**Journey order.** One line per journey, its pyramids in order. `>` reads "is finished before the next
opens", which is the `levelNr` cursor rule. There is no order between lines: the journeys of a web are open
together.

```
w3p1 > w3p2 > w3p3 > w3p4 > w3p5 > w3p6
```

`w3p1` is journey `wizard_3`, pyramid 1 (the `levelNr`, counted from 1). The tool checks every line
against the world: the journey exists and has that many pyramids.

**Sections.** A place is a section of a floor of a pyramid, by its authoring address:

| Written        | Means                                                            | Save key, inside `wizard_3`'s record  |
| -------------- | ---------------------------------------------------------------- | ------------------------------------- |
| `w3p1.f1`      | floor 1's main path, and so the whole floor (all hangs off main) | `1:main`, cells whose key starts `1/` |
| `w3p1.f1.s4`   | side section `s4` of floor 1, and all that hangs off it          | `1:s4`, cells whose key starts `1/`   |
| `w3p1.f1.s4.0` | its first sub-path                                               | `1:s4.0`, cells whose key starts `1/` |

This is `${levelNr}:${sectionAddress}`, the key a save already files a section's cells under
(`src/app/SiteMap/cellIdentity.ts`), with the floor added: a section address repeats on every floor, and
a cell's key carries the floor (`${floor}/${slot}`). It is also the stair id's address
(`wizard_3:p0:f1:s4`, which counts pyramids from 0). A section holds everything that hangs off it: a
ward wing's floor hangs off the stair section that leads up to it.

**Floor-lock regions are not web places.** The recommendation is sections, not regions:

- A section address is a save address and survives a re-carve (`../game-design/world-stability.md`). A
  region name is not part of any address (`../game-design/regions-and-containers.md`).
- A lock is reusable. A web naming `hall` inside `doubleBack` would tie the web to one lock's inner names.
- A floor lock's proof stays local to its floor (the container rule). The rules in "Floor locks under web
  sand" keep it so.
- A gate at a section's mouth is the ward gate's shape, so the carve, play and the world solver already
  know it.

An unlabelled side section's address shifts when a section is authored ahead of it
(`../game-design/world-spec-stability.md`, a section's `label`). Placement pins every section a web names
by giving it its current address as its label.

**Sand gates.** A section that stays impassable until its key is held, written like a `.lock` region gate:

```
w3p1.f1.s4 -[C]
```

A gate has one owner, a key of the web. `-[C+D]` (every owner) and `-[C|D]` (any owner) are allowed, as in
a `.lock`. A web gate is drawn as sand in wizard_3 and as a sealed door elsewhere (see "The look"); the web
never names the look.

**Levers and keys, with their site.** An activator of the web, written like a `.lock` activator:

```
C activator @w4p3.f1
K activator @w3p1.f1.s4
```

An activator stands at the end of the section it names: `@w4p3.f1` is floor 1's main-path end reward,
`@w3p1.f1.s4` is the end reward of side section `s4`. It is the section's `endReward`, so it is
positional content and costs no re-carve. One activator per section end. Lever or key is the look, bound
outside: an activator that opens sand is drawn as a sand lever, one that opens a seal as a key.

Only activators. A web has no toggle, no torch, no sequence: everything in it only opens. That is what makes
the walk below cheap and every order safe.

### The worked example

The designer's idea, with names to show the shape. The section numbers are wizard_3 pyramid 1 as baked
today (`src/data/generatedWorld.ts`, wizard_3 from :16326): floor 0 is one seven-room section ending at the
stairs, floor 1 is the hub (main path, ten side sections, `s7` the stairs up to the ward wing), floor 2 is
the ward wing behind `wizard_a_1`.

```
// designed by: <designer>
// wizard. The Chamber of Ma'at, buried: two levers in other journeys clear its spine and let
// wizard_3 go on. Its side halls hold keys to deep rooms elsewhere, and one of them waits on
// wizard_3's own second pyramid.

w1p1 > w1p2 > w1p3 > w1p4
w2p1 > w2p2 > w2p3 > w2p4 > w2p5
w3p1 > w3p2 > w3p3 > w3p4 > w3p5 > w3p6
w4p1 > w4p2 > w4p3 > w4p4 > w4p5 > w4p6

// the sand
w3p1.f0 -[A]              // the whole pyramid past the arrival
w3p1.f1 -[B]              // the hub, and the way to the exit
w3p1.f1.s4 -[C]           // a side hall
w3p1.f1.s8 -[D]           // another

// the levers
A activator @w1p1.f1
B activator @w2p2.f1
C activator @w4p3.f1
D activator @w3p2.f1.s2   // in wizard_3 itself, so only after w3p1 is finished

// what the sand keeps, and what it opens elsewhere
K activator @w3p1.f1.s4
L activator @w3p1.f1.s8
w1p3.f1.s3 -[K]           // a sealed hall in wizard_1
w4p4.f2 -[L]              // wizard_4 pyramid 4's ward wing
```

How it plays: the player meets w3p1 buried at any time. A (wizard_1's first pyramid) clears floor 0, B
(wizard_2's second) the hub's main path, and then w3p1 can be finished and w3p2 opens. C clears `s4`, which
holds K for wizard_1. D stands in w3p2, so `s8` (and L for wizard_4) is a return to w3p1. Of the hub's
side sections only `s4` carries no gate today; `s8` carries `wizard_a_3`, so burying it asks placement to
move that ward content (see "Floor locks under web sand", rule 1).

### What `yarn lock <web>` reports

The tool reads the world's skeleton (which sections exist on which floor, which stair section leads to which
floor, which other gates stand on the way) from the world spec, lays the web over it, and walks it. A web is
bound to one world, so it is not walked standalone the way a reusable `.lock` is.

**A visit** is one entry into one pyramid from the travel screen. Inside it the player walks every floor of
that pyramid they can reach, takes every activator in reach, works every floor lock in reach (its own floor
walk proves it can be worked), and finishes the pyramid when its exit is in reach. A finished pyramid can be
visited again. A **revisit** is a visit to a pyramid already visited. Every pyramid needs one visit, so the
cost the web adds is its revisits.

Taking an activator never hurts and finishing never hurts (nothing in a web closes), so a visit takes all it
can. The walk is breadth-first over the states (held web keys, each journey's cursor), one move per visit.

```
## chamberOfMaat.web

✓ compiles
✓ every place is in the world
✓ solvable: every journey finishes
✓ every gate opens
✓ no softlock
✓ every buried section is seen before its lever is pulled
✓ no activator stands in sand only it clears
assumed held on the way: the ward key on w4p4's wing stairs

cheapest: 21 visits to finish every journey, no revisit
          22 visits to clear everything, 1 revisit (w3p1, for L)
  w1p1 A ▸ w2p1 ▸ w2p2 B ▸ w4p1 ▸ w4p2 ▸ w4p3 C ▸ w3p1 K ▸ w3p2 D ▸ w3p1 L ▸ w1p2 ▸ w1p3 ▸ …
```

What each line means:

- **solvable.** Some order of visits finishes every journey.
- **every gate opens.** Some order holds every web key and stands in every buried section. A gate that never
  opens is loot nobody collects, the web's `deadRegions`.
- **no softlock.** Every state the walk reaches can still finish every journey and open every gate. A web
  holds only activators, so this follows from solvable; the walk still checks it, and the compiler refuses
  anything in a web that is not an activator.
- **seen before pulled.** For each sand gate there is an order in which the player stands at its face (the
  section's mouth, in reach and shut) before its lever is taken, the floor lock's `doorsSeenLate` one level
  up. A lever whose sand cannot be seen first is a warning, as on a lock that is not a lesson. A lever pulled
  before its sand is reached is not lost: the travel screen lights the buried pyramid once a visit has been
  made and the key is held.
- **no activator in its own sand.** An activator whose section lies under its own gate, directly or through
  the sections and floors it hangs off, is refused by name. A longer cycle (X under Y's sand, Y under X's) is
  refused as not solvable, naming the chain.
- **assumed held.** Keys outside the web that stand on the way to a web gate (a tomb's ward key on a wing's
  stairs) are taken as held, the third bracket of `../authored-locks-roadmap.md`. They are listed so the
  designer sees them. An activator may never stand behind one (the bake refuses it), so the cost and the
  proof never lean on them.
- **cheapest.** The fewest visits to finish every journey, and the fewest to clear everything, with one
  cheapest route. A failed check prints `✗` and the chain it found, as `yarn lock` does.

## Floor locks under web sand

The designer's question: how do floor locks (their regions, levers, stones, water and sand barriers)
interact with the web's sand as a layer on top, and does anything have to be arranged so one floor can carry
both?

**Recommendation: web sand sits on whole floors and on sections no floor lock owns, and nowhere inside a
lock. To the floor, a web key is held from outside and only ever arrives. Under those rules the floor lock
needs nothing special: its walk with every web key held is today's walk, and that one walk covers every state
the player can reach while sand is still lying.**

What the code does today, which the rules lean on:

- `floorLock` (`src/game/floorLock.ts`) reads a floor as a lock. A door whose key nothing on the floor mints
  (a ward gate, a key from elsewhere) comes out as a `sealed` owner that never opens: the container rule,
  "ward keys assumed shut", which keeps the proof local.
- `walkLock` (`src/game/lockWalk.ts`) asks: some state reaches the way out, every reachable state still can,
  and no region once stood in is lost. Leaving and coming back keeps the floor's state, because mechanism
  state is saved per pyramid under `${levelNr}:${cellAddress}` (`src/app/state/useJourneys.ts`).
- A region barrier (water or sand in a lock) is a door on each way into its region, carrying `regionBarrier`.
  While shut it covers the region: a torch there is doused (`douseTorches`) and explored ground is concealed.
  A lock may not bar its own `in` or `out` region (`regionBarrierHoldsPort`, `src/game/obstacles.ts`).
- A side section's gate is a gate room at its mouth (`chainRooms.ts`); a ward gate is one with
  `gateVariant: "tomb-key"`, opened in play by a held key and counted by the travel pulse (`blockingKeys`,
  `src/app/SiteMap/floorExploration.ts`).
- Marks: every mechanic on a floor and its gates wear one glyph on one of the five key hues, two mechanics
  never alike (`allocateMarks`, `src/game/mark.ts`).

### The rules

1. **Where web sand may sit.** On a side section's mouth (the section and all that hangs off it), or on a
   floor's main path at its first seam after the arrival (the whole floor). Not on a floor-lock seam, not on
   a lock's own off-route section (`lock:<region>`), not on a hidden section, and not on a section that
   already carries a gate: one gate per mouth. Where the web names a gated section, placement moves that
   gate's content elsewhere in the journey, asked of the designer first.
2. **Nothing of a floor lock under web sand.** A buried section holds no mechanic, plate, pipe hole, sequence
   tile, one-way, or floor-key chest the floor's lock uses. So a floor lock is either wholly under web sand
   (its floor's main path is buried) or wholly clear of it. The main-path gate stands before the lock's
   ground begins, on the arrival's side of every lock piece.
3. **A web key is never a floor-lock owner.** A `.lock` never names a web key, and no door carries a web key
   beside a floor mechanic's. A web gate's only owners are web keys.
4. **Web keys only arrive.** The held set has an add and no remove. A web gate is an edge door, never a region
   barrier, so it covers no region: it douses no torch and conceals nothing.
5. **One sand per site.** On a pyramid carrying web sand, floor-lock region barriers bind to water, so sand
   on that site means one thing (see "The look").

### What the floor walker does with web keys

`floorLock` takes the web keys as **held from outside**: a door whose every key is in that set is open (an
owner with one state that opens it), where today it would be sealed. The floor is walked in two brackets:

- **Held** (every web key on the floor held): the floor as it ends up. It must pass everything a floor passes
  today: solvable, no strand, no region lost, no dead region. This is the soundness gate.
- **Shut** (no web key held): walked only to report what is in reach before the sand moves ("f1: the lock is
  under sand"). It gates nothing.

**Why the held walk is enough.** Under rules 2 to 4, a missing web key only removes moves that pass a web
door, and nothing reads a web door as shut: no torch is covered by it and no lock piece stands behind it.
So every sequence of moves the player can make with some web keys missing is also a sequence they can make
with all of them, and every state they can reach while sand lies is a state of the held walk. The held walk
proves every one of those still finishes. The intermediate sets of keys need no walk of their own.

**Sand cannot trap a floor lock.** Sand only clears (rule 4), the player can always leave a pyramid with the
floor's state kept, and the web walk proves each web key is obtainable. A player standing in a floor's lock
when the sand clears somewhere else finds the same floor plus a pocket.

**A floor lock out of reach while sand lies is allowed; one in reach and unsolvable because of sand is not
possible.** By rule 2 a lock is under sand whole or not at all. Under sand it is not entered, which is leave
and come back. Clear of sand, it is today's lock.

**Seen before control, across the layers.** The floor lock's own check (`doorsSeenLate`) runs from its `in`
in the held bracket, unchanged: a buried lock is entered whole once its floor's sand is gone, so it shows
its doors to the player as it would on any floor. The web's check runs one level up: a sand face before its
lever. Neither check reads the other's pieces.

**Marks and art.** Web gates and activators take no floor mark: `allocateMarks` hands marks to the floor's
own mechanics, and a web key is none of them. The web has its own marks, one per activator, worn on its
gates' faces and on the activator: a glyph from a set disjoint from `MARK_GLYPHS`, on a sand ground in a
cartouche, never one of the five key hues. So "two mechanics on one floor never share a mark" holds without
the floor knowing the web. Web sand gets its own drawing, not `regionSand`: a lock's sand comes and goes and
conceals; web sand is a drift filling a section's mouth, cleared once. With rule 5 the two never stand on one
site.

### What the bake checks, to tie the web to the real floors

1. Every pyramid, floor and section the web names exists in the world, and every named section carries its
   current address as its label.
2. Every journey line matches the journey's pyramid count, and the web's journeys are one free-order tier.
3. Every web gate is carved: a gate room at that section's mouth (or the main path's first seam) carrying
   `web:<id>`. No other door carries a web key.
4. Every activator is the end reward of the section it names, one per id.
5. Rules 1 to 3 on the carved floor: where each web gate stands, what each buried section holds, which doors
   name a web key.
6. Every floor carrying a web gate walks sound in the held bracket.
7. The world solver, run with web keys as positional keys and the order inside each journey, agrees with
   the web walk: every activator reachable, every gate opened, every journey finished. No activator needs a
   key from outside the web (a ward key, a map piece), so the web walk's assumptions are exact.
8. `yarn lock <web>` passes on the baked world.

## Keys, state and save

**A web key is a named key.** Activator X mints `web:X`; a web gate requires `web:X`. Every reader that
checks `heldKeys.has(id)` then works unchanged.

- **The record: `webKeys: Record<id, true>` in the topology mod's own state**, beside the tomb-treasure mod's
  `tombKeys` (`useModState`). A held-keys provider (`registerHeldKeysProvider`,
  `src/app/SiteMap/keyProviders.ts`) turns it into `web:<id>`. It has an add and no remove.
- **Mechanism state does not change.** It stays per journey, per pyramid; a web key never enters it.
- **No change to the journey save.** The `levelNr` cursor stays. Free order between journeys is computed, not
  stored.
- **A web gate opens on its own** once its key is held: the lever did the work, so the sand is gone when the
  player arrives.
- A new field with an empty default needs no migration.

## Free order between journeys

`availablePyramidJourneyIds` (`src/app/pages/journeyAvailability.ts:31-46`) opens a journey only when the
one before it in its tier is completed. The change is to skip that check for a tier marked free-order:
authored data on the tier, set for wizard.

- **The solver already assumes free order between journeys.** `computeReachability` treats every journey in
  an unlocked tier as enterable (`src/worldGen/reachability.ts:300-311`).
- `nextPyramidJourneyId` (`journeyAvailability.ts:50-60`) offers the next journey in the list on the
  completion screen. In a free-order tier it offers any open journey, or none.
- The tier unlock does not change. Wizard opens on any of `master_a_1..4` (`src/data/treasurePerks.ts:25-30`),
  behind `LAST_RELEASED_DIFFICULTY` (`src/data/difficultyLevels.ts:11`).

## What the world solver needs

1. **Web keys are positional at both ends.** An activator is an `endReward` like a tomb key (`RewardSpec`,
   `src/worldGen/dsl.ts:41`), harvested through its currency's `bucketForReward`, never placed into free
   slots. A web gate is an ordinary lock on one named key.
2. **A web gate is a real lock.** It is a gate room with an external key, reported as a discovered lock, like
   a ward gate (`src/game/siteValidator.ts`, `reachableFrom`).
3. **Order inside a journey enters the solver.** Today progressing between `levelIndex` values is outside the
   solver (`reachability.ts:73-77`). The rule to add is true of every journey: pyramid N+1 is enterable when
   pyramid N's exit is reachable.
4. **The world check is the web's.** The web walk is the designer's check; the world solver's run is the proof
   on the carved floors, and the bake requires both to agree (check 7 above).

## The look

- **The sand lever**, a new realisation of the web's activator in wizard_3's direction. The floor lever is the
  `handle` family (`src/mods/topology/game/handle/meta.ts`), drawn from `leverBaseBack`, `leverArm` and
  `leverBaseFront`. The sand lever has its own art and a pulled pose that never swings back.
- **The web key and the sealed door**, for gates outside wizard_3: a key whose head wears its web mark, and a
  door sealed with the same mark.
- **Web sand**, a drift in a section's mouth wearing the web mark of what clears it.
- **Web marks:** a glyph set disjoint from `MARK_GLYPHS`, on a sand ground in a cartouche.

**Art tasks, for `docs/instructions/art-tasks.md` (default-tier art, the same at every difficulty):**

> **sandLever** — not the floor lever: a heavy stone post, a sun-disc or star-chart head instead of the plain
> handle, a channel of sand running from its base into the floor. Two poses: set (head up, channel full) and
> pulled (head down, channel empty). Same projection and footprint as `leverBase` + `leverArm`.
>
> **webSand** — sand drifted into a corridor mouth to the ceiling, a cartouche half out of it. One pose; a
> cleared mouth is plain floor.
>
> **webSeal** — a doorway closed by a stone slab with a cartouche on it, and the key that opens it.
>
> Masters in `art/masters/props/default/`.

## The travel-screen read

Today `JourneyPathView` (`src/ui/atoms/JourneyPathView.tsx:196-275`) has three node states: completed,
current and future. `JourneyCard` has one emerald "still treasure to find here" dot
(`src/ui/organisms/JourneyCard.tsx:127-136`).

- **A buried node.** A pyramid whose exit lies behind a web gate whose key is not held: drawn as sand-filled,
  not as the amber "current" pulse. It says _this is not open yet_, which is about the world, and must not look
  like a harder pyramid (`../mods/floor-topology-design.md`, steep and buried).
- **"Sand moved" pulse.** After a pull, the buried node gets the emerald ring. This rides `getUnexploredLevels`
  and the key sets a floor saves on arrival and on leaving. Two changes:
  - `blockingKeys` (`floorExploration.ts:37-42`) counts a web gate's key, as it counts a ward gate's.
  - `JourneyPathView` draws the ring on the current node as well.
- **Before the first visit** nothing has been saved, so a pull shows no ring. The arrival beat makes sure the
  player has stood in the sand once.
- **The journey card** of a journey with a buried pyramid shows the web marks its main path waits for, lit as
  each is pulled.

## Toggle-off

With the topology mod off, web gates are open corridors at their mouths, activators are bare nodes (the end
reward is empty), and the carve is identical. wizard_3's first pyramid is an ordinary pyramid. Free order
between journeys is core progression and stays.

## Who does what

- **The designer** writes the web: which sections are buried, which keys they keep, where each activator
  stands. Also the art and the story beats.
- **Claude** builds the format, the walker, the floor walker's held keys, the gates and keys in the world, the
  solver edges, the travel read and the realisations, and places the web.
- Until the designer writes the web, the slices run on made-up webs. Tests never pin the designer's web;
  `yarn lock <web>` is the check on it.

## Impact

### For the player

- When the wizard tier opens, all four wizard journeys open at once.
- wizard_3 starts with a pyramid they cannot finish yet. They see it buried and go elsewhere.
- Some pyramids in the other journeys end a path at a sand lever. Pulling it clears a named stretch of
  wizard_3; the travel screen pulses on the buried pyramid.
- Sections freed in wizard_3 hold keys that open sealed places in the other journeys, so the tier is played
  back and forth. `yarn lock <web>` says how many revisits the web asks for.

### Systems and files touched

| System        | What changes                                                                                                | Files                                                                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Progression   | a free-order flag per tier; skip the "previous completed" check; the "next journey" offer                   | `src/app/pages/journeyAvailability.ts`, `src/data/difficultyLevels.ts` or `journeyStructure.ts`                                              |
| Web format    | the `.web` notation, its compiler, the walk, the report; the skeleton read from the world spec              | new `src/game/webNotation.ts`, `src/game/webWalk.ts`, `scripts/lock.ts`                                                                      |
| Floor walk    | web keys held from outside; the held and shut brackets; the attach rules                                    | `src/game/floorLock.ts`, `src/game/floorLockWalk.ts`, `src/worldGen/validate.ts`                                                             |
| Keys / save   | `webKeys` in topology mod state; a held-keys provider giving `web:<id>`                                     | `src/mods/topology/app/`, `src/app/SiteMap/keyProviders.ts`                                                                                  |
| World-gen DSL | a `web-key` section gate; a main-path gate at the arrival; a `webKey` end reward; the web bound to the tier | `src/worldGen/dsl.ts`, `src/worldGen/rewards.ts`, `src/worldGen/buildSite.ts`, `src/game/carve/chainRooms.ts`, `src/worldGen/spec/wizard.ts` |
| World solver  | web keys as positional keys; the order inside a journey; agreement with the web walk                        | `src/worldGen/reachability.ts`, `src/worldGen/placeFragments.ts`, topology mod descriptor                                                    |
| Map / travel  | buried node, pulse on the current node, card marks; `blockingKeys` counts web gates                         | `src/ui/atoms/JourneyPathView.tsx`, `src/ui/organisms/JourneyCard.tsx`, `src/app/pages/Travel.tsx`, `src/app/SiteMap/floorExploration.ts`    |
| Site map art  | sand lever, web sand, web seal and key, web marks                                                           | `src/app/SiteMap/SiteMapView.tsx`, `src/game/mark.ts`, `src/assets/tiles/default/`, `art/masters/props/default/`                             |
| Story         | the buried-pyramid arrival is wizard_3's arrival; the clearing beat; wizard arrivals in any order           | `docs/game-design/story/`, `public/locales/*/story*.json`                                                                                    |
| i18n          | buried node label, lever and seal prompts                                                                   | `public/locales/en/`, `public/locales/nl/`                                                                                                   |

### Baked data that moves

- **Every wizard pyramid the web buries re-carves where a gate is added.** A gate's presence is structural; it
  costs its own room. A floor buried whole gains one gate room after its arrival.
- **Every pyramid holding an activator changes one end reward.** That does not re-carve. The reward it
  replaces (often a fragment slot) is placed again by the worklist and may land in another wizard room.
- **Sections the web names get labels** equal to their current address. That moves nothing.
- **Sections the web buries that carry a ward gate today** lose it to another place in the journey (rule 1),
  at the designer's say.
- **No other tier moves.**

### Risks

- **The order inside a journey is new to the solver.** It is a soundness change, and the one to review with
  Opus, with the floor walker's held keys.
- **The skeleton read.** The web walk is only as true as the skeleton it reads; check 7 of the bake is what
  catches a difference.
- **Revisits can grow quietly.** A web where every key lies behind another journey's later pyramid can ask
  for many revisits and still be sound. The cheapest-visits line is the designer's measure; nothing refuses
  a high number.
- **Free order changes the story's ordering.** At wizard, arrivals come in any order, so Act V's beats must not
  lean on each other's order.
- **wizard_4 could be finished before wizard_3.** If the story needs wizard_3 first, the web says so with a
  gate (open question 3).

## Slices, in build order (for later)

Rough sizes: S is about a day, M two to three days, L a week.

1. **Free order between journeys (S).** The tier flag, the availability check, the next-journey offer. Tests
   freeze: in a free-order tier every journey opens with the tier key; in any other tier the
   previous-completed rule holds; the offer never names a closed journey.
2. **The web format and its walk (M).** Notation, compile, the skeleton from a world spec, the walk, the
   `yarn lock <web>` report. Tests freeze, on made-up webs over a made-up world: pyramids in one journey open
   in order and journeys in any order; an activator under its own gate is refused by name; a two-key cycle is
   refused naming the chain; a web with anything but activators is refused; the cheapest visits of a small web
   (three pyramids, one revisit) are counted exactly; a lever whose face cannot be seen first is warned about.
3. **Web gates and keys in the world (M).** The `web-key` section gate, the main-path gate after the arrival,
   the `webKey` end reward, `webKeys` and its provider. Tests freeze: a web gate is shut without its key and
   open with it; the held set only grows; a key taken twice is held once; with the mod off the gate is an open
   corridor and the walls are identical.
4. **The floor walker with held keys (M, Opus).** `floorLock` with held web keys, the two brackets, the attach
   rules as refusals. Tests freeze, on made-up floors: a web gate on a lock seam is refused; a buried section
   holding a plate is refused; a floor buried whole walks sound held and reports its lock out of reach shut;
   for every subset of a floor's web keys, the states reachable are states of the held walk.
5. **The solver (M, Opus).** Web keys as positional keys, the order inside a journey, the agreement with the
   web walk, activators behind outside keys refused. Tests freeze: pyramid N+1 is not reached while pyramid
   N's exit is shut; a world where the web walk and the solver disagree is reported; an activator behind a
   ward gate is refused.
6. **The look (M).** The sand lever, web sand, the seal and key, web marks, the one-sand-per-site binding rule.
   Tests freeze: a web mark never equals a floor mark; the sand lever's drawing is not the floor lever's; a
   site with web sand that binds a lock's barriers to sand is refused.
7. **The travel read (M).** `blockingKeys` counts web gates, the buried node, the pulse on the current node, the
   card's marks. Tests freeze: a buried pyramid's node is not drawn as current; one pull after a visit lights
   it; before any visit it does not.
8. **Placement and bake (M).** The designer's web bound to the wizard tier, sections labelled, gates and
   activators placed, the bake, the gate in a clean worktree. Checks: `yarn lock <web>`, `yarn verify-content`,
   the world sweep. No unit test pins the web or the placement.

## Open questions for the designer

1. **A sand face seen only after its lever:** a warning, as on a lock, or refused?
2. **A web gate on a section that already has a ward gate:** move the ward content (the plan), or allow one door
   with both keys?
3. **Is wizard_4 allowed to finish before wizard_3?** If the story needs "weighed, then closed", the web puts a
   gate on wizard_4's last pyramid whose key lies in wizard_3.
4. **One arrival or two?** wizard_3's arrival (Fez and the scale) and the buried-pyramid arrival ("It is full")
   happen in the same place. Play both in order, merge them, or move the scale to the clearing?
5. **Does a pull show anything where it is pulled?** A Fez line, or the sand channel emptying and nothing said.
