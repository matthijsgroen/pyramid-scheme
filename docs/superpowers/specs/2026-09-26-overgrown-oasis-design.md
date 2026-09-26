# The overgrown floors become a lush cave

Palms, flowers, and corridors with light in them.

Slice 2 of the look pass. Slice 1 was the light shafts
([2026-09-25](2026-09-25-light-shafts-design.md)); this is what grows under them.

## What is wrong today

An overgrown floor is **three sprites and a green wash**. One tuft in the joints, one root through the
band, one plant in a chamber — all at `--tier=default`, so every rank is overgrown with the same weed,
told apart only by size, rotation and flip. Nothing on the floor is any colour but green and stone, and
the corridors — which are most of a floor — are a dark passage with a few specks of green in them.

## One cause, two effects

**A floor is overgrown because its roof failed.** That is the whole design: the light and the plants are
the same fact seen twice, and `condition.amount` drives both.

| `overgrown.amount` raises | today | on an overgrown floor |
| --- | --- | --- |
| `mood.beam` | the rank's own | scales up with `amount` |
| where a shaft may fall | chambers only | **corridors too** |
| `MAX_SHAFTS` | 3 a floor | up to about double |
| growth density | scales with `amount` | unchanged in rule, richer in art |

A corridor shaft lights its run to the next turn, because `litPlaceCells` already resolves a corridor
cell to its run — that is what "corridors with lots of light" asks for, and the lighting code needs no new
idea to give it.

**Ordinary floors keep today's rules exactly.** Everything solved in slice 1 — the L\* ladder, the
hand-over to the lamp, the cap — holds where no condition is authored, so nothing already tuned moves.

**`lighting.ts` says corridors never get a shaft, and that comment becomes wrong.** The reasoning is
sound for an ordinary floor and it is not sound here; it gets rewritten to name which floors and why,
rather than left to contradict the code under it.

## The art: a pool per slot

Each of the three slots becomes a POOL, drawn from by the same seed that already decides which cells
grow. All `--tier=default`: one skin for every rank, as today.

| slot | today | added |
| --- | --- | --- |
| floor joints (`growth`, 22×22) | `overgrown` tuft | **flowers**, **scrub**, **fallen fronds** |
| wall band (`growthWall`, 22×34) | `overgrown-wall` root | **hanging creeper**, **vine curtain** |
| chamber floor (`growth`, drawn larger) | `overgrown-plant` | **palm**, **ferns** |

Seven new tiles. **Flowers carry more than their share**: they are the only colour that is not green or
stone, and a lush place that is one hue is a wash rather than a garden.

**The renderer ships before the art.** `MapGrowth` already falls back to the plain tuft when a tile is
missing — a deliberate property, so placement can be judged before anyone paints. The pools are declared
now, every absent member falls back, and each tile lands through `yarn repaint` without another code
change.

These are FLAT tiles: no mesh, no scaffold, no mask. The generator's own outline becomes the tile and the
magenta is keyed, which is what `prop-pipeline.md` Step 0 calls a flat thing and what the queue's spec
calls a condition sprite. So their prompts say "square on and flat" and never "keep every edge".

## The wash has to be re-solved

The tint is `#4d7a2e` at `0.18 × amount`, chosen when these floors had no light of their own. With shafts
on them the same wash sits over a much brighter floor, and a wash both dims and flattens. It is re-solved
the way every other value on this map is: composited through the operators the renderer uses and sampled
off the RENDERED PAGE as L\*, against the ladder slice 1 established — unlit 27.1, beamed room 38.8, ray
44.8, patch of sun 66.6.

## Files

| file | change |
| --- | --- |
| `src/app/SiteMap/moodSettings.ts` | pools per slot; `beam` rises with `amount`; tint re-solved |
| `src/app/SiteMap/MapMood.tsx` | pick a sprite from the pool, seeded per cell |
| `src/app/SiteMap/lighting.ts` | corridor eligibility and the cap, both by condition |
| `src/app/SiteMap/MapBeams.tsx` | whatever the corridor case needs |
| `docs/instructions/repaint-queue.md` | seven prompts |
| `docs/game-design/tile-art-brief.md` | a growth section — it has none |

## What the tests freeze

- a pool member absent from disk falls back, and the floor still draws
- two cells of the same floor can draw different members
- the same floor draws the same members every render
- an overgrown floor puts a shaft in a corridor; an ordinary floor never does
- an ordinary floor's shaft count and placement are unchanged by this work
- `amount` 0 is not overgrown: no extra light, no growth

## Skipped

| skipped | add when |
| --- | --- |
| water, reeds, a wet sheen — the literal oasis | somebody asks for `flooded`, which still draws nothing |
| per-rank greenery | the shared set reads thin against a rank's own stone |
| a palm as a standing `DecorationKind` | a plant needs to be a thing in the room rather than dressing on it |
| authoring which floors are overgrown | the existing `expert_3` run is enough to judge by |
