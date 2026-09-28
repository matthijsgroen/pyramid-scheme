# Regions and containers

Step 5 of `docs/authored-locks-roadmap.md`. What a floor's coarse layout is, who owns it, and how the
pieces compose. The five questions §5 answers are not repeated here; this is the design that follows
from them plus the four that were still open on 2026-09-28.

## The words

| | |
| --- | --- |
| **region** | A named area in a floor's plan. Core. |
| **connection** | A join between two regions. Core. |
| **gate** | Optional furniture on a connection. The topology **mod's**. |
| **container** | A reusable authored layout of regions and connections, entered and left through its **ports**. |
| **port** | A container's boundary — where it joins what is outside it. |
| **lock** | The state machine a container is verified as (`LockSpec`, `walkLock`). You place a container; you walk a lock. |

`doubleBack` is a container. Its regions are `entrance`, `rightLower`, `s1Chamber`, `leftLower`,
`s2Chamber`, `wayOut`; its ports are `in: entrance` and `out: wayOut`.

## A region declares an appetite, and nothing else

A region says what it will TAKE. It never says what fills it.

```
appetite = "reward" | "puzzles" | "nothing" | "free"
```

- **`reward`** — a reward belongs here.
- **`puzzles`** — puzzle rooms belong here. The FLOOR authors how many; the region only says the kind.
- **`nothing`** — a guarantee the region stays empty. A corridor, a junction, a place to stand.
- **`free`** — indifference. The builder may fill it with what is spare, or leave it.

`nothing` and `free` are different instructions and must not be collapsed: one is a promise, the other
is a shrug.

**The vocabulary is meant to grow.** It is one union, EXHAUSTIVELY CHECKED at every point that reads it
(the `default: never` guard, `src/app/SiteMap/nodeShapes.tsx` is the pattern), so adding a kind is a
compile error everywhere that must handle it rather than a silent fallthrough.

**A region never declares a mechanism.** In the `doubleBack` fixture a mechanism names where it can be
thrown — `transitions: [{ from, to, at: "s1Chamber" }]` — so the mod points AT the region. That is the
core/mod split working: toggle the topology mod off and the identical regions carve with every
connection open.

## Composition is authored outside the container

**A region may be filled by floor content OR by another container, and which one is decided where the
container is PLACED — never inside it.**

This is the rule the whole design turns on. A container that named its own guests could be placed once;
a container that knows nothing about them can be placed anywhere. One `doubleBack` then serves both the
version with a small puzzle in its left branch and the version without, instead of two authored
variants — more variety from fewer authored pieces.

It is the same rule as "the lock is structure; the floor is content" (§5), applied one level up: the
container is structure, and what goes in its regions is the placement's business.

### Why nesting does not explode the walk

**A sound container collapses to a passable region in its host's walk.**

Soundness is "solvable, and no order of moves strands anyone". A container with that property can
always be crossed from its `in` port to its `out` port, so a host does not have to model the guest's
states — it treats it as a region you can get through.

That is why a container is verified **between its own ports** rather than by a floor-wide sweep, and it
is not merely tidier: `walkLock` has a `tooLarge` ceiling, and a floor walking the PRODUCT of three
composed locks is exactly what would hit it. Verify each container once and the floor composes for
free.

**The guarantee only holds while soundness does.** If a container could be left in a state it cannot be
got out of, collapsing it would be unsound and the composition rule fails with it. Soundness is
therefore not a nice-to-have on a container; it is the precondition for placing one inside another.

## A region is a stretch of the carve, not an area set aside

Decided 2026-09-28. The carve does not allocate each region a patch of grid before anything is placed.
It carves paths as it does today, and a region is a STRETCH of them — **the main path may cross several
regions**, and a side path hangs inside whichever region it grows from.

From the layout the builder then works: a path may be lengthened, may gain side paths, may take
puzzles or a chest, **however the site builder sees fit**. How it satisfies a region's appetite is its
business, not the author's.

**The acceptance rule is that everything authored is accounted for.** Every puzzle node and every chest
node the floor authors lands somewhere, and the builder can say where. Content that cannot be placed is
refused by name before a wall is carved — it is never dropped, and a region's appetite is never
quietly widened to swallow it. That is the same rule as everywhere else here: the builder may refuse,
but it may never decide quietly.

This is what keeps `sideSections` carving inside a region exactly as they do today, and it is why
regions can be core while gates stay the mod's: without the topology mod the identical stretches carve,
with nothing standing between them.

## Main path is derived, never authored

**A region is main-path if its container's `out` port cannot be reached without entering it** — a
dominator on the region graph, between that container's ports. Everything else is a side path.

Two levels, because a floor composes containers: which containers the floor cannot reach its exit
without, and within each, which of its regions its own `out` cannot be reached without.

This is derived rather than authored on purpose. An authored role is a second statement of something
the graph already implies, and the two drift — which is the defect class this branch has been clearing
all week. It also says the useful thing under cycles, where "the main path" is otherwise ambiguous: a
side path is one you can skip.

## Addresses do not change

A region is NOT part of a cell's address. Sections stay floor-level, the builder matches them into
regions, and `journey : pyramid : floor : path` is untouched — `src/game/stairAddress.ts`,
`sectionAddresses`, `cellSlot`.

**This was the question with a deadline.** Adding a level to an address is free before this release's
save reset and costs a full reset after it. It is answered: no level is added.

## What the pass must own rather than inherit

A new core pass, written recursive with loops from the start. `sideSections` carve inside a region
exactly as they do today. Three behaviours cannot be inherited from the existing carve, measured in §5:

- **`edgeAllowed` drops any rejoin where either end is gated or sealed.** Measured A/B over 200 seeds:
  411 ungated rejoin links, **0** sealed. A region layout is all gated regions, so inheriting this
  means no region ever rejoins another — and rejoining branches are the point.
- **`doorsToEnter`** — the authored form is structural where a switch's is a real BFS.
- **Fog restore** — `applyExplored` remembers a section by a high-water mark along a linear chain, and
  a region with rejoining branches has no single "how far along".

## Every region must be reachable

**Required, not optional.** A region no reachable state stands in is loot a player can never collect.
Phrased over regions: a region no reachable state stands in, every bounding gate of which is owned
solely by on-floor mechanisms.

Measured: **0 hits across 206 shipped floors, 4 on a deliberately deadlocked control**, so it costs
nothing to adopt. It also closes a hole older than locks — `placeFragments` walks the finished world
"with authored doors standing open", which is safe for a floor key and unsafe for a mechanism-driven
gate that opens only in states the mechanism can reach.

## When content does not fit

Matching floor content to region appetite is a packing problem, and a floor can author three rewards
where its regions offer two `reward` slots.

**The builder refuses, by name, before a wall is carved** — the governing rule of this whole area: it
may refuse, but it may never decide quietly. Silently dropping the third reward, or silently widening
a region's appetite to take it, are both the builder deciding. `siteAssembler` already refuses a
duplicate label, a misnamed one-way, an impossible lever and a too-deep section this way, and this
failure joins them.

## Out of scope, deliberately

**`lockWalk` only knows how to shut a boundary.** A flooded region is one the player may not OCCUPY,
which is not the same as one whose doors are shut — a shut door leaves whoever is inside, inside.
Modelling a flood as "gates on every boundary" loses that difference. It is `waterline`'s problem, not
`doubleBack`'s, and it stays parked.

## How it gets verified

- **The dominator, the packing and the reachability check are pure** and belong in unit tests: given a
  region graph and ports, these regions are main; given this content and these appetites, it fits or it
  refuses by this name.
- **The refusal must be watched failing.** Every guard added this week was proved by breaking the thing
  it guards and seeing it go red; a guard nobody has seen fire is the defect class this design is
  trying not to add to.
- **Composition needs a test that a nested container is NOT walked as a product** — assert the host's
  state count, not just that it is sound. A test that only asserts soundness would pass while the walk
  quietly became exponential.
- **Toggle-off is the acceptance gate** (`docs/mods/TARGET.md`): with the topology mod off, the
  identical walls carve with every connection open. Not "roughly the same amount of content" — the same
  floor.
