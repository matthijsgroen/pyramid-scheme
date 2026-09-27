# The road to an authored `doubleBack`

What stands between the walk (built) and the design document's worked example running as a real floor
a player can walk. Six steps. Each ships something testable on its own, and the order is forced by
what depends on what rather than by preference.

The destination is not one floor. It is master and wizard authored as locks — 58 floor-key gates, 56
of them in those two tiers — and `doubleBack` is the first one, chosen because the design has already
reasoned it through.

**Every step here is an ingredient, and an ingredient is held to a higher bar than a floor.** A floor's
mistakes stay on that floor; a one-way that reads wrong is wrong on every floor that ever stands one,
and a handle with a sloppy state model is sloppy in all 56 of those gates. That is why a slice here
costs more than its one visible use looks worth: the cost is paid once and the use is paid back many
times. Do not trade an ingredient's quality for a shorter road to `doubleBack` — it is the first
consumer, not the point.

Delete this file when step 6 lands.

---

## What `doubleBack` needs that does not exist

Read against the fixture in `src/game/lockWalk.spec.ts`, which is the example in its current form:

| The example has                                             | Today                                                                      |
| ----------------------------------------------------------- | -------------------------------------------------------------------------- |
| six named regions                                           | sections can be named — `SubSection.label` gives a stable address          |
| three levels of nesting, and branches that rejoin           | `SideSection.sideSections?: SubSection[]` is two levels, single-parent     |
| gates whose two ends are both named regions                 | `SubSection.gate` belongs to a section: it joins that section to elsewhere |
| `greenRight` starting open, then shutting behind the player | **done** for a gate a lever owns — `handles[].starts` hangs the lever on a side and that side's gates are open on arrival, the carve unchanged. A free-standing gate still starts shut |
| gates owned by a mechanism, several states each opening one | **done, and each state opens a SET** — `MechanismRecord` declares `states`/`initial`/`returnsToInitial`, and `floorLock` compiles the machine straight off it |
| two levers (`S1`, `S2`)                                     | **done** — `handle` is a family, `FloorConfig.handles` authors it, two on one floor are carved and told apart |
| two one-way drops                                           | **done** — `FloorConfig.oneWays` carves a directed passage between two named sections; art is still a plain corridor, and only the develop journey may stand one |
| a mark pairing each lever to the doors it drives            | **done** — `RoomCell.mark`, one glyph on one ground worn by the lever and every gate it owns |

The walk itself needs nothing: `LockSpec.oneWays` and `movesFrom`'s one-way step already exist and
are already consumed. What is missing is every way of _producing_ a lock.

---

## The six steps

### 1. One-way edges, in the carve

**Ships:** an author names two sections and gets a directed passage between them, walkable one way
only, on the develop-only journey. `docs/one-way-edges-implementation-plan.md` carries the tasks.

**Why first:** independent of everything else, and `doubleBack` needs two of them. The walk already
consumes `oneWays`, so this closes the loop on a primitive that is half-built.

**The shape:** `FloorConfig.oneWays?: { from: string; to: string }[]`, naming section addresses. A
one-way is a grid edge between two _adjacent_ cells, so this is a carve constraint like `forks` is —
the attempt is rejected and re-seeded when no pair of adjacent cells spans the two sections, and the
floor fails by name after the attempts run out.

**Do not ship it on an authored pyramid.** Until step 2 draws it, a one-way's mouth is drawn as an
ordinary open corridor from below — a passage the player can see and cannot take. The develop-only
journey is where it lives until then.

### 2. Drawing a one-way

**Ships:** a one-way that reads as a drop from above and as an opening too high to climb from below.
The gate before any shipped floor authors a drop.

**Why it is not part of step 1:** `isPassable` (`src/app/SiteMap/roomClaims.ts:351-376`) collapses a
boundary into one symmetric boolean — `cell.dirs.has(dir) || neighbor.dirs.has(OPPOSITE_DIR[dir])` —
and that boolean is the single `OpenBetween` predicate (`src/app/SiteMap/tileRegions.ts:43`) deciding,
once per shared boundary, whether the gap is drawn as floor or as wall. **One rect per boundary, drawn
once**, so today the same physical tile cannot look different depending on which room you stand in.

Making `isPassable` direction-aware is the wrong fix: `isForkMeetingClaim` (`roomClaims.ts:365-368`)
depends on the symmetric reading, which is what merges a fork's rooms across a shared void cell. What
this step needs is a rendering-only signal alongside `OpenBetween`, reaching the two gap branches in
`buildTileRegions` (`tileRegions.ts:212-232` north, `:234-250` west), so a one-way boundary can pick a
different tile per side.

**Art:** new. Nothing in `art/masters/props/` covers a ramp, a shaft or a drop, and `pit` is retired
scenery. Goes through the full pipeline in `docs/instructions/prop-pipeline.md` — mesh, spin,
scaffold/mask/shadow, `yarn repaint`, `yarn import-tile`, master under `art/masters/props/<tier>/`,
and its exact invocation recorded in `art/rebuild.sh`.

**Decide before drawing:** whether the drop is one asset seen from two sides or two assets. The
answer changes the render signal, so settle it with the first sketch rather than after.

### 3. Marks

**Ships:** a mechanism and every gate it owns wear the same glyph on the same coloured ground, so a
player can tell which lever drives which door.

**Why it is cheap, and why that is worth knowing:** **no painted art is needed.** The grounds exist
(`keyColorHex`, `src/ui/tokens/keyColors.ts:7-13`, already tinting gates and treasure badges). The
glyph alphabet exists and is already a wired webfont — `HIEROGLYPHS_IN_FONT`
(`src/ui/tokens/hieroglyphFont.generated.ts`, ~330 codepoints) shipped as
`src/assets/hieroglyphs.subset.woff2` and bound to `--font-mono` in `src/index.css:79-88`, so any
`font-mono` span already renders them. `HieroglyphTile.tsx:215-233` draws exactly "a glyph on a
coloured ground" today, in a different context.

So a mark is a small component — a `KeyColor` plus a codepoint — living beside `nodeShapes.tsx`, and
the work is wiring it into `GateNodeShape` and into whatever a mechanism draws. Nothing composites a
glyph onto a cell today, which is the whole of the gap.

**Independent of the rest.** It can be picked up at any time, and everything after it is more
readable for having it.

### 4. The handle

**Ships:** a lever a player throws, with positions, that opens a door somewhere else on the floor.

**The family:** `key-gate` is the precedent for a family with no generator — meta carrying only
`id`/`ownerMod`/`tags`/`icon`/`color`/`rewardPriority`, a `generate` returning a bare `{ satisfied }`,
no `seedable` because there is no board to bake. A handle adds `reEnterable: true` (a lever you cannot
throw back is a one-way key wearing a lever's coat) and `stateIsTheMechanism: true`.

**The map:** a new `ShapeKind` (`src/app/SiteMap/nodeKinds.ts:9`), a case in `shapeKindFor`, a shape
component in `nodeShapes.tsx` plus its case in `NodeShape`'s switch, and a `nodeRadius` entry. If the
lever is to stand as furniture rather than only as a marker, that is a prop tile per rank through the
step-2 pipeline — worth deciding deliberately, because the marker alone may carry it.

**The part most likely to be underestimated: persisted state.** The shipped switch stores
`openWaysOut` per journey in `src/app/state/useJourneys.ts` — "which ways out are open". A floor with
three mechanisms needs "which position is each mechanism in", per floor, surviving a reload, with the
save migration to get there. The switch's version looks like it already solved this and does not: it
stores the _consequence_ (open ways out), not the _state_ (which position). Generalising it is real
app work and it belongs to whoever builds this step.

### 5. Regions in the carve, and the lock that gates them

**Ships:** a floor authors a coarse layout of named regions and the connections between them; the
topology mod puts gates and mechanisms on those connections.

**The five questions this step was blocked on are answered** (2026-09-27), and the shape they settled
on is not the one the step was named for. Two things moved: a region turned out to belong to the
floor rather than to the lock, and the rule that governs all of it is about who may decide.

**THE BUILDER MAY REFUSE, BUT IT MAY NEVER DECIDE QUIETLY.** A floor whose puzzle is pointless is the
author's mistake and ships. A floor the builder silently reshaped is a bug. `siteAssembler` already
holds this line — it refuses a duplicate label, a misnamed one-way and an impossible lever by name,
before a wall is carved — and everything below is an application of it.

#### A region is a named area in the plan, not a gate partition

The design document defines a region as "everywhere reachable without passing a gate". **That
definition is retired.** A region is a named area in a coarse layout; a gate is optional furniture on
a connection between two of them, and two regions may be joined with no gate at all.

The walk is unaffected and needs no reconciling: `floorLock` derives its own partition by flooding the
ASSEMBLED grid and stopping at gates, so the author's regions and the walk's regions are different
things that never have to agree.

#### Regions are core. Gates and mechanisms are the mod.

| Authoring                                     | Owner            |
| --------------------------------------------- | ---------------- |
| regions, their connections, their content appetite | core, structural |
| gates, switches, one-ways                     | topology mod     |

Not because of locks. **Four of the six catalogue features act on regions**: a lock gates the
boundaries between them, `waterline` floods one from within, `cosmicDust` re-lays which corridors
connect them, `sandSlide` blocks one. Regions belong to whoever owns the floor.

This is the `forks`/`switches` split one size up, and it buys the same guarantee: **toggle the
topology mod off and the identical walls carve with every door standing open.** Not "roughly the same
amount of content" — the same floor.

#### The lock is structure; the floor is content

A lock names regions and their connections and says what each region will TAKE — a reward, puzzle
rooms, nothing — without naming what. The floor authors its content as it always has. The builder
matches appetite to content.

This is what makes a container reusable, which the design document asked for and then contradicted by
putting content inside regions: a lock with rooms baked in can be placed exactly once. It also makes
the master and wizard conversion additive — add a lock, keep the content authoring already there —
which is what "a floor can be converted when someone gets to it rather than all at once" requires.

#### `startsOpen` is struck

A gate stands open if and only if its owner's initial state opens it, which a binary lever already
does. Every gate has an owner (`checkLockSpec` refuses one without), every owner has an initial
state, and the carve never places an open gate — the cell carves shut and `openDoorsFor` opens it.
The field is not built.

#### No tree rule. Cycles are allowed, gated or not.

The ban on gate cycles is dropped. A loop that bypasses the puzzle is a badly designed puzzle and
that is the author's to own.

**Known and accepted: the walk will not tell them.** `walkLock` asks whether a lock can be solved and
whether any sequence strands the player; a bypassing loop answers well to both and ships green. The
check that would catch it is in "What the walk still cannot see" below.

#### What this costs, measured rather than assumed

The roadmap previously said the two-level limit "is in the type, not the algorithm". **That is wrong.**
Measured 2026-09-27:

- The DSL and serializer are **already recursive**; the types are two lines; the save format costs
  nothing, because nothing in `src/` parses a positional address back into indices.
- The limit is in the **assembler**, which is a hand-unrolled two-level machine — about 600 lines
  written twice (placement at `:1028-1102` vs `:1110-1275`, room specs at `:1601-1718` vs
  `:1728-1850`, three parallel cell-metadata blocks at `:1435-1497`).
- Section hashes carry one parent index rather than a path, so fixing them moves every hash in the
  world. **Free under this release's save reset.**

**The region layout is therefore a NEW core pass, written recursive with loops from the start**, and
`sideSections` carve inside a region exactly as they do today. The 600-line de-duplication is not on
this step's critical path; it is worth doing on its own merits and against byte-identical output.

**Rejoining branches already ship** — 33 of 213 floors have cycles in the section graph — but
`edgeAllowed` (`siteAssembler.ts:1429-1434`) drops any rejoin where either end is gated or sealed.
Measured A/B over 200 seeds: ungated 411 rejoin links, sealed 0. A region layout is all gated regions,
so the new pass must own this rather than inherit it, along with `doorsToEnter` (the authored version
is structural where a switch's is already a real BFS) and fog restore (`applyExplored` remembers a
section by a high-water mark along a linear chain; a region with rejoining branches has no single
"how far along").

#### Two live bugs to fix first — the builder deciding quietly

Both found 2026-09-27 while measuring the above, both independent of this step, both exactly the class
the rule at the top forbids:

1. **A three-level config assembles successfully and silently drops the third level.** `success: true`,
   an authored level-3 gate carves no gate room, `validateSite` returns valid. The DSL will build such
   a config with no cast, so the authoring path can already produce a floor whose deepest level does
   not exist.
2. **The duplicate-label check cannot see level 3.** `sectionAddresses` (`siteAssembler.ts:164-186`) is
   a doubly-nested loop, so a level-3 label colliding with a level-1 label passes — the save-key
   data-loss bug that function exists to refuse.

`src/game/seeds/boardIndex.ts:48-50` had already written half of this down: "Nesting stops one level
down because that is as deep as the assembler carves — anything deeper is authored but never built."

#### What the walk still cannot see

Both REPORT to the author rather than deciding anything, which is why they are allowed to exist. Both
belong to verifying a lock standalone — the owner's ruling that a container is checked between its own
ports, not by a floor-wide sweep.

**1. EVERY REGION MUST BE REACHABLE, AND THIS ONE IS REQUIRED.** Solvable is not enough. Once regions
carry the floor's content, a region no reachable state stands in is **loot a player can never
collect**. Two levers can deadlock, each behind the door the other opens; `walkLock` calls that sound
because nobody is stranded and the way out stays reachable.

Phrase it over regions: _a region no reachable state stands in, every bounding gate of which is owned
solely by on-floor mechanisms_. Measured 2026-09-27: fires on **0 gates across 206 shipped floors**,
and flags 4 on a deliberately deadlocked control, so it costs nothing to adopt.

**It also closes a hole in the loot economy that predates locks.** `placeFragments` walks the finished
world "with authored doors standing open" and hands what it finds to every world validator. That is
safe for a floor key — find it and the door opens, always — and **unsafe for a mechanism-driven gate**,
which opens only in states the mechanism can reach. Nothing today would report a chest behind a door
that can never open.

So three brackets, which must not be confused:

| Question                | Bracket                                                              |
| ----------------------- | -------------------------------------------------------------------- |
| Is the lock sound?      | ward keys assumed **shut** — keeps the proof local to the container  |
| Is this loot reachable? | authored doors assumed **open** — reachable at any point counts      |
| Is this region reached? | mechanism gates use **the walk**; ward and off-floor keys assumed openable |

The third is the new one and it sits between the other two. `junior_2` L2 F0's deliberately
unreachable ward pocket stays legal, because its key is earned elsewhere in the world; a region behind
a lever that can never be thrown does not.

**2. A gate nothing depends on.** Is there a reachable state where shutting it changes whether the exit
is reachable? A gate that never matters is decoration, and it is what a bypassing loop looks like from
outside. Optional — a pointless puzzle is the author's to own — but it is the only thing that would
tell them.

#### Still to settle before this can be planned

- **`lockWalk` only knows how to shut a boundary.** A flooded region is one the player may not OCCUPY,
  which is not the same as one whose doors are shut — a shut door leaves whoever is already inside
  inside. Modelling a flood as "gates on every boundary" loses that difference. The extension is small
  and well defined, but it is real and it is P1's ("blocked-until with a registered opener") natural
  home, applied to a region rather than to a boundary.
- What a region's content appetite vocabulary actually is, beyond "reward / puzzles / nothing".
- Whether a region carries a main-path or side-path role, and what reads it.

### 6. `doubleBack`, authored

**Ships:** the worked example as a real floor, walked by the build sweep, playtested.

Steps 1, 3, 4 and 5 are its prerequisites; step 2 is its prerequisite for shipping to a player rather
than to the develop journey. When it lands, **move the example out of `lockWalk.spec.ts`** — it is a
fixture there only because there is nothing to author it with, and a design document plus a fixture
are two lists that must agree by hand. That is how its second drop went missing.

What stays in that spec is what tests the walk: the moves, the owner fold, the two questions, the
ceiling. It must not grow a case per authored floor — a lock's soundness is a property of the
container between its ports, verified once by the sweep.

---

## What can be picked up right now

| Step             | State                                                        |
| ---------------- | ------------------------------------------------------------ |
| 1. One-way edges | **planned** — `docs/one-way-edges-implementation-plan.md`    |
| 3. Marks         | ready to plan; no art, no decisions outstanding              |
| 4. The handle    | ready to plan once the persisted-state shape is chosen       |
| 2. Drawing       | ready to plan once the one-asset-or-two question is answered |
| 5. The container | **needs a design session first** — the five questions above  |
| 6. `doubleBack`  | blocked on 1, 3, 4, 5                                        |

Steps 1, 2, 3 and 4 are independent of each other. Only 5 and 6 are a chain.

---

## What step 1 left for step 2

Step 1 is built: a floor authors `oneWays`, the carve places or refuses them, the walk is told about them, and the develop journey stands one. Five things it deliberately did not finish, and the first is a gate on step 2 rather than a suggestion.

**Fix the drop connector's ordinal before any shipped site stands a drop.** Saves reset for this
release and the story work above it, so no migration is owed — which makes this cheap to change
rather than optional. The collision is not a migration problem: it is wrong inside a single
playthrough, from the first visit. A drop's connector takes the SOURCE section's address but an ordinal pairing a step of the source with a step of the landing, so a drop from `upper` step 1 into `lower` step 0 files under `upper#<floor>/~0|1` — the same save key as `upper`'s own connector between its steps 0 and 1, which exists on any chain of two or more cells. Two cells, one identity: `findByAddress` returns whichever comes first in row-major order, and the same number drives fog against the source section's high-water mark, so the connector un-fogs early or never. It reaches only the develop journey today because `standOneWayDrops` is false on every pyramid and tomb.

The rest are smaller, and none can reach a player while the capability holds:

- **The gate table mints a two-way gate across a drop's first edge** when the drop leaves a cell that is itself a door. Traced: it cannot mask a verdict today, because the spurious edge only returns the player to the state they fell from and the landing is checked on its own. It is a second notion of the drop's edge living in the gate table, and it wants a reciprocity guard before that table gains another reader.
- **`doorsToEnter` is not every door.** A room carrying `requiredKeyId`/`requiredKeyIds` from a family's own key requirements — a hieroglyph tableau, say — is a real barrier the walk respects, and nothing writes it into the map. A drop landing past one hands over ground behind a door the player has not earned. The switch-door walk already generalises: run the same "shut this node, see what the way in stops reaching" loop over every room with a key requirement. Until then the map's comment overclaims and should say so.
- **`sealed` isolation is recorded as a door**, so a drop in or out of a sealed stretch is refused although nothing there is earned.
- **One assertion in `oneWayCarve.spec.ts`** ("fails by name when no attempt can place the drop") checks for an `only`→`main` edge without filtering for one-wayness, so an ordinary attach passage satisfies it. Match its three siblings.

---

## What the rendering spike found (step 2)

Looked at, not reasoned about: a throwaway Storybook story rendering a real carved floor that stands a
drop, with crude marks drawn at the boundary and at the connector cell.

**Both readings work at map zoom, so legibility does not decide between them.** A plug stone drawn
into the boundary's 56x28 gap reads as a pale-topped slab across the passage; a fissure-and-line drawn
on the connector's 56x56 floor square reads as a dark break with a bright line over it. For scale: the
node markers that already read on this map are 38-40px, so the gap was never short of room.

**Direction is not carried by either.** The stone's shadow wedge and the line's slope are both too
subtle at this size. Chevrons in the map's own idiom — the language of the exit arrow — do carry it,
but they read as a sign on the map rather than as a thing in the world. That is the open choice, and
it is a design decision rather than a drawing one: **is a one-way a place or a sign?**

**A rendering defect blocks any art going in.** A one-way's two boundaries are painted `#000000` over
floor that is otherwise drawn correctly underneath:

```
gap above the connector:  fill=url(#floor-junior)  + a #000000 path on top
an ordinary corridor gap: fill=url(#face-junior)   + #241708
```

Black is the map's deliberate mark for the mouth of an unexplored passage. Something in that path
treats a cell with a single `dirs` entry as unexplored. Until it is fixed, anything drawn at a drop
sits under a black overlay. This is the first thing step 2 must do, before any art is commissioned.

**The geometry, measured, for whoever draws next.** Cells render 56x56 at a pitch of 70 across and 84
down; the boundary gap above a cell is 56x28, the one beside it 14x56. A cell `(r, c)`'s floor sits at
`((c + 1) * 70, 112 + r * 84)` relative to `[data-map]`. Deriving this from `CELL` alone gives the
wrong answer and puts every mark in the wrong place — which happened once here, and produced a
confident conclusion that had to be retracted.

### A one-way is a place, and the movement markers carry the rule

Decided by the owner after the spike. The drop is drawn as somewhere the player is, not as a sign
about somewhere: a fissure across the passage with a line strung over it, anchored on the near side.
The zipline reads, and it says why the way is one-way without a symbol to learn.

**What says you cannot go back is the movement marker, at the moment you try.** Standing at the
landing, the marker that would take the player back the way they fell is drawn struck through or
disabled rather than left out. Absence teaches nothing — a missing arrow is indistinguishable from a
wall — while a barred one says the way exists and is not yours.

The machinery is already there and already holds the right opinion. `RunTargetArrow` draws a gold
arrow pointing the first step out of the player's own cell, `ReachableDot` marks a corner, and both
are "outlined and fully opaque, because they have to read on any floor the game has ... so the player
learns a single shape rather than a per-tier one" (`SiteMapView.tsx`). A barred variant is that same
shape with a bar across it, which is the cheapest thing that could work and the most consistent.

One accident already in the feature's favour: a one-way's connector has a single `dirs` entry, so
`isCorridorCorner` counts it as a corner rather than a straight-through, and it is already a click
target the player must choose rather than ground they are walked across.

### What a one-way does, from each side

Settled by the owner. The drop runs from a source node, through a connector, to a landing.

- **From the source it is an ordinary corridor.** It looks normal, it walks normal, and the reveal
  runs through it the way it runs through any corridor. The player takes it without ceremony.
- **From the landing you see into the corridor but not past it.** The connector itself shows; what
  lies beyond stays dark. A passage the player cannot see teaches them nothing, and they would never
  learn why the way is barred.
- **At the landing, a disabled arrow points at it.** The way exists and is not theirs.

This overrules the design document's line about a one-way being "a blind spot the player must click":
that was written as an accident in the feature's favour and is not what the feature wants. From the
source side a drop reveals like any corridor. `docs/mods/floor-topology-design.md` still says the
opposite and wants correcting.

The middle behaviour is the one neither the code nor the plan had: the connector is **visible from
the landing without being enterable**. The landing holds no direction into it, so nothing reveals it
from that side today, and the passage would simply not exist as far as the player could tell.

### What the art costs

**Three drawings per rank, not four.** The two horizontal directions are one asset mirrored left to
right. The two vertical directions each need their own: a vertical flip would put the up-facing top
surface at the bottom, against the projection's own rule that a block is an up-facing band on top and
a viewer-facing rectangle below.

Because the drop is drawn on the connector's own 56x56 floor square rather than in the boundary gap,
the east-west sliver problem raised earlier does not apply — orientation is which way the line runs
across a full cell, not how much wall face there is to draw on.

---

## What waits on this road, and why it is worth the bar

Told by the owner, 2026-09-27, and recorded because none of it is written down elsewhere.

The story layer is not blocked on step 6 landing `doubleBack`. It waits on **the whole re-authoring of
master and wizard** — the 58 floor-key gates, 56 of them in those two tiers — together with **the
hourglass mechanic**, and on **a pyramid standing full of sand that clears a little at a time as other
pyramids in the same journey are finished**.

That last one is journey-scoped progress gating a site's interior, which is P5 in the design document's
primitive table (`../mods/floor-topology-design.md`, "Currency scope — journey, beside positional and
world-spread") reaching past a single floor the way `cosmicDust` and `hourglass` do. It is not costed in
the six steps above; it arrives with them.

So the chain is long: handle → container → `doubleBack` → master and wizard re-authored → hourglass →
the sand pyramid → the story layer on top. **That is the main meat of the release**, and all of it stands
on the ingredients this file lists. It is the concrete reason the bar at the top of this document — an
ingredient is held higher than a floor — is not a slogan: a sloppy state model here is sloppy in all 56
of those gates and in everything stacked above them.
