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

So loops are **incidental rather than authored**: they fall out of small sections packed into a small grid,
and they stop happening exactly as floors get big enough for the walk to matter. `junior_2 f0` has 16
cycles in 221 cells; `master_3 f0` has none in 409.

That inverts the recommendation. The question is not _can floors loop_ — they can, the machinery allows it,
and isolation survives it. It is that **the loops happen where they are least needed and vanish where the
player is doing the most walking.**

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

### 3. A chamber bigger than one cell — renderer work

Every room is one cell, so every room is equally important. A 2×2 space would be a **landmark**: somewhere
to be _from_, and something to navigate relative to.

Cost is in the renderer and the grid, not the fiction. Worth checking against the HTML port rather than
before it.

What it says: _the important places look important_ — and it gives the ghosts somewhere to be that is not
a corridor.

### 4. A one-way drop — structural, and a tone risk

A shaft you go down and cannot climb. Classic, and it makes a floor feel deep.

But it takes a choice away from the player permanently, and this game punishes almost nothing by design.
It also sits badly with the not-scary rule: being unable to go back is the most frightening thing a map can
do to a child. **Probably not this game**, and worth writing down as considered rather than rediscovering.

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

**1, then 2.** The blocked passage is free and immediately makes floors feel like ruins rather than
corridors. The loop is the one that changes how exploring _feels_, and its only real cost is teaching the
solver to check that a loop has not unlocked a gate.

3 waits for the HTML port. 4 is declined. 5 is last, and probably never.

## Open

1. **What sets loop density today?** It is evidently a consequence of section packing rather than a knob.
   Finding the knob, or adding one, is the whole of option 2.
2. **What is the right dose, and should it scale with cells?** `junior_2 f0` carries 16 cycles in 221
   cells and reads fine, so the ceiling is not low. The target is probably a rate, not a count.
3. **Do blocked passages want to lie occasionally** — one of them being a hidden corridor after all? It
   makes every other one interesting, and it makes the detector mean something.
