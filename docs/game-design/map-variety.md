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

| #   | Mechanic                   | Says                                          | Connectivity       | Cost     | Status       |
| --- | -------------------------- | --------------------------------------------- | ------------------ | -------- | ------------ |
| B1  | Ward gate                  | somebody locked this                          | region             | —        | **built**    |
| B2  | Floor key                  | do that first, then this                      | region             | —        | **built**    |
| B3  | Hidden corridor            | somebody concealed this                       | adds edge          | —        | **built**    |
| B4  | Side path                  | there is more than the way on                 | adds edge          | —        | **built**    |
| B5  | Staircase                  | down is further in                            | adds edge          | —        | **built**    |
| 1   | Blocked passage            | this place was bigger than you can reach      | **none**           | free     | proposed     |
| 2   | Loop density dial          | people moved through here                     | adds edge          | tuning   | proposed     |
| 2b  | One-way rope               | somebody came down and did not plan to return | adds edge, one way | small    | proposed     |
| 6   | Window or grille           | there is something there, and not yet         | **none**           | small    | proposed     |
| 7   | Informational dead end     | the reward here is knowing something          | none               | free     | proposed     |
| 8   | Lever-opened shortcut      | somebody closed this from the other side      | adds edge          | small    | proposed     |
| 9   | Second way in              | you know this place from the other side now   | adds edge          | medium   | proposed     |
| 3   | Chamber bigger than a cell | this room mattered                            | footprint          | renderer | waiting      |
| 4   | One-way drop that strands  | you are committed now                         | adds edge, one way | —        | **declined** |
| 5   | Vertical layers            | the building has depth                        | region             | large    | last         |

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

2b rides with 2 — it is what makes a loop legal across a gate. 3 waits for the HTML port. 4 is declined
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
