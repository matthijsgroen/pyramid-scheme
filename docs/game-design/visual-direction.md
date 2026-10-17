# Visual direction — painted and vivid, one metal per rank

What the game should look like, and what changes to get there. The perspective is the one deliberate
choice that came before this and it stays; the painted style was never chosen on purpose and is now.

Decided 2026-10-16, from a fresh-save playthrough and a moodboard (artifact "Pyramid Scheme moodboard").

## Why

The interior reads **muddy**. Measured on `starter_1` floor 0 at phone width: almost everything on screen
sits between 14 and 18% lightness at about 30% saturation, all of it brown. Five rules in
[tile-art-brief.md](tile-art-brief.md) and the night washes in `tileMaterials.ts` produce that together:

- a dark grey-brown ground (_"a cellar of mudbrick … lit by the stair and a wick"_)
- a narrow value band, and `--flatten` pulling every surface toward the slab colour
- night washes of 0.6 and more over four of the five ranks (starter 0.39)
- light only around the explorer
- _"Hue is taste"_ — ranks told apart by material and value, never by colour

**Master already works**, and it is the reference: a quiet dark granite ground, gold carried by the props
and the trim, and the lightest wash of the five (0.18). Gold stands out because the ground is calm and
nothing dims the metal — not because the room is bright.

## The direction

**Painted, matte, vivid.** The painted surfaces stay — soft brush texture, no outlines on a surface, an
edge is a change of value. What changes is colour and light.

**Ground plus metal.** Every rank has a ground — its material, light or dark but calm — and a metal, which
is saturated and lives in props, trim, inlay and lintels. Vividness is the contrast between the two.

**Rooms are lit; the torch is an accent.** The night wash drops to master's hand (0.2 or less) at
every rank. The torch is a warm glow around the explorer rather than what makes a room visible. Shafts of
daylight stay the brightest thing on a floor. Fog is unchanged: an undiscovered cell is still not drawn.

**The characters stay as drawn.** Outlined cartoon figures on a painted world keeps them legible; only
their colours are checked against the new grounds.

## The five ranks

| Rank                 | Character                                          | Ground                                                   | Metal and accent                                     |
| -------------------- | -------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------- |
| **starter · stone**  | a merchant's storehouse — homely, warm, market day | light limestone and whitewashed mudbrick                 | red ochre and terracotta, a turquoise faience accent |
| **junior · copper**  | a nobleman's painted house — festive, colourful    | warm sandstone carrying murals                           | copper, with verdigris                               |
| **expert · silver**  | a clean temple — light, cool, serene               | pale polished tiles and alabaster, light satin curtains  | silver, with lapis                                   |
| **master · gold**    | the pharaoh's galleries — ceremonial               | dark granite                                             | gold, as today                                       |
| **wizard · emerald** | the gods — not of this world                       | deep night-green, calcite lit from beneath, a star field | glowing emerald, with gold                           |

The lightness runs light-warm, mid-warm, light-cool, dark, deep-luminous: no two neighbouring ranks share
both a lightness and a hue, so they stay apart on the map as well as in a screenshot.

The metal ladder is the one `src/data/materialTiers.ts` already names (stone, bronze → copper, silver,
gold, divine → emerald), and the one the hieroglyph tiles already wear.

## Tier themes

What each rank is made of beyond its colours. **Tier theme**, not _theme_: in the code a `theme` is a
floor's hour or weather (`journeys.md` §2), and the two must not share a word.

| Tier                             | Motifs and ornament                                                                                                     | Signature props                                                                          | Air and life                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **starter · stone** storehouse   | tally marks, merchants' seals, basket weave, ochre bands; **cats** painted by the grain — Ipi's were _for the grain_    | jars on shelves, a striped awning cloth (hanging), a grain bin (basin)                   | warm sunlit dust and chaff; **scarabs and mice**                                      |
| **junior · copper** noble house  | lotus and papyrus, rosettes, banquet friezes, a painted dado; **a goose** in the frieze — Henut's, where an owl belongs | copper vessels with verdigris (basin), lotus pillars, an offering table with flowers     | scented incense haze, drifting petals; **scarabs**                                    |
| **expert · silver** clean temple | ceiling stars, djed and was pillars, sunk-relief text columns, a crescent moon, **Thoth's ibis**                        | **satin curtains** (hanging), silver lamps, a basin of still water, a shut naos (shrine) | clear and cool, one slow thread of incense; nothing living                            |
| **master · gold** galleries      | cartouches, the winged sun disc, uraeus cobras, a kheker frieze                                                         | gilded statues, a gold-inlaid sarcophagus, a gilded shrine, braziers                     | still and ceremonial, gold dust catching the shafts; nothing living                   |
| **wizard · emerald** the gods    | stars (Nut), ankh, the Eye of Horus, Ma'at's feather                                                                    | crystals, a shrine that is a window on the cosmos, seams of light in the floor           | motes of light rising **upward** instead of settling, an emerald glow; nothing living |

Every signature prop is a rank's drawing of a kind the brief already has (§2, thirteen kinds), so a tier
theme adds no kind. The air extends `RANK_MOOD` in `moodSettings.ts`, which today carries a tint, drifting
motes, scarabs and the odds of a shaft; the motes' direction (wizard's rise) is new.

**Nothing lives in a tomb but vermin.** The sites are thousands of years shut, so the only living things
are what gets into a cellar: scarabs and mice, in the two shallow ranks — the deeper ones are too sealed
and too cold, as `RANK_MOOD` already has it. Every other animal is a **depiction**: painted, carved or a
statue, part of the motifs. Mice are the one new sprite, drawn and moved the way the scarabs are.

## One palette, three readers

A single token module (`src/ui/tokens/metalPalette.ts`) holds, per difficulty: `material`, `light`,
`shade` and `accent`. The ground tokens (`slab`, `wall`, `wallBase`, `outline` in `tierPalette`) stay with
the ground art and move with each rank's surface repaint. Three things read it:

- the site map — `tierPalette` in `src/app/siteMap/tileMaterials.ts`
- the hieroglyph tiles — `difficultyMaterial` in `src/ui/tokens/difficultyColors.ts`
- the interface — `DifficultyPill`, the journey card, the ward gates

The separate green → purple **rank** scale (`difficultyRank`) is retired: difficulty has one colour
meaning, its metal, so the player learns on the travel screen that gold is harder than copper and
recognises it inside. Text on a metal pill holds 4.5:1, silver and gold included.

## What changes in the brief

[tile-art-brief.md](tile-art-brief.md) is rewritten where it causes the mud, and keeps what makes the map
legible:

| Rule today                                 | Becomes                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| _"Hue is taste"_                           | each rank is recognisable by its metal's hue; a minimum chroma for the metal after the wash |
| merchant: dark grey-brown cellar           | the character table above, per rank                                                         |
| priest: dark basalt, natron dust, soot     | expert's clean temple: pale tiles, alabaster, satin                                         |
| floor p5–p95 spread of 19                  | a wider band, set by the starter pilot                                                      |
| `--flatten` toward the slab                | a corrective only, when `tile-stats` says a roll missed                                     |
| painted, matte, no outlines on a surface   | **kept**                                                                                    |
| value separation: marker, props, wall face | **kept** — legibility stays a hard requirement                                              |

## Light and the map code

- **Night washes** fall to 0.2 or less at every rank (`tierPalette[tier].shade`).
- **The lamp** burns at each rank's own share (`tierPalette[tier].lamp`): a lamp lifts a dark room into
  view and only bleaches a lit one, so a rank that is lit burns it low — starter at 0.3 of the full lamp.
- **Shafts** are re-solved so the patch of sun lands above the new floor. The numbers in `lighting.ts`
  (ray L\* 65.5, sun 70.1) are measured on the lit starter floor, over an unlit floor of about L\* 35.
- **The click marker** stays one gold fill in a dark ring at every rank (`markerColours.ts`): the ring already makes one shape read on light and dark stone. `yarn rank-colour` holds it to 3:1 against every floor.
- **The state washes** (visited, completed) are checked on the lighter grounds and kept if they still read.

## Measuring

The method is the one in `docs/instructions/map-rendering.md` § Measuring: off the art composited through
the renderer's own operators, read as L\*, chroma and hue angle. `yarn rank-colour` (`scripts/rankColour.ts`)
composites each rank's committed floor and wall-face art, with its metal and prop tokens, through the
renderer's wash; the rendered page is read separately in Storybook for sign-off, and the two differ by
about 1–2 L\*. It prints, per rank:

- the metal's chroma after the wash
- ground-to-metal contrast (L\* difference)
- the metal's hue angle, and its distance to the neighbouring ranks' hues
- marker against floor, props against floor

**Master's numbers are the bar.** A rank is done when its metal keeps at least master's chroma after the
wash, its ground-to-metal contrast is at least master's, the marker holds 3:1, props separate from the
floor at least as well as today's 2.08 — and the user signs it off on screenshots of a real floor in the
game, not on loose tiles.

Current measurement:

```
┌─────────┬──────────┬──────────┬────────────┬──────────────┬──────────┬───────────┬───────────┬──────────────────┬─────────────┐
│ (index) │ floor L* │ floor C* │ metal C*   │ ground→metal │ marker   │ prop      │ face step │ solved faceNight │ hue to next │
├─────────┼──────────┼──────────┼────────────┼──────────────┼──────────┼───────────┼───────────┼──────────────────┼─────────────┤
│ starter │ 33.9     │ 7.8      │ '46.1 LOW' │ '0.9 LOW'    │ '5.9 ok' │ '1.7 LOW' │ 7.8       │ 0                │ 18.6        │
│ junior  │ 29.8     │ 20       │ '26.1 LOW' │ '9.1 LOW'    │ '6.8 ok' │ '1.1 LOW' │ 10.4      │ 0                │ 157.9       │
│ expert  │ 29       │ 5.8      │ '7.3 LOW'  │ '0.6 LOW'    │ '7 ok'   │ '1 LOW'   │ 10.2      │ 0.09             │ 178         │
│ master  │ 25.3     │ 5.8      │ '47.5 ok'  │ '31.8 ok'    │ '8 ok'   │ '3.2 ok'  │ 8         │ 0.13             │ 80.1        │
│ wizard  │ 28       │ 12.9     │ '22.9 LOW' │ '2 LOW'      │ '7.2 ok' │ '1.2 LOW' │ 10        │ 0.22             │ ''          │
└─────────┴──────────┴──────────┴────────────┴──────────────┴──────────┴───────────┴───────────┴──────────────────┴─────────────┘
```

In the game, starter_1 floor 0 reads floor L\* 42 — lighter, not yet more colourful: colour arrives with the surface repaint.

## Starter first

Stone is the rank every player sees first, so it is the pilot. The work splits as the pipeline already
does: Claude writes prompts, imports, sets tokens and measures; the user generates through
`yarn repaint <key>`.

1. **Tokens first** — starter's ground, metal and a wash of 0.2, viewed with the existing tiles in
   Storybook and on floor 0. The direction is visible before anything is generated. The ground tokens
   (`slab`, `wall`, `wallBase`, `outline`) describe the ground art and are `tile-stats`' targets for it,
   so they move with the surfaces in item 2, not here.
2. **Surfaces** — floor, wall face, sill, arch: four prompts in
   [starter-art-prompts.md](starter-art-prompts.md) and the repaint queue. They decide most of the frame.
3. **Props** — the remaining starter tiles, in batches.

What the pilot learns — the value band that works, the prompt sentences it needed — goes back into the
brief before copper starts.

## After starter

- **Junior (copper)**, then **expert (silver)** — expert is the most work, its character being new.
- **Master** keeps its palette; its five tiles take the new wash rules only.
- **Wizard** is nearly empty and is drawn in the new character from the start.
- Each rank: tokens, surfaces, props.
- **The interface** lands with starter's tokens — it is code only.

## Budget

The game precaches everything for offline play (`story/review.md` § The art budget: 5.4 MB today). A repaint
replaces tiles rather than adding them, so the total holds; each rank's imports are checked against the
files they replace, and webp is the lever if texture makes them heavier. The mouse is the one addition: a
small floor sprite of a few kB.

## Out of scope

The characters, the exterior board (its sky and sand are already the most colourful screen), the horizon
landmarks from the story review, the mosaic panels.
