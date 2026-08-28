# Journeys — what each one is made of, and what would dress it

One section per difficulty, one row per journey: how many pyramids it strings together, how many puzzle
rooms that comes to, whether it sprawls, and what it wears. The point of the tables is §9 — **which gaps,
if filled, would let each journey's puzzles look like the story it is named after.**

Two sources sit behind them and they answer different questions. **Shape** — how many pyramids, whether the
tier may sprawl, what the site asks for — is authored in `src/worldGen/spec/*.ts` and holds until someone
edits it. **Counts** — floors and puzzle rooms — are read off the baked world in
`src/data/generatedWorld.ts` and move whenever it is re-cut; `yarn world-info` prints those two columns
live, so the numbers here are a snapshot to read, not a thing to keep true by hand.

## 1. How to read the tables

- **Pyramids** — how many pyramid sites the journey strings together. A tomb is a single site, so its row
  counts floors instead.
- **Floors** — floors across all of those sites.
- **Rooms** — puzzle rooms along every path, main and side. This is `yarn world-info`'s `puzzles` column: a
  room with an encounter in it, whether that encounter is a puzzle or a trap.
- **Sprawl** — floors built broad rather than tight, out of the journey's total (§3).
- **Wears** — the role and the ambience the spec authors for this journey.
- **What its story asks for** — read off the journey's own name and description. **A `role` or an ambience
  in `code` exists today**; anything in plain text is a brief with nothing behind it yet.

## 2. The role is the place, the theme is the hour

`docs/instructions/puzzle-screens.md` §2 is explicit about which of the two answers what:

| What arrives | Authored as          | The question it answers                      |
| ------------ | -------------------- | -------------------------------------------- |
| `ctx.role`   | `encounter: "trade"` | **Which place is this?**                     |
| `ctx.theme`  | `theme: "night"`     | **What is it like right now?** hour, weather |

**Dressing a journey is authoring its role.** A role does two things at once: it narrows the pool to the
families that serve that place, and it tells each of them which of its own faces this room is. The same
constellation board is a star map for `sky`, a haul road for `trade`, a waterworks for `water` — and no
site ever names a skin, which is what lets one authored word work across families that have never heard of
each other. `theme` layers the hour onto whatever the role picked; it does not replace it. A trade pyramid
that came out looking like a waterworks would be this going wrong.

So the question for a journey is **which role its story wants, and whether every family in that pool has a
face for it.** That second half is a property of the pool rather than of the journey, and it is the whole
map of what is missing:

| Role                    | Families in the pool                                       | Read as the place | Look different |
| ----------------------- | ---------------------------------------------------------- | ----------------- | -------------- |
| `water` / `agriculture` | canisters, constellation, hidato, star battle, twin stars  | 5 of 5            | **5 of 5**     |
| `funerary`              | balance scale, canisters, constellation, hidato, sudoku    | 5 of 5            | 4 of 5         |
| `sky`                   | constellation, eclipse, lightbeam, star battle, twin stars | 5 of 5            | 0 of 5         |
| `scribe`                | canisters, hidato, sudoku                                  | 3 of 3            | **3 of 3**     |
| `trade`                 | balance scale, canisters, constellation                    | 3 of 3            | 2 of 3         |
| `light`                 | canisters, eclipse, lightbeam                              | 3 of 3            | **1 of 3**     |
| `judgement`             | balance scale                                              | 1 of 1            | 1 of 1         |
| `logistics`             | —                                                          | —                 | —              |

**Canisters (§4.28) is in six of those pools**, which no other family comes near — measuring an exact
amount out of vessels that do not divide evenly is the river's act, and the granary's, the lamp room's, the
cellar's, the embalming table's and the scriptorium's alike. It is also the family that gave `light` its
first face at all, and the only one that tells `water` from `agriculture`.

**The two columns are different questions and they must not be collapsed.** _Read as the place_ is whether
a journey can be carried at all — a star battle board is stars on a dark ground whether or not anyone
authored `sky`, and its own skin file calls that "the plainest possible face for the `sky` pool". _Look
different_ is whether authoring the role visibly changes anything. Collapsing them into one "has a face"
count reports `sky` and `light` as empty, which would deny that five families can carry a night journey
and that a family named lightbeam can serve `light`.

Four readings of that table before authoring anything:

- **`water`, `agriculture` and `scribe` are fully dressed.** Every family in those pools has a face of its
  own, so one authored word changes every room it reaches.
- **But a pool has to clear four members before a journey may restrict to it** (`rolePools.spec.ts`), and
  three sit one short: `scribe`, `trade` and `light` are all at three. They can still be PREFERRED — the
  `["<role>", "puzzle"]` form of §11 skips the floor by design — they just cannot be the whole pool a
  pyramid draws from.
- **`sky` is already dressed, which is why it changes nothing.** Five families read as a night sky before
  anyone asks — it is constellation's default face, star battle's and twin stars' too, and eclipse's pair
  hangs in one. So a `sky` room draws what an unauthored room draws: asking for it narrows the pool without
  changing the look. That is a full pool to carry a star journey and an empty one to make it look new, and
  `junior_4` is the proof of both — authored `sky`, and its look comes from `night`.
- **`light` has a face now, and it is canisters'.** Oil measured out for the lamps is what a light this
  deep underground runs on. Eclipse and lightbeam still read as light sources without dressing as one, so
  the pool is 1 of 3 — the first face it has ever had, and the gap §9 ranked is half closed.
- **`logistics` is an empty pool.** Constellation maps it to its causeway, but no family carries the tag,
  so a site authoring it would find nobody. `trade` is the word that works — and balance scale owes that
  pool an answer, since a scale weighing goods either reads as a market or the tag should go (§12).
- **A tomb has no faces, and is exempt from all of this.** A tomb's rooms are tableau and the fez shop,
  so no role or ambience reaches one — but that is not a gap to fill. Tableau's own screen is mid-redesign
  (`puzzles/tableau.md` §10.5), so a face drawn for it now would be drawn on something about to move.
  Tombs are out of scope until that settles; the rows below carry them for their shape only.

### The ambience axis is thinner than it looks

`night` is the only ambience that exists, and it lands properly on one family. Eclipse swaps its
sun-and-moon pair for a star and a dark sky. Constellation layers night onto whichever face the role
picked — but its default face is already a night sky, so it carries no night variant at all: a night room
that asked for no role of its own draws, in constellation, exactly what an unthemed room draws. Night
therefore shows on constellation over `causeway` and `irrigation`, and nowhere else.

The other families read `night` as nothing-said, each with its own `UNSPOKEN` list filtering the word out of
a skin lookup it should never have entered. A second ambience — dusk, lamplight, a sandstorm — is that many
files of editing today, where **an overlay per face**, the way constellation already does it, would be
additive.

**An ambience reaching only some families is the expected outcome, not a shortfall.** It layers on a place,
and plenty of places have nothing to say about the hour — a granary at night is a granary. So the count to
watch is not how many families answer, but whether the ones a journey actually draws do.

### Face names are not authoring vocabulary

Every family's skin table is keyed by its own private names — `irrigation` and `causeway` for
constellation, `channel` and `scribe` for hidato, `papyrus` for sudoku, `fields` for star battle. A theme
naming one of them wins outright, which is what makes **every face reachable in the puzzle lab, where only
a theme can be picked**. That override is the lab's affordance and not an authoring path: reaching a face
by its private name dresses the one family that happens to use that word and leaves its neighbours on
their defaults, which is the half-success the role exists to prevent. `irrigation` and `channel` are one
place under two words; so are `scribe` and `papyrus`. Author the role and the question never comes up.

## 3. Sprawl — the broad floor

`packing` is how much floor a level is given for the rooms it has to hold; above 1 the layout spreads out
rather than packing tight. The tiers set it as a chance rather than a fact: **expert, master and wizard
carry `packingChance: 0.25` at `packingWhenHit: 1.6`**, and starter and junior carry none, so the first two
tiers never sprawl at all.

Two places author it outright. `expert_4` gives its 2nd and 4th pyramids `packing: 2` — the tier that first
brings floor keys onto the open main path, and a broad floor is somewhere to hide a key. And a tomb
resolves the roll once for the whole site, so a tomb comes out sprawling on every floor or on none, where a
pyramid picks up a floor or two.

## 4. Starter

| Journey                              | Pyramids | Floors | Rooms | Sprawl | Wears | What its story asks for                       |
| ------------------------------------ | -------- | ------ | ----- | ------ | ----- | --------------------------------------------- |
| `starter_1` Dawn at the Sphinx       | 2        | 3      | 13    | —      | —     | dawn · weathered sandstone                    |
| `starter_2` Papyrus Merchant's Route | 2        | 4      | 21    | —      | —     | `scribe` · `trade` · market stall · reed bank |
| `starter_3` Temple of Bastet         | 4        | 4      | 26    | —      | —     | `light` · offering table · cat                |
| `starter_4` Scribe's Academy         | 4        | 4      | 29    | —      | —     | `scribe` · schoolroom ostraca                 |

| Tomb                                               | Floors | Rooms | Sprawl | Wears | What its story asks for  |
| -------------------------------------------------- | ------ | ----- | ------ | ----- | ------------------------ |
| `starter_treasure_tomb` Forgotten Merchant's Cache | 4      | 8     | —      | —     | cellar · crates and jars |

The Scribe's Academy is the one journey that could be dressed this afternoon:

```ts
journey("starter_4").pyramid("1-4", { encounter: ["scribe", "puzzle"] })
```

`scribe` draws hidato and sudoku and both have a face — a reed-pen register and a papyrus sheet — so a room
drawn for it comes out written on. Restricting to the pair would be too much of them: the academy has 19
sections and the pool has two families, which is 9.5 turns each against the 6.3 the game's least varied
journey already ships (§11). So `puzzle` rides along to re-admit everyone, and the two that can dress do.

The papyrus route wants `scribe` for the first half of its name and `trade` for the second, and both are
now dressed enough to mean something: canisters measures ink for one and wine for the other. What stops
either being restricted to is the pool — three members each, one short of the floor (§2) — so the route
prefers rather than restricts.

**And the Temple of Bastet stopped being a brief.** Lamplight was plain text in this table for as long as
`light` had no face at all; canisters measuring oil for the lamps is that face, so the cat's temple can now
ask for the role by name.

## 5. Junior

| Journey                             | Pyramids | Floors | Rooms | Sprawl | Wears                   | What its story asks for                        |
| ----------------------------------- | -------- | ------ | ----- | ------ | ----------------------- | ---------------------------------------------- |
| `junior_1` Sacred Ibis Migration    | 3        | 4      | 24    | —      | —                       | **`water`, ready to restrict** · marsh · flood |
| `junior_2` Valley of the Artisans   | 4        | 6      | 38    | —      | —                       | workshop · pigment · quarry                    |
| `junior_3` Temple of Thoth          | 4        | 6      | 45    | —      | —                       | `scribe` · moonlight · archive                 |
| `junior_4` Lighthouse of Alexandria | 5        | 7      | 47    | —      | `light`+`sky` + `night` | beacon · quay                                  |

| Tomb                                        | Floors | Rooms | Sprawl | Wears | What its story asks for |
| ------------------------------------------- | ------ | ----- | ------ | ----- | ----------------------- |
| `junior_treasure_tomb` Noble's Hidden Vault | 6      | 25    | —      | —     | treasury · wax seals    |

**`junior_4` is the only dressed journey in the world**, and it is authored right: `encounter: ["light",
"sky"]` with `theme: "night"`, covering the whole pyramid, side paths and trapped ones included — half a
themed pyramid reads as an accident. A lighthouse is a light in the sky, so it asks for both places.

**The list widens the pool now, which it did not when it was written.** `light` used to sit wholly inside
`sky` — eclipse and lightbeam carry both — so the union was the same five families either way and the
second word bought only the dressing. Canisters changed that: it carries `light` and NOT `sky`, so
`["light", "sky"]` now draws from six families where `sky` alone draws from five. Twenty-eight sections over
six is 4.7 turns each, comfortably inside the bar (§11), so the widening costs nothing.

`light` is written FIRST because the resolver takes the first role a family has a face for, and every
family here answers `sky` with its default: sky-first would win that search and cancel the narrower place
(§12). **That ordering has stopped being merely tidy.** When this was authored no family in either pool had
a `light` face, so the whole thing was intent — the ambience did the visible work, on eclipse's 13 rooms of
47, while constellation's 10 drew a night sky either way. Canisters brought the pool its first `light` face,
oil measured out for the lamps, and `light`-first is what makes the lighthouse reach for it. The beacon this
paragraph used to be waiting for is half here: eclipse and lightbeam still read as light sources without
dressing as one.

**The ibis migration is the tier's other change, and it is ready.** A marsh and a flood are `water`, the
pool has five members and every one of them dresses, and seventeen sections over five is 3.4 turns each —
the tightest restrict in the game after the lighthouse (§14). One line, and every room of it is a river.

Thoth is the god of writing and the moon, and the two asks split the same way: `scribe` dresses all three
of its families now, though the pool is one member short of being restrictable — while a moonlit board
would be a second ambience, colder than night and lit from one side rather than unlit.

## 6. Expert

| Journey                          | Pyramids | Floors | Rooms | Sprawl             | Wears | What its story asks for                     |
| -------------------------------- | -------- | ------ | ----- | ------------------ | ----- | ------------------------------------------- |
| `expert_1` Valley of the Kings   | 4        | 7      | 84    | 2/7                | —     | necropolis · torchlight · painted wall      |
| `expert_2` Karnak Temple Complex | 4        | 6      | 83    | 1/6                | —     | hypostyle columns · solar gold · festival   |
| `expert_3` Nile Delta Expedition | 5        | 7      | 107   | 1/7                | —     | `water` · delta marsh · crocodile           |
| `expert_4` Pyramid of Djoser     | 5        | 7      | 99    | 2/7 (`packing: 2`) | —     | `trade` (2 of 3) · terraces · building site |

| Tomb                                          | Floors | Rooms | Sprawl | Wears | What its story asks for |
| --------------------------------------------- | ------ | ----- | ------ | ----- | ----------------------- |
| `expert_treasure_tomb` High Priest's Treasury | 4      | 21    | —      | —     | relic sanctum · incense |
| `expert_treasure_tomb_b` Inner Sanctum        | 4      | 20    | 4/4    | —     | sealed holy of holies   |

**The Nile Delta expedition is the one journey whose change is already written down.** The spec carries the
line that would author it — `journey("expert_3").pyramid("1-5", { encounter: "water" })` — and the reason
it has not been pulled: the `water` pool draws all four of its families across the journey and every one of
them has a face, so the paper half is settled. What the spec's own line does not settle is the mode: 42
sections over four families is 10.5 turns each, well past the 6.3 bar (§11), so the delta wants
`["water", "puzzle"]` and a thumb on the scale rather than the four-family restriction as written. The crocodile is already a trap family; a crocodile _face_ would be
the delta's water dressed as something that bites.

Djoser is a building site, which is exactly constellation's causeway — and canisters has since joined the
`trade` pool with a merchant's cellar, so two of its three families dress now. Balance scale is the one
left, and a scale is a market instrument: it is the clearest argument in the tier for giving it a second
face. The pool being three also means Djoser prefers rather than restricts (§14).

`expert_4` is also where sprawl stops being a coin toss: two of its five pyramids are authored broad
because the tier puts a coloured key on the open main path, and a broad floor is somewhere to hide one.

## 7. Master

| Journey                          | Pyramids | Floors | Rooms | Sprawl | Wears | What its story asks for                    |
| -------------------------------- | -------- | ------ | ----- | ------ | ----- | ------------------------------------------ |
| `master_1` Great Pyramid of Giza | 4        | 8      | 83    | 1/8    | —     | `sky` (0 of 5 dressed) · gallery · granite |
| `master_2` Book of the Dead      | 5        | 10     | 121   | 1/10   | —     | `scribe` · funerary scroll · judgement     |
| `master_3` Curse of the Pharaohs | 5        | 10     | 125   | 1/10   | —     | `night` · omen · dust and decay            |
| `master_4` Tomb of Nefertari     | 5        | 10     | 109   | —      | —     | fresco · queen's blue · lamplight          |

| Tomb                                    | Floors | Rooms | Sprawl | Wears | What its story asks for    |
| --------------------------------------- | ------ | ----- | ------ | ----- | -------------------------- |
| `master_treasure_tomb` Hall of Ma'at    | 5      | 30    | —      | —     | weighing hall · feather    |
| `master_treasure_tomb_b` Hall of Osiris | 5      | 30    | 5/5    | —     | underworld green · rebirth |

The Book of the Dead is the strongest `scribe` case above starter: a funerary scroll is a written surface
and both families in the pool can draw one. Its other word is **judgement**, and that is the balance scale
without a single rule changed — a heart in one pan, a feather in the other (§9). A curse is the tier's ambience case rather than a role one —
`night` over it would land on its eclipse rooms and leave its constellation rooms exactly as they are
(§2), which is why the ambience axis needs overlays before it needs more names. Nefertari's tomb is the
most decorated in Egypt and asks for the one thing no board here does: colour laid on plaster, blues and
ochres rather than ink on a ground.

## 8. Wizard

| Journey                          | Pyramids | Floors | Rooms | Sprawl | Wears | What its story asks for                 |
| -------------------------------- | -------- | ------ | ----- | ------ | ----- | --------------------------------------- |
| `wizard_1` Ra's Solar Journey    | 4        | 12     | 135   | 1/12   | —     | `night` · duat · solar barque · serpent |
| `wizard_2` Secrets of the Sphinx | 5        | 15     | 177   | 2/15   | —     | buried sand · riddle · excavation       |
| `wizard_3` Chamber of Ma'at      | 6        | 18     | 207   | 2/18   | —     | scales · feather of truth · cosmic      |
| `wizard_4` Eternal Pyramid       | 6        | 18     | 207   | 1/18   | —     | void · gold · mirrored infinity         |

| Tomb                                            | Floors | Rooms | Sprawl | Wears | What its story asks for                              |
| ----------------------------------------------- | ------ | ----- | ------ | ----- | ---------------------------------------------------- |
| `wizard_treasure_tomb` Vault of the Gods        | 4      | 28    | 4/4    | —     | divine vault                                         |
| `wizard_treasure_tomb_b` Realm of Cosmic Forces | 4      | 28    | —      | —     | life · death · chaos · wind, per its own description |
| `wizard_treasure_tomb_c` Throne of Eternity     | 4      | 28    | —      | —     | throne · endless hall                                |

Ra's journey is the one narrative in the catalogue that is literally about night, and it wants more than a
dark board: a boat crossing a river of it, with a serpent in the way. The two 6-pyramid journeys are the
largest things in the game at 207 rooms each, and they part company on what they ask for. Ma'at is
judgement, and the Chamber names the scales and the feather outright — the balance scale's own mechanic,
which puts `wizard_3` in the funerary cluster (§9) as the largest single journey any of it would reach.
Only the Eternal Pyramid asks for somewhere that is not Egypt at all: the void beyond the sky.

## 9. The gaps, and what filling each one buys

Two severities, and they are not the same job. **No family serves the place** — nothing can carry the
journey, and the fix is a role plus the families to fill it. **Every family serves it but none looks
different** — the journey is carryable today and authoring it changes nothing visible, so the fix is a
face. Ranked by the rooms it would reach, since one built for a cluster pays for itself across a tier and
one built for a single pyramid does not.

| Gap                                                  | Reaches                                                                | Rooms | What it takes                                                                                                                                                  |
| ---------------------------------------------------- | ---------------------------------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A `funerary` role** — **BUILT**                    | `expert_1`, `master_2`, `master_3`, `master_4`, `wizard_1`, `wizard_3` | 781   | Done (§13): four faces, six journeys authored, no new generator. What is left is the SHARE — see §11's prefer mode.                                            |
| **A cosmos role**                                    | `wizard_4`                                                             | 207   | The one story with no Egyptian hook at all: the void beyond the sky. A new family, or the largest new face in the game.                                        |
| **A warm-light ambience**                            | `starter_3`, `junior_3`, `expert_1`, `master_4`                        | 264   | Overlays per face rather than a new skin per family. Four briefs — lamplight twice, torchlight, moonlight — asking for one thing.                              |
| **A fourth family for `scribe`, `trade` or `light`** | `starter_2`, `starter_4`, `junior_3`, `expert_4`                       | 187   | All three pools sit at three, one short of the floor a journey must clear to restrict to a role (§2). A tag on an existing family is the whole of it.          |
| **`light` faces for eclipse and lightbeam**          | `junior_4`                                                             | 47    | Canisters gave the pool its first face; these two still read as light sources without dressing as one. Lightbeam has no skin system at all, so it is two jobs. |

Read together:

- **Two roles are ready and six journeys want them.** `water` and `scribe` dress every family in their
  pools, and between them they fit `starter_2`, `starter_4`, `junior_1`, `junior_3`, `expert_3` and
  `master_2`. Two of those are one authored line each and nothing is stopping them.
- **The gaps are in the pools and in the roles, never in the names.** A second word for a place that
  already has one buys nothing; a face for a family that has none is what makes authoring the role show.
- **Only `wizard_4` is blocked on a place nothing can carry.** Every other story either has a pool that
  already reads as its place, or — the funerary cluster — has built families whose mechanics fit.
- **The binding constraint has moved from faces to POOL SIZE.** `scribe`, `trade` and `light` are all
  dressed as far as they go and all stuck at three members, so no journey may restrict to them. One tag on
  one existing family unblocks each.
- **Half the catalogue asks for something funerary or cosmic**, and those are the two things no role
  serves. That is where new families should be pointed — and a mechanic still has to hold up on its own
  first (`PUZZLE_FAMILIES.md`): a dress is not a reason to build a puzzle, but a puzzle looking for a home
  may find one here.
- **Sprawl is a tier property, not a journey one** — the only journey authored broad is `expert_4`, and it
  is authored for a mechanic rather than for a look.

### The funerary pool is already in the catalogue

It is the cheapest big thing here because nothing needs inventing — four built families fit the place on
their own mechanics, and `PUZZLE_FAMILIES.md` §11.1 already names three of them under **Tomb / Burial
Logic**:

- **Balance scale** — the catalogue titles it _"§4.2 Balance scale (weighing of the heart)"_, which is what
  the family was before `trade` was attached to it. A heart in one pan against a feather in the other is
  exactly what the mechanic does, and it is the same room `master_2` asks for as "judgement" and `wizard_3`
  as "scales · feather of truth". No family in the game has a closer fit between its rules and a myth —
  and the fit goes all the way down, because **the unknowns are already symbols a face may choose**. The
  generator's own note says any distinguishable set works, since the solver never reads a glyph; its pool
  is Egyptian already and the feather is in it. So the funerary face is not a dress over the board, it is
  the thing the player is solving for: what does the heart weigh.
- **Sudoku** — §11.1's "Glyph Latin-square" is this family (§4.8, shipped as §4.26), and it already draws
  hieroglyphs rather than figures. Its funerary face is signs cut into a wall instead of inked on papyrus.
- **Hidato** — §11.1 already reads its comb as "a honeycomb of sealed chambers".
- **Constellation** — an Egyptian tomb ceiling is a painted starred sky, and Nefertari's is the famous one.
  That face is also `master_4`'s own brief, which asks for a fresco in queen's blue.

**Four is exactly the floor `rolePools.spec.ts` enforces**, so the role becomes authorable the moment the
fourth face lands — the same position `water` was in before hidato and twin stars joined it. Which also
means `wizard_3` belongs to this cluster rather than to cosmos: Ma'at is judgement, and its brief names the
scales outright. Cosmos is left with `wizard_4` alone.

**And it wants two tags, not one, because a tag can be wide or narrow.** A necropolis, a curse and the duat
are funerary without being a judgement; the weighing is the narrow place inside the wide one. So
`judgement` sits inside `funerary` exactly as `light` sits inside `sky`:

| Family        | `funerary`             | `judgement`           |
| ------------- | ---------------------- | --------------------- |
| balance scale | ✓                      | ✓ — heart and feather |
| constellation | ✓ — painted ceiling    | —                     |
| sudoku        | ✓ — signs cut in stone | —                     |
| hidato        | ✓ — sealed chambers    | —                     |

The narrow pool has one member, and that is fine because **it is never authored alone**:

```ts
journey("master_2").pyramid("1-5", { encounter: ["judgement", "funerary"] })
journey("expert_1").pyramid("1-4", { encounter: "funerary" })
```

The list is a union, so the Book of the Dead still draws from all four families and clears the floor; the
narrow word only decides the dressing, and the resolver takes the first role a family has a face for. The
scale turns up wearing the scales; every other family wears its funerary face. That is the lighthouse
pattern (§5) with the pools one size larger, and the reason `rolePools.spec.ts` had to start measuring an
authored role whole rather than tag by tag — a one-family narrow tag is only ever legible as half of a
list.

## 10. What a clean authoring system needs

The contract in §2 is right; three things stop it holding by construction.

1. **One vocabulary, and it is the role words.** A family should declare which faces serve which roles and
   nothing else — specified as `FamilyMeta.faces` in §12. The private names (`irrigation`, `channel`, `papyrus`) become internal ids the lab shows,
   never words a site can author. Today a place name typed into `theme` is accepted, and each family's
   `SKINS[theme]` lookup makes it half work — dressing whoever happens to use that word and leaving its
   neighbours on their defaults. That silent half-success is the defect; aliasing names between families
   papers over it and grows as families × places.
2. **Guard it at generation, not at render.** `Theme` is a bare `string`, so nothing catches a place in the
   ambience field or a role no family dresses. Two asserts at world-gen — an authored theme is an ambience
   word, an authored role has a face in every family of its pool — turn both into an error instead of a
   look nobody notices. `rolePools.spec.ts` is already this shape, and the §9 table wants generating rather
   than hand-keeping.
3. **Ambience layers, it does not swap.** Constellation is the only family that models it; the other five
   filter `night` out of a lookup with an `UNSPOKEN` list. An overlay per face makes a second ambience
   additive instead of five edits.

One wrinkle worth naming rather than hiding: **a tomb's place is per-site, not per-role.** Every tomb room
carries `role: "tomb-puzzle"`, so a weighing hall and a merchant's cellar cannot be told apart by role.
Tombs are the one legitimate case for a site-authored face, and worth designing as such rather than
treated as a counter-example to the rule.

## 11. Restrict or prefer — which mode a journey wants

A role narrows the pool, and on a long journey that is the problem: a family is assigned **per section**,
not per room, so what a player feels is `sections ÷ pool size`. Measured on this cut of the world:

| Journey     | Sections | Rooms | Unrestricted (10) | `sky` (5) | `water` (4) | `scribe` (2) |
| ----------- | -------- | ----- | ----------------- | --------- | ----------- | ------------ |
| `starter_1` | 8        | 13    | 0.8×              | 1.6×      | 2.0×        | 4.0×         |
| `starter_4` | 19       | 29    | 1.9×              | 3.8×      | 4.8×        | 9.5×         |
| `junior_1`  | 17       | 24    | 1.7×              | 3.4×      | 4.3×        | 8.5×         |
| `junior_4`  | 28       | 47    | 2.8×              | **5.6×**  | 7.0×        | 14.0×        |
| `expert_3`  | 42       | 107   | 4.2×              | 8.4×      | **10.5×**   | 21.0×        |
| `master_2`  | 50       | 121   | 5.0×              | 10.0×     | 12.5×       | **25.0×**    |
| `wizard_3`  | 63       | 207   | **6.3×**          | 12.6×     | 15.8×       | 31.5×        |

**6.3× is the bar**, because that is the worst variety the game already ships — wizard_3 and wizard_4
undressed. Anything at or under it is not a new problem.

- **Restrict when `sections ÷ pool` lands inside the bar.** `junior_4` on `sky` is 5.6×, so the lighthouse
  can be a lighthouse all the way through: five families across five pyramids, no worse than what the
  endgame already does. `junior_1` on `water` is 4.3×. These are the journeys where the pool _is_ the dress.
- **Prefer once it does not.** `expert_3` on `water` is 10.5× and `master_2` on `scribe` is 25× — twice and
  four times the bar. A two-family pool is unusable above starter, which also puts `starter_4` (9.5×) on
  this side of the line despite §4 reading the other way.

### Both modes, and only one of them needs building

```ts
// Restrict — the pool is the dress. Exists today, and this is the authored line.
journey("junior_4").pyramid("1-5", { encounter: ["light", "sky"], theme: "night" })

// Every family, dressed wherever one can. Also exists today, unweighted.
journey("wizard_3").pyramid("1-6", { encounter: ["cosmos", "puzzle"] })
```

The second line already works and nothing had to be added for it. **A role list means "any of these"**, so
adding `puzzle` re-admits every family; the list is written to the room verbatim, and `skinFor` takes the
first role it has a face for — so a cosmos family wears cosmos and every other family draws its default.
The contract that makes this safe is the one in §2: an unknown role never breaks a room.

What is missing is the **bias**. Unweighted, a three-family cosmos pool dresses 3 sections in 10 — 19 of
`wizard_3`'s 63, against 44 plain, which likely reads as a handful of odd rooms rather than a cosmos
journey. Weighting needs the allocator to know which families _dress_ a role, and it cannot: that mapping
lives in each family's private `app/*/skins.ts` `ROLE_SKINS`, invisible to `src/worldGen`.

Which is §10 point 1 with a second reason to do it. Declaring the faces a family serves in `FamilyMeta`
pays for itself three times: the §9 gap table generates instead of being hand-kept, the generation guard
can fail on a role no family dresses, and the allocator can weight a preferred role — a bag holding every
eligible family plus the dressing ones a second and third time is enough of a thumb on the scale, and the
number to check afterwards is what share of a journey's sections came out dressed.

Note that preferring `sky` is inherently a no-op: every family in that pool serves it with its default face
(§2), so there is nothing to weight toward. A star journey has to restrict — which is what the lighthouse
wanted anyway, and why the pool being full matters more there than any face would.

## 12. Spec — the `faces` declaration

One field on `FamilyMeta`, and it is a **move** rather than a new thing to keep: the `ROLE_SKINS` table each
family already keeps privately in `app/<family>/skins.ts` relocates to its `game/<family>/meta.ts`, where
`src/worldGen` can read it.

```ts
// src/game/families/familyMeta.ts
export type FamilyMeta = {
  // …
  /** Which of this family's own faces serves which role — the shared role vocabulary on the left, this
   *  family's private face ids on the right. **Every tag except `puzzle` needs an entry**, and
   *  `"default"` is a real answer: it says this family already reads as that place without being asked.
   *  Star battle's default is stars on a dark ground, so it declares `sky: "default"` rather than
   *  nothing — the claim that it can carry a night journey has to be in the data, or a report reading
   *  the data will deny it. Read by the skin resolver at play time and by the encounter allocator at
   *  generation, which is the point of it living out here. */
  faces?: Record<string, string>
}
```

What every family declares, read off its existing `ROLE_SKINS` and its skin table's own descriptions:

| Family                  | `faces`                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------- |
| constellation           | `{ sky: "default", trade: "causeway", water: "irrigation", agriculture: "irrigation" }` |
| hidato                  | `{ water: "channel", agriculture: "channel", scribe: "scribe" }`                        |
| star battle, twin stars | `{ sky: "default", water: "fields", agriculture: "fields" }`                            |
| sudoku                  | `{ scribe: "papyrus" }`                                                                 |
| eclipse                 | `{ sky: "default", light: "default" }`                                                  |
| lightbeam               | `{ sky: "default", light: "default" }` — or drop the tags, see below                    |
| balance scale           | `{ trade: "default" }` — and a `funerary` face is the stronger claim (§9)               |
| everything else         | unset — their only tag is `puzzle`                                                      |

Eclipse's `night` pair is deliberately absent: it is an ambience, not a role face, and the two axes do not
share a field (§2).

### Two invariants, and what they catch

1. **Every key is one of the family's own `tags`, and every tag but `puzzle` is a key.** A family cannot
   dress a place it is not eligible for, and cannot claim eligibility for a place it will not answer for.
2. **Every value is `"default"` or names a face in that family's own skin table.** Impossible to drift once
   that table is the one the resolver reads.

The first half of invariant 1 fails on three existing entries, which is the argument for having it:

| Entry                                | Why it is dead                                                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| constellation `logistics` → causeway | No family carries the `logistics` tag, so the pool is empty and this real face is unreachable — the §2 finding, caught mechanically. |
| constellation `light` → default      | Constellation is not in the `light` pool.                                                                                            |
| star battle `light` → default        | Nor is star battle.                                                                                                                  |

The second half is the more valuable one, because it turns a silent assumption into a question someone has
to answer. Three tags have no entry at all today and each is a real decision: does **lightbeam** read as
`sky`, or is that tag borrowed from its `light` one? Does **balance scale** read as `trade` — a scale
weighing goods is a market instrument, so probably yes, though the catalogue titled that family "weighing
of the heart" and its funerary claim is the stronger one (§9). A tag with no face declared is a family
sitting in a pool it has never been asked to justify.

### `"default"` must not win a role list

The resolver takes the first role it has a face for out of a list, so an entry pointing at `"default"` wins
that search and cancels the roles behind it: `["sky", "water"]` would draw constellation's star map rather
than its waterworks. Nothing is harmed today, because every room in the baked world carries a
single-string role — but §11's prefer mode makes `["<role>", "puzzle"]` the normal authoring, and lists
stop being hypothetical.

So the resolver prefers a **non-default** entry and falls back to the default one:

```ts
const byRole = roles.map(r => faces[r]).find(face => face && face !== "default" && SKINS[face])
const base = named ?? (byRole ? SKINS[byRole] : SKINS.default)
```

A `"default"` entry then costs nothing at render time and carries its whole weight as data: it is the
family saying _I am this place already_, which is what the report needs and what the resolver has no use
for.

### What it generates

`yarn dressing` (or a `--dressing` block on `yarn world-info`, which already walks every journey) prints
what §2, §9 and §11 currently hand-keep:

1. **Role pools** — per role: its pool from `tags`, how many members read as the place, and how many have a
   face that differs from their default. §2's table, computed, with the two columns kept apart.
2. **Per journey** — sections, rooms, and `sections ÷ pool` for every role its pool could serve, against
   the 6.3 bar, with the restrict-or-prefer verdict. §11's table, computed.
3. **The gaps, by severity** — roles no family serves at all, then roles every member serves with nothing
   but its default. §9's ranking and Rooms column, computed; only the story briefs stay prose, because what
   a journey's name asks for is not a thing a script can read.

One spec asserts both invariants, so a family added with a tag it has not answered for fails the build
rather than quietly widening a pool.

### Order to do it in

1. Add `faces`, populate it from the four `ROLE_SKINS` tables plus the `"default"` entries the skin files
   already describe in prose, and drop the three dead keys. Each family's `skinFor` reads `meta.faces`
   instead of its local constant, with the non-default preference above.
2. Answer the unclaimed tags — lightbeam's `sky` and `light`, balance scale's `trade` — by declaring a face
   or dropping the tag.
3. Add the two invariants as one spec.
4. Add the report, and cut the hand-kept numbers out of §2, §9 and §11 in favour of running it.
5. Only then the two things this unblocks: the generation guard (§10 point 2) and weighting a preferred
   role (§11).

`themes` stays as it is. It is the puzzle lab's picker list and it holds ambience names as well as face
ids, so it is not derivable from `faces` alone — worth collapsing later, not on the way to this.

## 13. What the funerary cluster came out as

Built 2026-08-27. Four faces and six authored journeys, and no new puzzle: `PUZZLE_FAMILIES.md` §11.1 had
read three of these families as tomb material already, and the fourth is titled "weighing of the heart".

| Family        | Its funerary face                                                     |
| ------------- | --------------------------------------------------------------------- |
| balance scale | the weighing itself — the unknowns become the heart and the feather   |
| constellation | a painted ceiling, stars in pigment on flat plaster rather than depth |
| hidato        | a comb of sealed chambers, opened as the passage reaches them         |
| sudoku        | its default, which was always signs cut into a chamber wall           |

**Every one of the six is authored in prefer mode**, because every one of them is past the bar: four
families over 37 to 63 sections is 9 to 16 turns each, against the 6.3 the least varied journey already
ships (§11). So they author `["funerary", "puzzle"]` — a union, so the pool stays every family and **the
draw does not change at all**. Regenerating moved `role` fields and nothing else; every journey's room
count is what it was.

`master_2` and `wizard_3` lead with the narrow word, `["judgement", "funerary", "puzzle"]`. Their stories
name the judgement and only the balance scale draws that scene, so the scale turns up wearing the scales
while its neighbours wear the wider tomb — `junior_4`'s `["light", "sky"]` one pool size up.

**What is left is the share, not the faces.** Unweighted, four families in ten means roughly two rooms in
five come out dressed and the rest draw their defaults. Weighting a preferred role is designed and unbuilt
(§11), and `FamilyMeta.faces` (§12) is what it waits on — the allocator cannot prefer what it cannot see.

One wrinkle, noted because it looks alarming in a diff and is not: authoring an encounter on a pyramid also
stamps one onto its chainless sections, the `pathPuzzles: 0` treasure ends. Those fields are inert — the
assembler builds puzzle rooms in a loop over `pathPuzzles`, so a chainless section makes none and its end
stays a treasure chest. `junior_4` has carried 13 of them since it was authored.

## 14. What canisters opened, and what is now authorable

`canisters` (§4.28) carries six roles, so four pools changed at once (§2). This is what that makes possible,
measured the way §11 measures it: a pool clears the four-member floor `rolePools.spec.ts` enforces, and the
journey's own `sections ÷ pool` sits under the bar — which is now **5.7**, since the widest journey draws 63
sections from eleven families.

| Journey                          | Sections | Role it wants      | Pool | Turns each | Verdict                        |
| -------------------------------- | -------- | ------------------ | ---- | ---------- | ------------------------------ |
| `junior_1` Sacred Ibis Migration | 17       | `water`            | 5    | 3.4        | **restrict** — marsh and flood |
| `junior_4` Lighthouse            | 28       | `["light", "sky"]` | 6    | 4.7        | restrict — already authored    |
| `starter_3` Temple of Bastet     | 16       | `light`            | 3    | 5.3        | prefer — pool short of four    |
| `starter_2` Papyrus Route        | 13       | `scribe` / `trade` | 3    | 4.3        | prefer — pool short of four    |
| `starter_4` Scribe's Academy     | 19       | `scribe`           | 3    | 6.3        | prefer — pool short, over bar  |
| `junior_3` Temple of Thoth       | 25       | `scribe`           | 3    | 8.3        | prefer                         |
| `expert_3` Nile Delta            | 42       | `water`            | 5    | 8.4        | prefer                         |
| `expert_4` Pyramid of Djoser     | 41       | `trade`            | 3    | 13.7       | prefer                         |

**`junior_1` is the find.** Seventeen sections over five fully-dressed families is 3.4 turns each — the
tightest restrict in the game after the lighthouse, and every room of it would be a river or a flood plain:

```ts
journey("junior_1").pyramid("1-3", { encounter: "water" })
```

**Everything else wants the prefer form**, `["<role>", "puzzle"]`, and for two different reasons that are
worth keeping apart. `expert_3` and `junior_3` are simply too long for their pools. `starter_2`,
`starter_3`, `starter_4` and `expert_4` are not: their ratios are fine, and what stops them is the
four-member floor. **One tag on one existing family turns four of those from prefer into restrict** — which
is why the §9 table now ranks pool size above faces.

**The funerary six get denser for free.** Canisters is in that pool with a face of its own, so the next
`yarn generate-world` raises the dressed share of all 781 rooms without a line of authoring changing (§13).

**Nothing here is authored yet**, and none of it takes effect until the world is re-cut — the tags are
eligibility, and the baked world still predates this family entirely.
