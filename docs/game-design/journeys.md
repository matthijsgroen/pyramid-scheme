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

| Role                    | Families in the pool                                       | Read as the place | Look different from default |
| ----------------------- | ---------------------------------------------------------- | ----------------- | --------------------------- |
| `water` / `agriculture` | constellation, hidato, star battle, twin stars             | 4 of 4            | 4 of 4                      |
| `scribe`                | hidato, sudoku                                             | 2 of 2            | 2 of 2                      |
| `sky`                   | constellation, eclipse, lightbeam, star battle, twin stars | 5 of 5            | 0 of 5                      |
| `light`                 | eclipse, lightbeam                                         | 2 of 2            | 0 of 2                      |
| `trade`                 | balance scale, constellation                               | 2 of 2            | 1 of 2                      |
| `logistics`             | —                                                          | —                 | —                           |

**The two columns are different questions and they must not be collapsed.** _Read as the place_ is whether
a journey can be carried at all — a star battle board is stars on a dark ground whether or not anyone
authored `sky`, and its own skin file calls that "the plainest possible face for the `sky` pool". _Look
different_ is whether authoring the role visibly changes anything. Collapsing them into one "has a face"
count reports `sky` and `light` as empty, which would deny that five families can carry a night journey
and that a family named lightbeam can serve `light`.

Four readings of that table before authoring anything:

- **`water` and `scribe` are ready today.** Every family in both pools has a face waiting, so one authored
  word dresses every room. They are the only two roles in that state.
- **`sky` is already dressed, which is why it changes nothing.** Five families read as a night sky before
  anyone asks — it is constellation's default face, star battle's and twin stars' too, and eclipse's pair
  hangs in one. So a `sky` room draws what an unauthored room draws: asking for it narrows the pool without
  changing the look. That is a full pool to carry a star journey and an empty one to make it look new, and
  `junior_4` is the proof of both — authored `sky`, and its look comes from `night`.
- **`light` is the same shape.** Eclipse's sun and moon and lightbeam's beams both read as light sources,
  so a lighthouse tier is carryable today; neither has a face that would make it look like one.
- **`logistics` is an empty pool.** Constellation maps it to its causeway, but no family carries the tag,
  so a site authoring it would find nobody. `trade` is the word that works — and balance scale owes that
  pool an answer, since a scale weighing goods either reads as a market or the tag should go (§12).
- **A tomb has no faces at all.** A tomb's rooms are tableau and the fez shop, and neither has a skin
  system, so no role or ambience reaches one. Two tombs hold a single stray puzzle room apiece — a balance
  scale in the noble's vault, a twin stars in the high priest's — and one room is not a dress.

### The ambience axis is thinner than it looks

`night` is the only ambience that exists, and it lands properly on one family. Eclipse swaps its
sun-and-moon pair for a star and a dark sky. Constellation layers night onto whichever face the role
picked — but its default face is already a night sky, so it carries no night variant at all: a night room
that asked for no role of its own draws, in constellation, exactly what an unthemed room draws. Night
therefore shows on constellation over `causeway` and `irrigation`, and nowhere else.

The other five families read `night` as nothing-said, each with its own `UNSPOKEN` list filtering the word
out of a skin lookup it should never have entered. A second ambience — dusk, lamplight, a sandstorm — is
five files of editing today, where **an overlay per face**, the way constellation already does it, would be
additive.

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

| Journey                              | Pyramids | Floors | Rooms | Sprawl | Wears | What its story asks for                      |
| ------------------------------------ | -------- | ------ | ----- | ------ | ----- | -------------------------------------------- |
| `starter_1` Dawn at the Sphinx       | 2        | 3      | 13    | —      | —     | dawn · weathered sandstone                   |
| `starter_2` Papyrus Merchant's Route | 2        | 4      | 21    | —      | —     | `scribe` · `trade` (1 of 2) · market · reeds |
| `starter_3` Temple of Bastet         | 4        | 4      | 26    | —      | —     | lamplight · offering table · cat             |
| `starter_4` Scribe's Academy         | 4        | 4      | 29    | —      | —     | `scribe` · schoolroom ostraca                |

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

The papyrus route wants `scribe` for the first half of its name and `trade` for the second, and `trade` is
where the pool runs out — balance scale has no face, so half those rooms stay on their default.

## 5. Junior

| Journey                             | Pyramids | Floors | Rooms | Sprawl | Wears                   | What its story asks for         |
| ----------------------------------- | -------- | ------ | ----- | ------ | ----------------------- | ------------------------------- |
| `junior_1` Sacred Ibis Migration    | 3        | 4      | 24    | —      | —                       | `water` · marsh · flock · flood |
| `junior_2` Valley of the Artisans   | 4        | 6      | 38    | —      | —                       | workshop · pigment · quarry     |
| `junior_3` Temple of Thoth          | 4        | 6      | 45    | —      | —                       | `scribe` · moonlight · archive  |
| `junior_4` Lighthouse of Alexandria | 5        | 7      | 47    | —      | `light`+`sky` + `night` | beacon · quay                   |

| Tomb                                        | Floors | Rooms | Sprawl | Wears | What its story asks for |
| ------------------------------------------- | ------ | ----- | ------ | ----- | ----------------------- |
| `junior_treasure_tomb` Noble's Hidden Vault | 6      | 25    | —      | —     | treasury · wax seals    |

**`junior_4` is the only dressed journey in the world**, and it is authored right: `encounter: ["light",
"sky"]` with `theme: "night"`, covering the whole pyramid, side paths and trapped ones included — half a
themed pyramid reads as an accident. A lighthouse is a light in the sky, so it asks for both places.

**The list costs no variety.** A role list is a union for eligibility and `light` (eclipse, lightbeam) sits
inside `sky`, so the pool is the same four families either way — the second word buys the dressing, not the
draw. Regenerating moved nothing but the `role` field on 40 sections. `light` is written FIRST because the
resolver takes the first role a family has a face for, and every family here answers `sky` with its
default: sky-first would win that search and cancel the narrower place (§12).

It is also the clearest reading of where the two axes stand. Neither role changes the look, because the star
map is already every one of those families' default. The ambience is what shows, and it shows on eclipse's
13 rooms of 47; constellation's 10 are drawing a night sky either way (§2). So the authoring is intent
today, and the day a beacon face ships this pyramid wears it without being re-authored — a beacon is the
strongest brief in the tier for a face that does not exist.

Thoth is the god of writing and the moon, and the two asks split the same way: `scribe` is ready to author
today, while a moonlit board would be a second ambience — colder than night, and lit from one side rather
than unlit.

## 6. Expert

| Journey                          | Pyramids | Floors | Rooms | Sprawl             | Wears | What its story asks for                     |
| -------------------------------- | -------- | ------ | ----- | ------------------ | ----- | ------------------------------------------- |
| `expert_1` Valley of the Kings   | 4        | 7      | 84    | 2/7                | —     | necropolis · torchlight · painted wall      |
| `expert_2` Karnak Temple Complex | 4        | 6      | 83    | 1/6                | —     | hypostyle columns · solar gold · festival   |
| `expert_3` Nile Delta Expedition | 5        | 7      | 107   | 1/7                | —     | `water` · delta marsh · crocodile           |
| `expert_4` Pyramid of Djoser     | 5        | 7      | 99    | 2/7 (`packing: 2`) | —     | `trade` (1 of 2) · terraces · building site |

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

Djoser is a building site, which is exactly constellation's causeway — but balance scale is the other half
of the `trade` pool and has no face, so a `trade` pyramid comes out half-dressed. It is the clearest
argument in the tier for giving balance scale a second face rather than for authoring the role first.

`expert_4` is also where sprawl stops being a coin toss: two of its five pyramids are authored broad
because the tier puts a coloured key on the open main path, and a broad floor is somewhere to hide one.

## 7. Master

| Journey                          | Pyramids | Floors | Rooms | Sprawl | Wears | What its story asks for                    |
| -------------------------------- | -------- | ------ | ----- | ------ | ----- | ------------------------------------------ |
| `master_1` Great Pyramid of Giza | 4        | 8      | 83    | 1/8    | —     | `sky` (look unchanged) · gallery · granite |
| `master_2` Book of the Dead      | 5        | 10     | 121   | 1/10   | —     | `scribe` · funerary scroll · judgement     |
| `master_3` Curse of the Pharaohs | 5        | 10     | 125   | 1/10   | —     | `night` · omen · dust and decay            |
| `master_4` Tomb of Nefertari     | 5        | 10     | 109   | —      | —     | fresco · queen's blue · lamplight          |

| Tomb                                    | Floors | Rooms | Sprawl | Wears | What its story asks for    |
| --------------------------------------- | ------ | ----- | ------ | ----- | -------------------------- |
| `master_treasure_tomb` Hall of Ma'at    | 5      | 30    | —      | —     | weighing hall · feather    |
| `master_treasure_tomb_b` Hall of Osiris | 5      | 30    | 5/5    | —     | underworld green · rebirth |

The Book of the Dead is the strongest `scribe` case above starter: a funerary scroll is a written surface
and both families in the pool can draw one. A curse is the tier's ambience case rather than a role one —
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
largest things in the game at 207 rooms each, and both ask for somewhere that is not Egypt at all — the
void beyond the sky, and a chamber where the mathematics is the cosmos.

## 9. The gaps, and what filling each one buys

Two severities, and they are not the same job. **No family serves the place** — nothing can carry the
journey, and the fix is a role plus the families to fill it. **Every family serves it but none looks
different** — the journey is carryable today and authoring it changes nothing visible, so the fix is a
face. Ranked by the rooms it would reach, since one built for a cluster pays for itself across a tier and
one built for a single pyramid does not.

| Gap                                      | Reaches                                                    | Rooms | What it takes                                                                                                                        |
| ---------------------------------------- | ---------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **A funerary role**                      | `expert_1`, `master_2`, `master_3`, `master_4`, `wizard_1` | 574   | A new tag on three or four families plus a face each. The biggest story cluster in the game, and nothing serves it.                  |
| **A cosmos role**                        | `wizard_3`, `wizard_4`                                     | 414   | Same shape, on the two largest journeys. Furthest from Egypt, so the most new art.                                                   |
| **A warm-light ambience**                | `starter_3`, `junior_3`, `expert_1`, `master_4`            | 264   | Overlays per face rather than a new skin per family. Four briefs — lamplight twice, torchlight, moonlight — asking for one thing.    |
| **A face for tableau**                   | all nine tombs                                             | 218   | No role work at all: tombs have no skin system, so this is a first face rather than a second.                                        |
| **A `trade` face for balance scale**     | `starter_2`, `expert_4`                                    | 120   | Both journeys are already authorable — a scale reads as a market. One face is what makes authoring it show.                          |
| **`light` faces for eclipse, lightbeam** | `junior_4`                                                 | 47    | Same shape: both families read as light sources already, neither has a face. Lightbeam has no skin system at all, so it is two jobs. |

Read together:

- **Two roles are ready and six journeys want them.** `water` and `scribe` dress every family in their
  pools, and between them they fit `starter_2`, `starter_4`, `junior_1`, `junior_3`, `expert_3` and
  `master_2`. Two of those are one authored line each and nothing is stopping them.
- **The gaps are in the pools and in the roles, never in the names.** A second word for a place that
  already has one buys nothing; a face for a family that has none is what makes authoring the role show.
- **Only funerary and cosmos are blocked on a role that cannot be carried.** Every other story has a pool
  that already reads as its place; what those pools lack is a face that differs from the default.
- **Half the catalogue asks for something funerary or cosmic**, and those are the two things no role
  serves. That is where new families should be pointed — and a mechanic still has to hold up on its own
  first (`PUZZLE_FAMILIES.md`): a dress is not a reason to build a puzzle, but a puzzle looking for a home
  may find one here.
- **Sprawl is a tier property, not a journey one** — the only journey authored broad is `expert_4`, and it
  is authored for a mechanic rather than for a look.

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
| balance scale           | `{ trade: "default" }` — or drop the tag, see below                                     |
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
weighing goods is a market instrument, so probably yes — or should the tag go? A tag with no face declared
is a family sitting in a pool it has never been asked to justify.

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
