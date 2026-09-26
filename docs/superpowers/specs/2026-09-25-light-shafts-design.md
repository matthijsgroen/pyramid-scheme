# Light shafts falling into rooms

A hole in a roof, a cone of dusty light under it, and the room it lands in readable without a torch.

Slice one of a look pass. Slice two is the greenery — palms, reeds, standing water, a richer `overgrown`
— and is not designed here.

## What it is

A **beam** is a shaft of daylight in a chamber. It is scenery AND a light: a beamed room is lit whether or
not the explorer is standing in it, so its statue reads from the doorway.

Beams are **placed at render time from a seed**, exactly as `MapGrowth` places tufts — no world-spec field,
no regeneration, `generatedWorld.ts` byte-identical. A room holding a `statue` is likelier to get one. The
map does not explain why the roof gave way and does not need to.

## Where a beam lands

One per room at most, chambers only. Candidate rooms are the owners in `claims.claimedBy` — the same
render-time claim map `MapGrowth` already takes as `chamberCells`, grouped by owner rather than flattened.
Corridors never get one: a shaft in a one-cell passage is something the player walks through.

```
beamed = rand(siteId, "beam", index) < mood.beam * (room has a statue ? STATUE_ODDS : 1)
```

A shaft also leans left or right, seeded off its own cell: the sun is in one place but the holes are not,
and a floor of shafts all leaning the same way reads as a rule. **At most `MAX_SHAFTS` = 3 to a floor** —
the odds are a rate, so a thirty-room floor would otherwise break three times as many roofs as a ten-room
one and the shaft would stop being the thing you notice about the room it is in.

`mood.beam` is a new number on `Mood`, a probability per chamber, set per rank in `RANK_MOOD` and
replaceable by an hour in `THEME_MOOD`. Deep ranks are sealed and take less of it than a merchant's cellar.
A condition may raise it later; it does not in this slice.

The **shaft's own cell** — where the pool lands and the cone comes down — is a second draw over the room's
footprint, so it is not always the owner cell and a wide chamber does not always light from its corner.

**A fogged room has no beam.** The beam is drawn only where the room's cell `state !== "fogged"`, so it
lights a room already discovered and reveals nothing the map would otherwise hide. `litPlaceCells`,
`RoomClaims` and the explored rules are untouched by this work.

## What it draws

| piece | how |
|---|---|
| the lit room | a static `LitPlace` at the shaft cell — it expands to the whole footprint already |
| the rays | `ClipLayer`, three slanted quads from a hole in the roof down to the floor, feathered |
| the pool | the patch of sun the rays land in, an ellipse, the brightest thing in the room |
| the motes | the `box-shadow` `SPECKS` pairing from `MapMood`, drifting inside the cone only |

The lit room is the existing component, not a new one: `litPlaceCells` given a room cell already returns
the room's whole footprint, and `LitPlace` already clips, feathers and reaches a wall band above what
stands (`headroom`). What this slice adds to `torchlight.tsx` is **one parameter — the fill** — so a beam
can be daylight where a torch is firelight.

Both passes, as the torch has both: the floor pass over `FloorShade`, the `headroom` pass after the
shade's second, so a statue standing in the beam is lit to the top of its own headroom instead of being
cut off at the floor line. Both inside the same `color-dodge` wrapper.

The cone is drawn over the standing layer — a shaft of dust is in front of a statue, not behind it.

## Three numbers, and how they are chosen

Sampled off the RENDERED PAGE — a Storybook shot of a starter floor, mean L\* over a patch of paving —
rather than modelled off the art, because the page also carries the scatter, the drift and the second shade
pass, and what the player sees is what a light has to be solved against. The ladder: unlit floor 27.1, a
beamed room 38.8, a ray in the air 44.8, the patch of sun it lands in 66.6.

1. **`BEAM_STRENGTH`.** Solved DELIBERATELY SHORT of the torch. A shaft has to be the brightest thing in
   the room it falls in, and a chamber lifted to the top of the range leaves it nothing to be bright
   against — which is a beam drawn as a smudge on a pale floor. The room takes enough to read from the
   doorway and no more; the rest of the range belongs to the rays and the pool. Two lights in one room
   still do not stack: `color-dodge` divides, so the beam hands its room over to the lamp.
2. **The daylight fill.** Cooler than `TORCH_CORE`, still not cold: light is warm or it is not light, and
   dust in the shaft scatters it warm anyway. Hold the blue channel back. **No 255 channel** — under a
   dodge that divides by zero and blows out.
3. **The unlit-to-beamed step.** A beamed room has to clear an unlit one by enough to read at the zoom a
   floor is scanned at, without reading brighter than the room the player is standing in.

## Files

| file | change |
|---|---|
| `src/app/SiteMap/MapBeams.tsx` | new — placement, cone, motes |
| `src/app/SiteMap/moodSettings.ts` | `Mood.beam`, per-rank values |
| `src/app/SiteMap/lighting.ts` | `BEAM_STRENGTH`, `STATUE_ODDS`, the room-picking rule |
| `src/app/SiteMap/torchlight.tsx` | `LitPlace` takes a fill |
| `src/app/SiteMap/SiteMapView.tsx` | two mounts, beside the light it already draws |

Placement is a pure function in `lighting.ts` — grid, claims, mood, siteId in, shaft cells out — so it is
testable without rendering, which is how `litPlaceCells` is already split from what paints it.

## What the tests freeze

- a chamber gets `[data-beam]`, a corridor never does
- a shaft stays on the grid even where the room's footprint reaches past the edge
- every shaft lands in a pool, and the pool is drawn under the rays
- `mood.beam: 0` draws none
- a fogged room draws none
- a room holding a `statue` beams on a seed a bare room misses
- one beam per room, never two
- at most three on a floor, whatever the odds and however many chambers
- which rooms keep theirs is decided by the draw, not by where they sit on the floor
- the beamed room's cells are lit with no explorer on the floor
- the same floor beams the same rooms every render

Then the `map-rendering.md` paint-count recipe on a production build, motion disabled: if deleting the
beams changes the paint count they are not composited.

## Skipped

| skipped | add when |
|---|---|
| authored shaft placement (a `ceilingShaft` wall decoration) | a level wants one specific room lit |
| sun angle per hour, a beam that moves | the map ever shows time passing |
| beams in corridors | never — the player walks there |
| a beam that also grows plants under it | slice two, where the greenery gets designed |
| a cold star shaft for the gods' vault | the wizard rank gets its own art pass |
