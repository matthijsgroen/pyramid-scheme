# Skins for regionless battle and pair puzzle — design

Both new families shipped with one skin each (scarabs; mummies). The user chose more places for both, and moved the
beetle to the pair puzzle so only one family wears a beetle.

## Skins (user's choices)

A skin is picked by the room's role through the family's `faces` (`app/faceFor.ts`), as star battle does with
`default`/`fields`. One skin per role.

### Regionless battle (one piece per row and column, none touching, walls block squares)

| skin | role(s) | piece | walls | why the pieces never touch |
| --- | --- | --- | --- | --- |
| oil lamps — **default** | `light`, and any room without its own skin | an oil lamp | stone blocks | their pools of light would overlap — oil wasted |
| market stalls | `trade` | a stall | houses | rivals never set up side by side |
| lotus flowers | `water` | a lotus | rocks / islets in a pond | each flower needs open water to float |
| temple cats (Bastet) | `funerary` | a sleeping cat | pillars | each cat keeps its own patch of sun |

The scarab skin is removed: the beetle belongs to the pair puzzle now.

### Pair puzzle (an anchor printed on the board; the player puts one piece beside each)

| skin | role | anchor | piece | solve animation |
| --- | --- | --- | --- | --- |
| mummies — **default** (exists) | `funerary` | sarcophagus | mummy | the mummy walks into its sarcophagus (exists) |
| dung beetles | `cosmos` | dung ball | beetle | the beetle walks to its ball and the ball rolls (a full turn) |

## Meta changes

- `REGIONLESS_BATTLE_META`: `tags: ["puzzle", "light", "trade", "water", "funerary"]`, `faces`: `light: ["default"]`,
  `trade: ["market"]`, `water: ["lotus"]`, `funerary: ["cats"]`, `themes: ["default", "market", "lotus", "cats"]`.
  `cosmos` is dropped (it came with the scarab).
- `PAIR_PUZZLE_META`: `tags: ["puzzle", "funerary", "cosmos"]`, `faces`: `funerary: ["default"]`,
  `cosmos: ["beetles"]`, `themes: ["default", "beetles"]`.
- Both stay lab-only (not in `puzzleMod.families`); `src/data/` stays untouched.

## Per skin (same bar as the existing skins)

- An inline SVG glyph per piece (and per anchor for pair skins), drawn in code like `Star`, `Farmstead`, `Mummy`.
- A palette in the skin table only (no colours in board components); a wall/anchor look that reads as that place.
- A solve celebration that reads as the place (e.g. a lamp flares, a lotus blooms). The scarab `spin-once` keyframe
  is reused for the rolling dung ball; delete any keyframe no skin uses any more.
- Copy in en + nl keyed by the skin's `name`: title, goal, quota line (regionless), rules (name every element and
  what it means, including what the walls/anchors are), and every hint sentence the ladder can produce (the
  existing key-completeness specs must cover the new skins).
- Legible on a 9×9 board at 360px: piece vs wall (regionless) and piece vs anchor (pair) tell apart at a glance.

## Constraints

- Mechanics unchanged; only skins, metas, copy, glyphs, docs.
- Skin names: `default` (lamps), `market`, `lotus`, `cats`; pair `default` (mummies), `beetles`. Ids stay generic.
- Family design docs (`docs/game-design/puzzles/regionless-battle.md`, `pair-puzzle.md`) theming sections and
  `docs/game-design/PUZZLE_FAMILIES.md` updated to the current skins.
- Checked by looking: each skin in the puzzle lab (theme picker) at 360×640, including its solve animation.
