# Journeys — what each one is made of

One section per difficulty, one row per journey: how many pyramids it strings together, how many
puzzle rooms that comes to, whether it sprawls, and what it wears.

Two sources sit behind the tables and they answer different questions. **Shape** — how many pyramids,
whether the tier may sprawl, which theme is asked for — is authored in `src/worldGen/spec/*.ts` and
holds until someone edits it. **Counts** — floors and puzzle rooms — are read off the baked world in
`src/data/generatedWorld.ts` and move whenever it is re-cut; `yarn world-info` prints those two
columns live, so the numbers here are a snapshot to read, not a thing to keep true by hand.

## 1. How to read the tables

- **Pyramids** — how many pyramid sites the journey strings together. A tomb is a single site, so its
  row counts floors instead.
- **Floors** — floors across all of those sites.
- **Rooms** — puzzle rooms along every path, main and side. This is `yarn world-info`'s `puzzles`
  column: a room with an encounter in it, whether that encounter is a puzzle or a trap.
- **Sprawl** — floors built broad rather than tight, out of the journey's total (§3).
- **Wears** — the theme the spec assigns.
- **Would land** — a theme that suits the journey's narrative, with the share of its rooms that would
  actually change (§2).

## 2. A theme only lands where a family can wear it

A room is told two things (`puzzle-screens.md` §2): its **role**, which is what kind of place it is
and therefore which families may fill it, and its **theme**, which is the ambience the site asks for.
A family that has no skin registered under a theme draws its default one and the theme passes it by,
so **the reach of a theme is the share of rooms whose family answers to it**.

| Theme        | Families that wear it     |
| ------------ | ------------------------- |
| `night`      | eclipse, constellation    |
| `fields`     | star battle, twin stars   |
| `irrigation` | constellation             |
| `causeway`   | constellation             |
| `channel`    | hidato                    |
| `scribe`     | hidato                    |
| `papyrus`    | sudoku (not in the world) |

Two consequences worth having in front of you before authoring one:

- **Asking for a dress is not asking for the puzzles that wear it.** The role decides which families
  turn up; the theme only dresses whoever does. A trade route themed for water without a water role
  is a trade route with a handful of wet rooms in it (`src/worldGen/spec/expert.ts` says the same
  thing at the point where it would be authored).
- **No tomb can be dressed at all.** A tomb's rooms are tableau and the fez shop, and neither
  registers a skin, so every tomb row below reads 0% for every theme in the table.

## 3. Sprawl — the broad floor

`packing` is how much floor a level is given for the rooms it has to hold; above 1 the layout spreads
out rather than packing tight. The tiers set it as a chance rather than a fact: **expert, master and
wizard carry `packingChance: 0.25` at `packingWhenHit: 1.6`**, and starter and junior carry none, so
the first two tiers never sprawl at all.

Two places author it outright. `expert_4` gives its 2nd and 4th pyramids `packing: 2` — the tier that
first brings floor keys onto the open main path, and a broad floor is somewhere to hide a key. And a
tomb resolves the roll once for the whole site, so a tomb comes out sprawling on every floor or on
none, where a pyramid picks up a floor or two.

## 4. Starter

| Journey                              | Pyramids | Floors | Rooms | Sprawl | Wears | Would land                          |
| ------------------------------------ | -------- | ------ | ----- | ------ | ----- | ----------------------------------- |
| `starter_1` Dawn at the Sphinx       | 2        | 3      | 13    | —      | —     | nothing in the vocabulary is a dawn |
| `starter_2` Papyrus Merchant's Route | 2        | 4      | 21    | —      | —     | `channel` 19%, `irrigation` 10%     |
| `starter_3` Temple of Bastet         | 4        | 4      | 26    | —      | —     | `night` 15%                         |
| `starter_4` Scribe's Academy         | 4        | 4      | 29    | —      | —     | **`scribe` 24%**                    |

| Tomb                                               | Floors | Rooms | Sprawl | Wears |
| -------------------------------------------------- | ------ | ----- | ------ | ----- |
| `starter_treasure_tomb` Forgotten Merchant's Cache | 4      | 8     | —      | —     |

**The Scribe's Academy is the closest fit in the game** — hidato's `scribe` skin is a reed-pen
register, and a quarter of the journey's rooms are hidato. A papyrus merchant's route is the other
one, and it is waiting on the sudoku family: its own register is a papyrus sheet.

## 5. Junior

| Journey                             | Pyramids | Floors | Rooms | Sprawl | Wears   | Would land  |
| ----------------------------------- | -------- | ------ | ----- | ------ | ------- | ----------- |
| `junior_1` Sacred Ibis Migration    | 3        | 4      | 24    | —      | —       | `night` 21% |
| `junior_2` Valley of the Artisans   | 4        | 6      | 38    | —      | —       | `night` 26% |
| `junior_3` Temple of Thoth          | 4        | 6      | 45    | —      | —       | `scribe` 2% |
| `junior_4` Lighthouse of Alexandria | 5        | 7      | 47    | —      | `night` | reaches 49% |

| Tomb                                        | Floors | Rooms | Sprawl | Wears |
| ------------------------------------------- | ------ | ----- | ------ | ----- |
| `junior_treasure_tomb` Noble's Hidden Vault | 6      | 25    | —      | —     |

**`junior_4` is the only dressed journey in the world**, and it shows what dressing one properly
looks like: it is authored to the `sky` role as well as the `night` theme, which is why the theme
reaches half its rooms instead of a tenth. The theme is applied to the whole pyramid, side paths and
trapped ones included — half a themed pyramid reads as an accident.

Two rows here are narrative fits with no reach. An ibis migration up the Nile and the temple of the
god of writing both want a dress (`channel`, `scribe`) that only hidato wears, and hidato is one room
of each journey. Authoring the role is the change; the theme alone would do almost nothing.

## 6. Expert

| Journey                          | Pyramids | Floors | Rooms | Sprawl             | Wears | Would land                         |
| -------------------------------- | -------- | ------ | ----- | ------------------ | ----- | ---------------------------------- |
| `expert_1` Valley of the Kings   | 4        | 7      | 84    | 2/7                | —     | `night` 18%                        |
| `expert_2` Karnak Temple Complex | 4        | 6      | 83    | 1/6                | —     | `night` 13%, `scribe` 11%          |
| `expert_3` Nile Delta Expedition | 5        | 7      | 107   | 1/7                | —     | **`irrigation` 16%**, `channel` 7% |
| `expert_4` Pyramid of Djoser     | 5        | 7      | 99    | 2/7 (`packing: 2`) | —     | `fields` 26%                       |

| Tomb                                          | Floors | Rooms | Sprawl | Wears |
| --------------------------------------------- | ------ | ----- | ------ | ----- |
| `expert_treasure_tomb` High Priest's Treasury | 4      | 21    | —      | —     |
| `expert_treasure_tomb_b` Inner Sanctum        | 4      | 20    | 4/4    | —     |

**The Nile Delta expedition is the one journey whose change is already written down.** The spec
carries the line that would author it — `journey("expert_3").pyramid("1-5", { encounter: "water" })`
— and the reason it has not been pulled: the `water` pool draws all four of its families across the
journey, which clears the variety floor on paper, and what is left is playtesting whether four boards
drawn for one role read as four different rooms.

`expert_4` is where sprawl stops being a coin toss: two of its five pyramids are authored broad
because that tier puts a coloured key on the open main path, and a broad floor is somewhere to hide
one.

## 7. Master

| Journey                          | Pyramids | Floors | Rooms | Sprawl | Wears | Would land      |
| -------------------------------- | -------- | ------ | ----- | ------ | ----- | --------------- |
| `master_1` Great Pyramid of Giza | 4        | 8      | 83    | 1/8    | —     | `night` 19%     |
| `master_2` Book of the Dead      | 5        | 10     | 121   | 1/10   | —     | `scribe` 11%    |
| `master_3` Curse of the Pharaohs | 5        | 10     | 125   | 1/10   | —     | **`night` 29%** |
| `master_4` Tomb of Nefertari     | 5        | 10     | 109   | —      | —     | `scribe` 8%     |

| Tomb                                    | Floors | Rooms | Sprawl | Wears |
| --------------------------------------- | ------ | ----- | ------ | ----- |
| `master_treasure_tomb` Hall of Ma'at    | 5      | 30    | —      | —     |
| `master_treasure_tomb_b` Hall of Osiris | 5      | 30    | 5/5    | —     |

**A curse is a night journey with the rooms to prove it**: 29% of its rooms are eclipse or
constellation, the second-best reach in the game after `junior_4`, and supernatural challenges under
a dark sky is the description it already carries. The Book of the Dead and Nefertari's tomb are both
about writing on walls, which is `scribe` again at a tenth of their rooms.

## 8. Wizard

| Journey                          | Pyramids | Floors | Rooms | Sprawl | Wears | Would land      |
| -------------------------------- | -------- | ------ | ----- | ------ | ----- | --------------- |
| `wizard_1` Ra's Solar Journey    | 4        | 12     | 135   | 1/12   | —     | **`night` 17%** |
| `wizard_2` Secrets of the Sphinx | 5        | 15     | 177   | 2/15   | —     | `night` 16%     |
| `wizard_3` Chamber of Ma'at      | 6        | 18     | 207   | 2/18   | —     | `fields` 23%    |
| `wizard_4` Eternal Pyramid       | 6        | 18     | 207   | 1/18   | —     | `fields` 21%    |

| Tomb                                            | Floors | Rooms | Sprawl | Wears |
| ----------------------------------------------- | ------ | ----- | ------ | ----- |
| `wizard_treasure_tomb` Vault of the Gods        | 4      | 28    | 4/4    | —     |
| `wizard_treasure_tomb_b` Realm of Cosmic Forces | 4      | 28    | —      | —     |
| `wizard_treasure_tomb_c` Throne of Eternity     | 4      | 28    | —      | —     |

**Ra's journey is a night journey by name** — the sun god's passage through the underworld, which is
the one narrative in the catalogue that is literally about night. The two 6-pyramid journeys are the
largest things in the game at 207 rooms each, and neither has a narrative the vocabulary can dress.

## 9. What the tables say when read together

- **One journey in twenty-nine wears a theme.** Every other room in the world draws its family's
  default skin.
- **The vocabulary is thin where the narratives are thickest.** Six themes exist and four of them
  belong to a single family, so a journey's reach is decided by which families its rooms happened to
  draw rather than by what it is about. The two dresses with two families behind them, `night` and
  `fields`, are also the two that reach past a fifth of a journey.
- **A tomb cannot be dressed**, and every tomb in the game is therefore the same room in a different
  colour of stone.
- **Sprawl is a tier property, not a journey one** — the only journey authored broad is `expert_4`,
  and it is authored for a mechanic (a key on the open floor) rather than for a look.
