# Mosaic pieces — how many, and where they come from

The stained-glass window is five horizontal registers, one per difficulty tier, and it fills
register by register from the top. This note records what each panel is made of and where its glass
is scattered in the generated world.

Everything below is read straight out of the repo — regenerate it any time with:

```bash
yarn mosaic-info                 # the summaries
yarn mosaic-info --panel=wizard  # one register
yarn mosaic-info --list          # every individual drop site
```

## Two different counts

The word "piece" means two things in this codebase, and they are not the same number:

| Term        | Lives in                                              | What it is                               |
| ----------- | ----------------------------------------------------- | ---------------------------------------- |
| **polygon** | `src/ui/atoms/mosaicPieces.generated.ts`              | A traced shard of glass — what you _see_ |
| **drop**    | `mosaicPiece` rewards in `src/data/generatedWorld.ts` | A collectable — what you _find_          |

One drop advances the reveal by one step (`LEVEL_STEPS` in `mosaicRevealOrder.ts`), and a step can
carry several polygons, so a single find can light up a whole cluster of glass.

## Per panel

| Panel        | Tier    | Polygons |   Drops | Polygons per drop |
| ------------ | ------- | -------: | ------: | ----------------: |
| `register_0` | starter |      305 |      32 |               9.5 |
| `register_1` | junior  |      330 |      44 |               7.5 |
| `register_2` | expert  |      488 |      52 |               9.4 |
| `register_3` | master  |      429 |      58 |               7.4 |
| `register_4` | wizard  |      375 |      66 |               5.7 |
| **Total**    |         | **1927** | **252** |           **7.6** |

A panel's drop count is not authored — `MOSAIC_STEPS_BY_TIER` derives it from how many reveal steps
that tier owns, so a panel can never be handed a piece that would reveal nothing. The world contains
exactly those 252 drops, no more and no less; `placeFragments` hard-fails the build if it can't
place a capped currency in full.

The window gets _finer_ as it goes down: a starter find lights ~9.5 shards, a wizard find ~5.7. Late
progress is slower per find even though the wizard register has more of them.

## Where the drops sit

| Panel     |   Drops | Main path |    Side |   Sub | Path end | Puzzle room | Hidden |  Gated | Surface | Deeper |
| --------- | ------: | --------: | ------: | ----: | -------: | ----------: | -----: | -----: | ------: | -----: |
| starter   |      32 |         5 |      27 |     0 |       32 |           0 |      7 |      6 |      29 |      3 |
| junior    |      44 |         5 |      39 |     0 |       43 |           1 |     14 |      3 |      40 |      4 |
| expert    |      52 |         4 |      48 |     0 |       51 |           1 |     13 |      5 |      49 |      3 |
| master    |      58 |        10 |      46 |     2 |       57 |           1 |     11 |     19 |      48 |     10 |
| wizard    |      66 |         6 |      58 |     2 |       63 |           3 |     26 |     24 |       3 |     63 |
| **Total** | **252** |    **30** | **218** | **4** |  **246** |       **6** | **71** | **57** | **169** | **83** |

Shape of it:

- **Side paths carry the window.** 218 of 252 drops (87%) hang off side sections; the main path
  keeps 30. Mosaic is capped filler placed _after_ every gating currency, so it lives on the
  optional branches the solver left alone.
- **Almost always a path end.** 246 sit at a treasure end; only 6 are mid-path puzzle-room rewards.
- **Later panels hide harder.** 26 of the wizard register's 66 drops are behind hidden corridors and
  24 behind tomb-key gates, against 7 and 6 for starter. All but 3 wizard drops are below the
  surface floor, where nearly every starter drop is on it.

## Which journeys the glass drops in

A pool only takes loot nodes of its _own_ difficulty (`eligible: slot => slot.tier === tier` in
`mosaicCurrency.ts`), and a node's difficulty is its own floor/section setting — not its journey's
tier. So a starter wing inside a wizard tomb yields starter glass:

| Panel tier | starter | junior | expert | master | wizard | Journeys |
| ---------- | ------: | -----: | -----: | -----: | -----: | -------: |
| starter    |      30 |      · |      · |      1 |      1 |        6 |
| junior     |       3 |     41 |      · |      · |      · |        5 |
| expert     |       1 |      · |     51 |      · |      · |        6 |
| master     |       · |      · |      · |     58 |      · |        5 |
| wizard     |       · |      · |      · |      · |     66 |        6 |

The spill is small but real: 6 drops land outside their own tier's journeys, including one starter
piece on `wizard_1`'s third floor. That is by design — a register is the record of a
_difficulty_, not of a journey — but it does mean a panel can't be finished purely by replaying its
own tier. The starter panel in particular needs a master and a wizard journey visited to complete.

The load is uneven across journeys: `wizard_1` alone holds 35 drops and `wizard_2` 28, while several
journeys carry a single one.
