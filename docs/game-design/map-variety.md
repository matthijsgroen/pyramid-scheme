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

## Options, cheapest first

### 1. A passage that visibly goes nowhere — free

A collapsed or bricked-up opening, drawn, leading to nothing. **No connectivity, no generator change, no
save consequence** — it is a decoration in the existing `wallDecorations` sense.

What it says: _this place was bigger than what you can reach._ That is the cheapest storytelling in the
building, and it is the one thing on this list that could ship in an afternoon. It also quietly supports
the forgery arc's world: places that have been got at before.

Risk: a player who tries to find a way through and cannot will feel lied to. It has to read as **ruin**,
not as a puzzle — which is a drawing problem, not a design one.

### 2. Loops where the floor is big — the machinery already allows it

Loops exist and gate isolation holds, so this is a **tuning** question rather than a feature: the generator
can already produce them, and does, in the floors that need them least.

- **Saves:** structural, but under ordinals that is ~1% of a floor's cells, not the floor
  (`IMPLEMENTATION.md`).
- **Reachability:** a loop only ever ADDS connectivity, so nothing reachable before becomes unreachable.
- **Isolation:** already works — sections stay gated. That was the risk, and it is not one.

What is left is a dial nobody has set: **loop density should rise with floor size**, and today it falls. A
739-cell tree is a long walk back out of every branch; the same floor with four loops is a place.

What it says: _people moved through here_ — a different claim from a tomb, and true of the service
corridors real pyramids have.

### 2b. One-way paths — the only safe way to loop a gated floor

**The game has no directed edges.** Every connection works both ways, which is why a loop either respects
isolation or destroys it, with nothing in between.

A rope dangling down a shaft is the whole design: you jump the last stretch, and it is too high to climb
back. No rule has to be explained — **the drawing is the rule**, which is the wordless standard every
mechanic here is held to.

**Direction decides everything about how it feels.** An earlier draft of this document declined one-way
drops on tone, and that was too broad:

| Direction                                                | Feeling                              |
| -------------------------------------------------------- | ------------------------------------ |
| one-way **in** — you drop somewhere and cannot get out   | commitment, and dread. Not this game |
| one-way **out** — you drop into somewhere already walked | relief. The walk back, deleted       |

Only the second is proposed. It strands nobody, because it lands where the player has already been.

**And it costs the solver nothing.** A one-way that only ever leads to already-reachable ground adds no
reachable content — everything it leads to was reachable before it existed. So reachability does not need
to become directional: the solver can ignore these edges entirely, as long as placement guarantees they
point that way.

**It reads twice, from one asset.** From below, a rope you cannot reach says _there is something up there_
— a waypoint made of architecture, self-curating, no UI. From above, it says _you do not have to walk back_.

What it says: _somebody came down here in a hurry, and did not plan on returning._

### 3. A chamber bigger than one cell — renderer work

Every room is one cell, so every room is equally important. A 2×2 space would be a **landmark**: somewhere
to be _from_, and something to navigate relative to.

Cost is in the renderer and the grid, not the fiction. Worth checking against the HTML port rather than
before it.

What it says: _the important places look important_ — and it gives the ghosts somewhere to be that is not
a corridor.

### 4. A one-way drop that strands you — declined

A shaft you go down and cannot climb, landing somewhere new. It takes a choice away permanently in a game
that punishes almost nothing, and being unable to go back is the most frightening thing a map can do to a
child. **Superseded by 2b**, which is the same mechanic pointed the other way.

### 5. Vertical layers — expensive, weakest want

Real verticality touches the renderer, pathing, and the section hash. It buys atmosphere that lighting and
framing are currently buying more cheaply.

## What each one says, as a sentence

| Mechanic                | What it tells the player without a word  |
| ----------------------- | ---------------------------------------- |
| hidden corridor (built) | somebody concealed this                  |
| blocked passage         | this place was bigger than you can reach |
| loop                    | people moved through here                |
| lever / shortcut        | somebody closed this from the other side |
| big chamber             | this room mattered                       |
| one-way drop            | you are committed now                    |

**Half of these are things the story currently plans to say in dialogue.** A floor that says them itself is
cheaper in every language.

## Recommended order, if it moves

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
