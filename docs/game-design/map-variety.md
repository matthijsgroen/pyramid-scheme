# Map variety — what a floor could be, and what each option would say

Feasibility, on the premise that **a mechanic is storytelling vocabulary**. A hidden corridor already says
_somebody concealed this_ without a line of dialogue; the question is what else the floor could say.

## The finding: floors loop, rarely, and least where they are biggest

An earlier draft of this document claimed there were no loops. That was wrong — it counted how sections
_terminate_ (843 in a reward, 90 at a staircase), which says nothing about corridor shape inside one. Open
main sections do loop, and gate isolation holds.

Measured properly, by assembling every floor of every journey at its real seed and taking the cyclomatic
number of the walkable graph — edges minus cells plus components, where 0 is a tree:

| Tier    | Floors | With any loop | Total cycles | Cells |
| ------- | ------ | ------------- | ------------ | ----- |
| starter | 10     | 3             | 11           | 1329  |
| junior  | 10     | 4             | 21           | 1555  |
| expert  | 12     | 1             | 4            | 2722  |
| master  | 18     | **1**         | **1**        | 3691  |
| wizard  | 24     | 2             | 7            | 5285  |

**Eleven of seventy-four floors loop at all**, and the density runs backwards: junior gets 21 cycles across
1,555 cells, master gets **one** across 3,691. The three largest floors in the game — `wizard_3 f1` at 739
cells, `wizard_1 f1` at 481, `master_1 f0` at 433 — are perfect trees.

So loops are **incidental rather than authored**: they fall out of small sections packed into a small
grid, and they stop happening exactly as floors get big enough for the walk to matter.

### Why master is a tree, measured twice

Gating is the constraint that would stop loops being _added_, but it is not what produces today's numbers.
Counting gate cells per floor against cycles:

| Gates on the floor | Floors | Avg cycles | Avg cells |
| ------------------ | ------ | ---------- | --------- |
| 0                  | 14     | 0.0        | 109       |
| 1                  | 43     | 0.5        | 155       |
| 2                  | 4      | 2.8        | 202       |
| 3                  | 5      | 1.0        | 332       |
| 4                  | 3      | 0.3        | 389       |
| 5+                 | 5      | 1.4        | 550       |

And gates per floor barely move across tiers: starter 1.3, junior 1.1, expert 1.7, master 1.6, wizard 1.6.

So gate **count** does not separate master from junior — cycles do not fall as gates rise, and the 2-gate
bucket loops most. What tracks instead is **size**: a 109-cell floor has no cycles at all, and cycles per
cell fall steadily as floors grow. Today's loops are an artifact of packing — sections crammed into a small
grid put corridors accidentally adjacent, and a big grid has room to avoid it.

### The rule that matters: isolation constrains cut edges, not cycles

Isolation is a property of the edges that **cross a gate boundary**. It says nothing about a cycle that
lives entirely inside one region. Master floors carry several regions each, and every one of them could
loop internally without touching isolation.

| Loop                             | Isolation                                     | Reachability | Solver          |
| -------------------------------- | --------------------------------------------- | ------------ | --------------- |
| wholly inside one region         | untouched                                     | untouched    | none            |
| crossing a gate, both ways       | **broken** — the gate becomes decoration      | —            | —               |
| crossing a gate, **one-way out** | preserved — the key is still needed to get IN | untouched    | none, see below |

That last row is the one the game does not have.

_(The measure counts 4-adjacency of non-empty cells as connection, which can only over-count edges. Real
cycle counts are these or lower, so the shape of the finding holds.)_

## The floor is ninety per cent corridor

Measured over every floor of every journey, at its real seed:

| Tier    | Floors | Cells/floor | Corridor | Encounters | Cells per encounter | Extent  |
| ------- | ------ | ----------- | -------- | ---------- | ------------------- | ------- |
| starter | 10     | 133         | 90%      | 8.4        | 15.8                | 19 × 18 |
| junior  | 10     | 156         | 90%      | 10.2       | 15.2                | 21 × 21 |
| expert  | 12     | 227         | 91%      | 15.1       | 15.0                | 28 × 26 |
| master  | 18     | 205         | 91%      | 12.8       | 16.0                | 25 × 26 |
| wizard  | 24     | 220         | 92%      | 13.4       | 16.4                | 26 × 26 |

**Nine cells in ten are hallway, and the player walks about sixteen of them per encounter.** The ratio is
near-identical across all five tiers, so this is a constant of the carve rather than something that drifts
as floors get bigger.

### It explains the review's camera complaint too

_"You built a stage and shot it through a mail slot"_ — the frame is mostly empty. That and the walking are
**the same fact**: there is little to look at because nine tenths of what exists is corridor. Lighting and
framing make the same hallway prettier; they do not make it shorter.

### Two complaints, two very different prices

**Scrolling** is how much floor fits on screen. Extents run to 26 × 26 cells, so at any legible zoom a
floor is several screens in both directions. That is **render-side — Pile A**, free, and the HTML port is
already in that code.

**Walking** is how many cells sit between encounters. That is the carve — **Pile B**, and it wants the
migration the rest of Pile B wants.

Worth fixing in that order: a floor that fits on one screen may not feel long even at sixteen cells an
encounter, and it costs nothing to find out.

### Encounters are authored, and that makes the constant mean something

Encounter count is not a generator outcome — it is authored, in `src/worldGen/spec/*.ts`, through
`pathPuzzles`, side sections and node selectors. The carve does not decide how many rooms a floor has; it
decides how much hallway to put between them.

Which turns the table above into a ratio worth reading twice:

| Tier    | Encounters (authored) | Cells (carved) | Cells per encounter |
| ------- | --------------------- | -------------- | ------------------- |
| starter | 8.4                   | 133            | 15.8                |
| junior  | 10.2                  | 156            | 15.3                |
| expert  | 15.1                  | 227            | 15.0                |
| master  | 12.8                  | 205            | 16.0                |
| wizard  | 13.4                  | 220            | 16.4                |

**The carve produces fifteen to sixteen cells per authored encounter, every time.** It sizes itself to the
content. So the floor is not big because somebody made it big — it is big because it was asked for that
many rooms, and it spends the same hallway on each.

**Which strikes a lever.** Authoring more encounters does not raise density: it grows the floor and leaves
the walk exactly where it was. Authoring fewer shrinks the floor and leaves it there too. **The walk is not
an authoring problem and cannot be fixed by authoring.**

What is left for walking is one thing: **make the carve spend fewer cells per room.** There is no knob for
it today, so it is new generator work rather than a setting — which is a much bigger job than the table
above made it look.

### Levers, if walking is still wrong after the zoom

| Lever                                 | Effect                                                        | Pile  |
| ------------------------------------- | ------------------------------------------------------------- | ----- |
| Shorter corridor runs between rooms   | the direct fix — fewer cells for the same rooms               | B     |
| ~~More encounters on the same floor~~ | **does not work** — the carve grows to match, same walk       | —     |
| ~~Fewer cells per floor~~             | **authoring fewer encounters just shrinks it**, same walk     | —     |
| **Wider room footprints** (B6)        | raises the room-to-corridor ratio **as seen**, at render time | **A** |
| Something in the corridors (1, 6, 7)  | does not shorten the walk; makes it worth having walked       | **A** |

**The last two are the reason to finish the catalogue before touching the carve.** Wider footprints and
things worth seeing in a hallway both attack "the floor feels empty" without a migration — and if they are
enough, the sixteen-cell walk stops being the problem it looks like now.

`pathPuzzles` is not the knob here: it is the number of **rooms** on a chain, so it lengthens the walk by
adding encounters rather than by adding hallway. What sets the corridor length _between_ rooms is the carve
itself, and nothing authored reaches it.

### Open

1. **Does the map fit-to-screen today, and at what cell size?** `CELL` is 56 SVG units and a floor is up to
   28 wide. If it does not fit, that is the whole scrolling complaint and it is free.
2. **What sets corridor run length, and can it be a knob?** This is now the only lever on walking, since
   authoring cannot touch it. Same shape of question as loop density, and the same answer would serve both.
3. **Is sixteen cells actually wrong?** It is consistent to two significant figures across 74 floors, which
   means it was chosen, whether or not anybody remembers choosing it. Nothing here proves it is too long —
   only that it is what the player is doing.

## The catalog

Nothing here ships alone. The intent is a **complete catalog first**, then one implementation pass — so
the axes below exist to show what is missing as much as what is proposed.

### What a map mechanic can vary

Six axes. Every entry in the catalog is a point in this space, and an empty region is a mechanic nobody
has thought of yet.

| Axis             | Values                                                            |
| ---------------- | ----------------------------------------------------------------- |
| **Connectivity** | none (decoration) · adds an edge · removes one · changes a region |
| **Direction**    | both ways · one way                                               |
| **Opened by**    | nothing · a key · a lever · a tool · never                        |
| **Visibility**   | invisible · visible when near · visible from afar                 |
| **Persistence**  | permanent once opened · always open · never opens                 |
| **Footprint**    | one cell · a corridor · bigger than a cell                        |

### The catalog itself

| #   | Mechanic                   | Says                                        | Connectivity           | Cost   | Status                          |
| --- | -------------------------- | ------------------------------------------- | ---------------------- | ------ | ------------------------------- |
| B1  | Ward gate                  | somebody locked this                        | region                 | —      | **built**                       |
| B2  | Floor key                  | do that first, then this                    | region                 | —      | **built**                       |
| B3  | Hidden corridor            | somebody concealed this                     | adds edge              | —      | **built**                       |
| B4  | Side path                  | there is more than the way on               | adds edge              | —      | **built**                       |
| B5  | Staircase                  | down is further in                          | adds edge              | —      | **built**                       |
| 1   | Blocked passage            | this place was bigger than you can reach    | **none**               | free   | proposed                        |
| 2   | Loop density dial          | people moved through here                   | adds edge              | tuning | proposed                        |
| 2b  | One-way crossing           | somebody crossed here and did not come back | adds edge, one way     | small  | proposed                        |
| 6   | Window or grille           | there is something there, and not yet       | **none**               | small  | proposed                        |
| 7   | Informational dead end     | the reward here is knowing something        | none                   | free   | proposed                        |
| 8   | Lever-opened shortcut      | somebody closed this from the other side    | adds edge              | small  | proposed                        |
| 9   | Second way in              | you know this place from the other side now | adds edge              | medium | proposed                        |
| B6  | Chamber bigger than a cell | this room mattered                          | footprint, render-time | —      | **built**, partial              |
| 4   | One-way drop that strands  | you are committed now                       | adds edge, one way     | —      | **declined** — superseded by 2b |
| 5   | Vertical layers            | the building has depth                      | region                 | large  | last                            |

**A floor is one plane.** Any mechanic whose fiction needs height is really entry 5, at entry 5's price — which rules out shafts, ledges and drops before they are designed, and is why 2b is a chasm rather than a shaft.

### The one-way crossing, in detail

**The game has no directed edges.** Every connection works both ways, which is why a loop either respects
isolation or destroys it, with nothing in between.

**And there is a constraint that prunes half the obvious fictions: a floor is one plane.** Anything whose
one-wayness comes from _height_ — a shaft you drop down, a ledge too high to climb — is option 5 in
disguise and costs what option 5 costs. A one-way that works here has to be one-way **in plan view**.

Two that are:

**A rope across a chasm.** The rope hangs on the far side; you grab it, swing over, and it swings back out
of reach. Flat, drawable top-down as a break in the floor, and the crossing is one-way away from where the
rope rests.

The placement rule follows from that: **the rope hangs on the deep side.** Arriving from the walked side
you see a chasm with a rope you cannot reach — which is the window (6), a visible promise you cannot take
yet. Come round through the gate, reach the far side, and the same rope swings you home. **One asset, a
promise on the way in and a shortcut on the way out.**

**A current in a flooded corridor.** `condition` already puts standing water through a site; water that
_moves_ carries you one way and not back. It costs a drawing and an animation rather than a mechanic, and
it reuses something authored.

**Direction decides how it feels.** An earlier draft declined one-way drops on tone, and that was too
broad:

| Direction                                                 | Feeling                              |
| --------------------------------------------------------- | ------------------------------------ |
| one-way **in** — you cross and cannot get out             | commitment, and dread. Not this game |
| one-way **out** — you cross into somewhere already walked | relief. The walk back, deleted       |

Only the second is proposed. It strands nobody, because it lands where the player has already been.

**And it costs the solver nothing.** A one-way that only ever leads to already-reachable ground adds no
reachable content — everything it leads to was reachable before it existed. So reachability does not have
to become directional: the solver can ignore these edges entirely, as long as placement guarantees the
direction.

What it says: _somebody crossed here once and did not come back this way._

### The other new ones

**6 — a window or grille.** You can see into a region you cannot reach. **No connectivity at all**: it is a
drawn opening showing the room beyond. The review called a locked door the game's best hook and said the
map only whispers it — this is the version that does not whisper, and it costs no graph change, no solver
work and no save consequence.

It pairs with everything else: a window onto a ward-gated room is a promise, a window onto a room with a
rope hanging in it is a route you have not found yet.

**7 — the informational dead end.** Every branch in the game currently ends in a reward: 843 of them. So a
branch is never a gamble and taking one is never a judgement. The fix is not empty dead ends — players
rightly hate those — but dead ends that **pay in information**: a blocked passage, a window, a rope out of
reach. The player learns something about the floor instead of collecting something from it.

This is free, and it is what makes 1, 6 and 2b worth placing at all.

**9 — a second way in.** Arriving on a floor from a different staircase on a later visit. It is a loop at
floor scale rather than corridor scale, and it is the one entry that directly serves the backwards map: the
floor you re-enter at wizard tier is not the walk you remember.

Medium cost, because it touches how a floor is entered rather than how it is carved.

### Where the catalog is thin

Reading the axes against the entries, two regions are empty:

- **Nothing REMOVES an edge.** No passage closes behind you, no route is available once and not twice.
  That is probably correct for this game — it is the same family as the stranding drop, and it punishes.
  Recorded so it is a decision rather than an oversight.
- **Nothing is opened by a TOOL** except the hidden corridor, which is opened by a detector only in the
  sense of being found. A door that needs a thing you carry, rather than a key you were given, is a whole
  unexplored column — and the perk list already has candidates (`pack-mule`, `armor`, `trap-insight`)
  that currently only change numbers.

That second one may be the most interesting gap in the table, and it is the only one that would make a
perk feel like a verb rather than a statistic.

## Order, once the catalog is full

**2 with 2b, then 1.** Loop density is a dial on machinery that already works and already produces loops — the
cheapest real change here, and it lands where the walking is worst. The blocked passage is free and makes
floors read as ruins rather than corridors.

2b rides with 2 — it is what makes a loop legal across a gate. 4 is declined
and superseded. 5 is last, and probably never.

## Open

1. **What sets loop density today?** It is evidently a consequence of section packing rather than a knob.
   Finding the knob, or adding one, is the whole of option 2.
2. **What is the right dose, and should it scale with cells?** `junior_2 f0` carries 16 cycles in 221
   cells and reads fine, so the ceiling is not low. The target is probably a rate, not a count.
3. **Does a one-way ever point at something new?** The solver can ignore these edges only while they lead
   to already-reachable ground. One that opens new content makes reachability directional, which is a
   different and much larger job.
4. **Do blocked passages want to lie occasionally** — one of them being a hidden corridor after all? It
   makes every other one interesting, and it makes the detector mean something.
