# Map variety — what a floor could be, and what each option would say

Feasibility, on the premise that **a mechanic is storytelling vocabulary**. A hidden corridor already says
_somebody concealed this_ without a line of dialogue; the question is what else the floor could say.

## The finding: a floor is a tree

Counted across the generated world, sections end in exactly two ways:

| Section ends in | Count |
| --------------- | ----- |
| a reward        | 843   |
| a staircase     | 90    |

And the tier diagrams in `pyramid-interior-design.md` confirm the shape — a spine with forks, each branch
running to a reward and stopping. **There is no loop anywhere in the game.**

That is the lever, and it is not room types. In a tree, every discovery has the same shape: walk in, take
the thing, walk back out. In a graph, discovery is _this connects to that_ — coming out somewhere you
recognise is the feeling exploration games actually sell, and this map cannot produce it at all.

It is also why the backwards map is expensive to walk (`IMPLEMENTATION.md` § shortcuts): in a tree there is
never a shorter way back, because there is only one way.

## Options, cheapest first

### 1. A passage that visibly goes nowhere — free

A collapsed or bricked-up opening, drawn, leading to nothing. **No connectivity, no generator change, no
save consequence** — it is a decoration in the existing `wallDecorations` sense.

What it says: _this place was bigger than what you can reach._ That is the cheapest storytelling in the
building, and it is the one thing on this list that could ship in an afternoon. It also quietly supports
the forgery arc's world: places that have been got at before.

Risk: a player who tries to find a way through and cannot will feel lied to. It has to read as **ruin**,
not as a puzzle — which is a drawing problem, not a design one.

### 2. One loop per floor — cheap to draw, one real question

A section that rejoins the spine instead of dead-ending. The machinery is nearly there: 90 sections already
end at a **named place** (`end: { stairId }`) rather than in loot, so "a section ends somewhere specific"
is an idea the generator holds.

- **Saves:** structural, but under ordinals that is ~1% of a floor's cells, not the floor
  (`IMPLEMENTATION.md`).
- **Reachability:** a loop only ever ADDS connectivity, so nothing reachable before becomes unreachable.
  The solver's invariant is safe by construction.
- **The real question:** `world-spec-stability.md` says _"a gate is a room, and gated content is
  isolated."_ **A loop can bypass a gate**, and then the gate is decoration. Whatever places loops has to
  prove it did not open a way around a lock — which is a check the solver is well placed to do but does not
  do today.

What it says: _this was built to be moved through by people who lived here_ — which is a different claim
from a tomb, and true of pyramids' service corridors.

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

1. **Does the solver check gate isolation over the whole floor graph, or does it assume a tree?** This
   decides whether loops are a week or a month.
2. **Is one loop per floor the right dose?** Enough to change the feel, few enough that the spine still
   reads.
3. **Do blocked passages want to lie occasionally** — one of them being a hidden corridor after all? It
   makes every other one interesting, and it makes the detector mean something.
