# Journeys — what each one is made of

One section per difficulty, one row per journey: how many pyramids it strings together, how many
puzzle rooms that comes to, whether it sprawls, and what it wears.

Two sources sit behind the tables and they answer different questions. **Shape** — how many pyramids,
whether the tier may sprawl, which theme is asked for — is authored in `src/worldGen/spec/*.ts` and
holds until someone edits it. **Counts** — floors and puzzle rooms — are read off the baked world in
`src/data/generatedWorld.ts` and move whenever it is re-cut; `yarn world-info` prints those two
columns live, so the numbers here are a snapshot to read, not a thing to keep true by hand. **The
reach percentages move with them** — a family arriving takes rooms off the families already there, so
each one reads one cut of the world rather than a property of the journey.

## 1. How to read the tables

- **Pyramids** — how many pyramid sites the journey strings together. A tomb is a single site, so its
  row counts floors instead.
- **Floors** — floors across all of those sites.
- **Rooms** — puzzle rooms along every path, main and side. This is `yarn world-info`'s `puzzles`
  column: a room with an encounter in it, whether that encounter is a puzzle or a trap.
- **Sprawl** — floors built broad rather than tight, out of the journey's total (§3).
- **Wears** — the theme the spec assigns.
- **Themes its story offers** — what this journey could be dressed as, read off its own name and
  description. **A theme in `code` already exists** and the percentage is the share of the journey's
  rooms it would reach today (§2); anything in plain text is a proposal with nothing behind it yet —
  there to be designed toward, not to be authored tomorrow.

## 2. Two kinds of theme

A room is told two things (`puzzle-screens.md` §2): its **role**, which is what kind of place it is
and therefore which families may fill it, and its **theme**, which is the ambience the site asks for.
A family that has no skin registered under a theme draws its default one and the theme passes it by,
so **the reach of a theme is the share of rooms whose family answers to it**. Seven themes exist:

| Theme        | Families that wear it   |
| ------------ | ----------------------- |
| `night`      | eclipse, constellation  |
| `fields`     | star battle, twin stars |
| `irrigation` | constellation           |
| `causeway`   | constellation           |
| `channel`    | hidato                  |
| `scribe`     | hidato                  |
| `papyrus`    | sudoku                  |

Three consequences worth having in front of you before authoring one:

- **Asking for a dress is not asking for the puzzles that wear it.** The role decides which families
  turn up; the theme only dresses whoever does. A trade route themed for water without a water role
  is a trade route with a handful of wet rooms in it (`src/worldGen/spec/expert.ts` says the same
  thing at the point where it would be authored).
- **`night` is an overlay, and on one family it overlays nothing.** Eclipse has a night pair of glyphs
  and swaps to it outright. Constellation layers night onto whichever skin the room's ROLE picked —
  and its default skin is already a night sky, which is why it carries no night variant at all
  (`src/mods/puzzle/app/constellation/skins.ts`). A night room that asked for no role of its own
  therefore draws, in constellation, exactly what an unthemed room draws. Night shows on
  constellation over `causeway` and `irrigation` and nowhere else, and the figures below count only
  the rooms a theme visibly changes.
- **A tomb is all but undressable.** A tomb's rooms are tableau and the fez shop, and neither
  registers a skin, so every tomb row below reads 0% for every theme in the table. Two tombs hold one
  stray puzzle room apiece — a balance scale in the noble's vault, a twin stars in the high priest's
  — and one room is not a dress.

**The proposals in the last column are not that list, and that is the point of them.** They are what
each journey's story asks for whether or not anything can draw it — a brief for a skin an existing
family could grow, or for a family that does not exist yet. A theme becomes real one of two ways: an
existing family registers a skin under the name, or a new family ships already wearing it. Either way
it is a mechanic that has to hold up on its own first (`PUZZLE_FAMILIES.md`) — a dress is not a reason
to build a puzzle, but a puzzle looking for a home may find one here.

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

| Journey                              | Pyramids | Floors | Rooms | Sprawl | Wears | Themes its story offers                 |
| ------------------------------------ | -------- | ------ | ----- | ------ | ----- | --------------------------------------- |
| `starter_1` Dawn at the Sphinx       | 2        | 3      | 13    | —      | —     | dawn · weathered sandstone              |
| `starter_2` Papyrus Merchant's Route | 2        | 4      | 21    | —      | —     | market stall · reed bank · `papyrus` 0% |
| `starter_3` Temple of Bastet         | 4        | 4      | 26    | —      | —     | offering table · cat · lamplight        |
| `starter_4` Scribe's Academy         | 4        | 4      | 29    | —      | —     | schoolroom ostraca · `scribe` 10%       |

| Tomb                                               | Floors | Rooms | Sprawl | Wears | Themes its story offers  |
| -------------------------------------------------- | ------ | ----- | ------ | ----- | ------------------------ |
| `starter_treasure_tomb` Forgotten Merchant's Cache | 4      | 8     | —      | —     | cellar · crates and jars |

The Scribe's Academy is the one journey that could be dressed this afternoon, and the lever is the role
rather than the theme. `scribe` is a role two families answer to — hidato, whose skin under that name is
a reed-pen register, and sudoku, whose own is a papyrus sheet — so
`journey("starter_4").pyramid("1-4", { encounter: "scribe" })` would dress every room of it. What that
buys is two families across four pyramids, thinner than the four `water` offers the delta (§6): the same
playtest question, asked with less to draw from.

The papyrus route is the counter-example. Sudoku has shipped and wears its register, but this cut of the
world dealt `starter_2` no sudoku room at all — a theme reaches nothing when the allocator happens not to
deal its family in, which is the whole reason the theme is the wrong half to author.

## 5. Junior

| Journey                             | Pyramids | Floors | Rooms | Sprawl | Wears   | Themes its story offers                |
| ----------------------------------- | -------- | ------ | ----- | ------ | ------- | -------------------------------------- |
| `junior_1` Sacred Ibis Migration    | 3        | 4      | 24    | —      | —       | marsh · flock in flight · flood        |
| `junior_2` Valley of the Artisans   | 4        | 6      | 38    | —      | —       | workshop · pigment · quarry            |
| `junior_3` Temple of Thoth          | 4        | 6      | 45    | —      | —       | moonlight · archive · `scribe` 4%      |
| `junior_4` Lighthouse of Alexandria | 5        | 7      | 47    | —      | `night` | beacon · harbour — `night` reaches 28% |

| Tomb                                        | Floors | Rooms | Sprawl | Wears | Themes its story offers |
| ------------------------------------------- | ------ | ----- | ------ | ----- | ----------------------- |
| `junior_treasure_tomb` Noble's Hidden Vault | 6      | 25    | —      | —     | treasury · wax seals    |

**`junior_4` is the only dressed journey in the world**, and it is authored the way one should be: the
`sky` role as well as the `night` theme, so the request covers the whole pyramid, side paths and trapped
ones included — half a themed pyramid reads as an accident.

It also shows the ceiling on `night` itself. Half its rooms are eclipse or constellation, but only
eclipse's 13 change when the theme is asked for; constellation's 10 are already drawing a night sky and
would look identical unthemed (§2). So the dress lands on 28% of the journey, and the fifth beside it was
night before anyone said so.

Thoth is the god of writing and the moon, and the two proposals split the same way: `scribe` exists and
reaches almost nothing here, while a moonlit board would be a second night — colder, and lit from one
side rather than unlit.

## 6. Expert

| Journey                          | Pyramids | Floors | Rooms | Sprawl             | Wears | Themes its story offers                      |
| -------------------------------- | -------- | ------ | ----- | ------------------ | ----- | -------------------------------------------- |
| `expert_1` Valley of the Kings   | 4        | 7      | 84    | 2/7                | —     | necropolis · torchlight · painted wall       |
| `expert_2` Karnak Temple Complex | 4        | 6      | 83    | 1/6                | —     | hypostyle columns · solar gold · festival    |
| `expert_3` Nile Delta Expedition | 5        | 7      | 107   | 1/7                | —     | delta marsh · crocodile · `irrigation` 14%   |
| `expert_4` Pyramid of Djoser     | 5        | 7      | 99    | 2/7 (`packing: 2`) | —     | stepped terraces · building site · limestone |

| Tomb                                          | Floors | Rooms | Sprawl | Wears | Themes its story offers |
| --------------------------------------------- | ------ | ----- | ------ | ----- | ----------------------- |
| `expert_treasure_tomb` High Priest's Treasury | 4      | 21    | —      | —     | relic sanctum · incense |
| `expert_treasure_tomb_b` Inner Sanctum        | 4      | 20    | 4/4    | —     | sealed holy of holies   |

**The Nile Delta expedition is the one journey whose change is already written down.** The spec carries
the line that would author it — `journey("expert_3").pyramid("1-5", { encounter: "water" })` — and the
reason it has not been pulled: the `water` pool draws all four of its families across the journey, so
the variety floor clears on paper, and what is left is playtesting whether four boards drawn for one
role read as four different rooms. The crocodile is already a trap family; a crocodile _theme_ would
be the delta's water dressed as something that bites.

`expert_4` is where sprawl stops being a coin toss: two of its five pyramids are authored broad because
the tier puts a coloured key on the open main path, and a broad floor is somewhere to hide one.

## 7. Master

| Journey                          | Pyramids | Floors | Rooms | Sprawl | Wears | Themes its story offers                     |
| -------------------------------- | -------- | ------ | ----- | ------ | ----- | ------------------------------------------- |
| `master_1` Great Pyramid of Giza | 4        | 8      | 83    | 1/8    | —     | grand gallery · granite · star shaft        |
| `master_2` Book of the Dead      | 5        | 10     | 121   | 1/10   | —     | funerary scroll · judgement · `papyrus` 11% |
| `master_3` Curse of the Pharaohs | 5        | 10     | 125   | 1/10   | —     | omen · dust and decay · `night` 8%          |
| `master_4` Tomb of Nefertari     | 5        | 10     | 109   | —      | —     | fresco · queen's blue · lamplight           |

| Tomb                                    | Floors | Rooms | Sprawl | Wears | Themes its story offers    |
| --------------------------------------- | ------ | ----- | ------ | ----- | -------------------------- |
| `master_treasure_tomb` Hall of Ma'at    | 5      | 30    | —      | —     | weighing hall · feather    |
| `master_treasure_tomb_b` Hall of Osiris | 5      | 30    | 5/5    | —     | underworld green · rebirth |

A curse is a night journey with the rooms to prove it — 22% of them are eclipse or constellation, the
second-best pool in the game — but authoring `night` over it would change only the eclipse tenth, since
the constellation rooms read as night already without being asked (§2). The Book of the Dead is the
better case for a dress that exists: a funerary scroll is a written surface, and this cut gives it 13
sudoku rooms. Nefertari's tomb is the most decorated in Egypt and asks for the one thing no board here
does: colour laid on plaster, blues and ochres rather than ink on a ground.

## 8. Wizard

| Journey                          | Pyramids | Floors | Rooms | Sprawl | Wears | Themes its story offers                    |
| -------------------------------- | -------- | ------ | ----- | ------ | ----- | ------------------------------------------ |
| `wizard_1` Ra's Solar Journey    | 4        | 12     | 135   | 1/12   | —     | duat · solar barque · serpent · `night` 8% |
| `wizard_2` Secrets of the Sphinx | 5        | 15     | 177   | 2/15   | —     | buried sand · riddle · excavation          |
| `wizard_3` Chamber of Ma'at      | 6        | 18     | 207   | 2/18   | —     | scales · feather of truth · cosmic         |
| `wizard_4` Eternal Pyramid       | 6        | 18     | 207   | 1/18   | —     | void · gold · mirrored infinity            |

| Tomb                                            | Floors | Rooms | Sprawl | Wears | Themes its story offers                              |
| ----------------------------------------------- | ------ | ----- | ------ | ----- | ---------------------------------------------------- |
| `wizard_treasure_tomb` Vault of the Gods        | 4      | 28    | 4/4    | —     | divine vault                                         |
| `wizard_treasure_tomb_b` Realm of Cosmic Forces | 4      | 28    | —      | —     | life · death · chaos · wind, per its own description |
| `wizard_treasure_tomb_c` Throne of Eternity     | 4      | 28    | —      | —     | throne · endless hall                                |

Ra's journey is the one narrative in the catalogue that is literally about night, and it wants more
than a dark board: a boat crossing a river of it, with a serpent in the way. The two 6-pyramid journeys
are the largest things in the game at 207 rooms each, and both ask for somewhere that is not Egypt at
all — the void beyond the sky, and a chamber where the mathematics is the cosmos.

## 9. What the tables say when read together

- **One journey in twenty-nine wears a theme.** Every other room draws its family's default skin.
- **The existing vocabulary is thin where the narratives are thickest.** Seven themes, five of them
  belonging to a single family, against twenty-nine stories that each want something of their own.
  `fields` is the only dress with two families genuinely behind it — `night`'s second family already wore
  it, so it lands like a one-family theme.
- **The lever is the role, not the theme.** A theme falls on whichever families the allocator happened
  to deal; a role brings families that dress themselves. Three role pools have a skin behind every
  member — `water` and `agriculture` (constellation, hidato, star battle, twin stars) and `scribe`
  (hidato, sudoku) — so `expert_3` and `starter_4` are the two journeys one authored line would dress
  end to end. `sky`, which `junior_4` asks for, is not one of them: lightbeam has no skins and eclipse
  has no role skin, so that pyramid leans on its theme to do the work.
- **The proposals cluster.** A light source in a dark room is asked for four times (lamplight twice,
  torchlight, moonlight), water in three journeys, and a written or painted surface in five — ostraca,
  archive, scroll, fresco, papyrus. A skin built for one of those clusters pays for itself across a
  tier rather than dressing one pyramid.
- **A tomb is all but undressable**, so every tomb in the game is the same room in a different colour of
  stone — and the tomb column above is the whole argument for giving tableau a second face.
- **Sprawl is a tier property, not a journey one** — the only journey authored broad is `expert_4`, and
  it is authored for a mechanic rather than for a look.
