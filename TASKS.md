# Faces for the funerary pool — task list

Six journeys and 781 rooms want a funerary place, and `docs/game-design/journeys.md` §9 works out that
**no new puzzle is needed for any of it**: four already-built families fit the place on their own mechanics.
This list turns that into one face per task.

**Each task is self-contained.** Finish it, commit, wipe context, paste the next prompt. Nothing carries
between them except the repo.

Background, only if you want it: `docs/game-design/journeys.md` §2 (role = the place, theme = the hour),
§9 (why this cluster), §12 (where the declaration is going). You do not need to read them to do a task.

## The plan at a glance

| #   | Task                                             | Size          | State |
| --- | ------------------------------------------------ | ------------- | ----- |
| 1   | sudoku — `funerary` tag, no new face             | tiny          | todo  |
| 2   | hidato — `funerary` face, sealed chambers        | one face      | todo  |
| 3   | constellation — `funerary` face, painted ceiling | one face      | todo  |
| 4   | balance scale — skin system + the weighing face  | system + face | todo  |
| 5   | author the six journeys, regenerate the world    | authoring     | todo  |

Order matters only at the end: task 5 needs all four families carrying the tag, because
`src/worldGen/rolePools.spec.ts` refuses to let a journey author a role whose pool has fewer than four
families. Tasks 1–4 are otherwise independent.

**Not on this list, deliberately:** a `trade` face for balance scale. That pool has two members against a
floor of four, so no journey could author it — worth doing when a third and fourth family carry `trade`,
not before.

## What every task shares

A **face** (the code calls it a skin) is one entry in a family's `SKINS` table plus one entry in its
`ROLE_SKINS` map, both in `src/mods/puzzle/app/<family>/skins.ts`. The face carries its own **name**, which
is what anything that has to say aloud what the room is will ask for — the goal sentence above the rules,
for one. So a face is pixels _and_ nouns, in one place.

A **tag** on `src/mods/puzzle/game/<family>/meta.ts` is eligibility and nothing else. Adding one changes no
room until a journey authors that role, which is why tasks 1–4 leave the generated world alone.

- **Do NOT run `yarn generate-world` in tasks 1–4.** `src/data/generatedWorld.ts` must come out of them
  unchanged; if it moved, something was authored that should not have been.
- Add the new face's name to `meta.themes` so the puzzle lab can show it. That list is the lab's picker
  and is the only place a face is reachable by name (`yarn dev`, port 9164).
- Do not touch `theme`/ambience handling. `UNSPOKEN = ["default", "night"]` stays as it is: `night` is the
  hour, not a place.
- **No CHANGELOG entry in tasks 1–4** — no player can see a face until a journey authors the role. Task 5
  adds the entry for the whole cluster.

Acceptance, every task:

```
yarn vitest run src/mods/puzzle/app/<family>
yarn tsc --noEmit
yarn lint                 # must be 0 errors; 19 pre-existing warnings are fine
yarn prettier --check <files you touched>
git diff --stat -- src/data/generatedWorld.ts    # must be EMPTY in tasks 1-4
```

---

## Task 1 — sudoku carries `funerary`, and its default already serves it

**Why no face:** sudoku's default skin is documented as "**Figures cut into stone** — a dark chamber wall
with the answer carved into it". A tomb wall of cut signs is what it already draws, so this is a tag and a
declaration, not new art. `PUZZLE_FAMILIES.md` §11.1 lists "Glyph Latin-square" under **Tomb / Burial
Logic**, and §4.8/§4.26 confirm that entry is this family.

**Files**

- `src/mods/puzzle/game/sudoku/meta.ts`
- `src/mods/puzzle/app/sudoku/skins.ts`
- `src/mods/puzzle/app/sudoku/skins.spec.ts`

**Do**

1. Add `"funerary"` to `tags`. Keep the existing comment style: say why the family is eligible (setting
   each sign down once per line is the same discipline whether the wall is a schoolroom or a tomb).
2. Add `funerary: "default"` to `ROLE_SKINS`, with a comment saying the default IS the tomb wall — this is
   the family declaring "I read as this place already" rather than pointing at a new face.
3. Add one spec case next to the existing role cases: `skinFor("funerary", undefined).name` is `"default"`,
   and note in a comment that this is a claim about the place rather than a dress.
4. Leave `themes` alone — no new face to show in the lab.

**Watch for:** nothing else should change. The `papyrus` register still wins for `scribe`.

**Commit:** `Sudoku already draws a chamber wall, so it carries funerary`

**Next prompt — paste after clearing context:**

> Read `TASKS.md` in the repo root and do **Task 2 — hidato's funerary face**. Task 1 is done and
> committed. Follow the task's own steps and its acceptance checks, then stop and show me the diff.

---

## Task 2 — hidato's `funerary` face: sealed chambers

**Why a real face:** hidato's default is "**Wax and honey** — a kept hive, where a cell is comb and the run
is a thread of honey through it". That is not a tomb. But `PUZZLE_FAMILIES.md` §11.1 reads the same comb as
"a honeycomb of sealed chambers", which is a different place drawn on the same board: cells are stone, and
the run is a passage opened from chamber to chamber.

**Files**

- `src/mods/puzzle/app/hidato/skins.ts`
- `src/mods/puzzle/game/hidato/meta.ts`
- `src/mods/puzzle/app/hidato/skins.spec.ts`

**Do**

1. Read the whole of `skins.ts` first. It already holds three faces — `hive` (default), `channel` (water,
   agriculture) and `sheet` (scribe) — and the `channel` one is the best model: it is the face that changed
   what a cell _means_ rather than only its colour.
2. Add a fourth face. Design notes rather than prescriptions:
   - Stone, not wax. The comb reads as cut chambers, so the cell wants a stone ground and a cut edge.
   - **The run is the thing that should carry the idea.** In `channel`, ground greens where water arrives;
     here, a chamber the passage has reached is a chamber opened, and one it has not is still sealed. That
     is `reached`, which `hive` deliberately ignores and `channel` uses — follow `channel`.
   - Givens keep the red rubric the other faces use: what the puzzle wrote versus what the player did has
     to stay readable, and that affordance is per-face.
3. `ROLE_SKINS` gains `funerary: "<your face name>"`. `SKINS` gains the entry. `name` is what the goal
   sentence will say, so pick the noun for the place, not for the mechanic.
4. Add `"funerary"` to `tags` in `meta.ts`, and the face name to `themes` so the lab can show it.
5. Spec it in `skins.spec.ts` alongside the existing per-face cases. The one that matters: the sealed and
   opened states differ, which is what makes it this face rather than the hive
   (`hive.cell({...look, reached: true})` equals `reached: false` — yours must not).

**Watch for:** `water`/`agriculture` must still draw `channel` and `scribe` still `sheet`. The existing
specs cover that — do not edit them to fit.

**Commit:** `A hidato comb of sealed chambers, opened as the run reaches them`

**Next prompt — paste after clearing context:**

> Read `TASKS.md` in the repo root and do **Task 3 — constellation's funerary face**. Tasks 1 and 2 are
> done and committed. Follow the task's own steps and its acceptance checks, then stop and show me the diff.

---

## Task 3 — constellation's `funerary` face: a painted ceiling

**Why a real face:** constellation's default is the night sky itself, and an Egyptian tomb ceiling is a
starred sky _painted on plaster_ — the same subject in a different material. Nefertari's is the famous one,
and `journeys.md` §7 records that `master_4`'s own brief asks for exactly this: "fresco · queen's blue".

**Files**

- `src/mods/puzzle/app/constellation/skins.ts`
- `src/mods/puzzle/game/constellation/meta.ts`
- `src/mods/puzzle/app/constellation/skins.spec.ts`

**Do**

1. Read the whole of `skins.ts`. Three faces (`default`, `irrigation`, `causeway`) and — unique to this
   family — a `night` overlay per face plus a `celebrate` animation per face.
2. Add the ceiling face:
   - Plaster and pigment rather than deep space: a painted ground, stars as ochre or gold on blue.
   - `celebrate` is a per-face choice and the existing comment explains the rule — the sky blooms because a
     star is a point of light, earthbound places only flare. A painted star is pigment on a wall, so decide
     which it is and say why in a comment.
   - **Give it a `night` overlay only if it earns one.** A painted ceiling in an unlit chamber is arguably
     the same painted ceiling; the default face carries no overlay for exactly that kind of reason ("The
     default sky IS night, so there is nothing for the ambience to change"). Either answer is fine if the
     comment says which and why.
3. `ROLE_SKINS` gains `funerary: "<face name>"`. `tags` gains `"funerary"`. `themes` gains the face name.
4. Spec it beside the existing cases: the role draws the new face, and `trade`/`water` still draw
   `causeway`/`irrigation`.

**Watch for:** this family resolves `night` as an _ambience_ layered on the role's face (`AMBIENCE`), not
as a face name. Do not add it to `UNSPOKEN` or otherwise reshape that path.

**Commit:** `A constellation ceiling: stars in pigment rather than in the sky`

**Next prompt — paste after clearing context:**

> Read `TASKS.md` in the repo root and do **Task 4 — balance scale's skin system and its weighing face**.
> Tasks 1 to 3 are done and committed. This is the biggest task in the list; follow its steps and its
> acceptance checks, then stop and show me the diff.

---

## Task 4 — balance scale gets a skin system, and the weighing of the heart

**Why this family at all:** `PUZZLE_FAMILIES.md` titles it "**§4.2 Balance scale (weighing of the heart)**".
The funerary reading is what the family _was_, before `trade` was attached to it — a heart in one pan
against a feather in the other is what the mechanic already does. It is the closest fit between rules and
myth in the catalogue, and it is the fourth member the pool needs.

**Why it is bigger:** this family has **no `skins.ts` at all**. Everything it draws is hardcoded in
`BalanceBoard.tsx`. So this task builds the system first and the face second.

**Files**

- `src/mods/puzzle/app/balanceScale/skins.ts` (new)
- `src/mods/puzzle/app/balanceScale/skins.spec.ts` (new)
- `src/mods/puzzle/app/balanceScale/BalanceBoard.tsx`, and `BalancePuzzle.tsx` to pass role/theme through
  and to route the hint's symbol (step 4)
- `src/mods/puzzle/game/balanceScale/meta.ts`

**Do**

1. **Read three existing systems before writing one.** `src/mods/puzzle/app/hidato/skins.ts` (a face whose
   fields are functions of cell state), `starBattle/skins.ts` (the simplest, two faces), and
   `sudoku/skins.ts` (the one that changes what a token _is_). Copy the shape they share: a `Skin` type
   with a `name`, a `SKINS` table including `default`, a `ROLE_SKINS` map, `UNSPOKEN = ["default", "night"]`,
   and a `skinFor(role, theme)` that lets a theme name a face outright for the lab's sake.
2. **Lift the current look into the `default` face unchanged.** This half must be a pure refactor: the
   board renders identically before and after, and the existing `BalanceBoard` and celebration specs prove
   it. Do that as its own commit if it helps.
3. **Then the weighing face, and its best half is the symbols.** The unknowns on this board are glyphs
   whose weight the player solves for, and `generateBalance.ts` says the thing worth knowing about them:
   _"Weights whose value is not written on them. Any distinguishable set works — the solver never reads a
   glyph, it only cares that the same one weighs the same everywhere."_ The symbol is already pure
   presentation, so a face may choose it — and **that is the face**: the unknown the player solves for
   becomes the heart, weighed against the feather. Nothing else in the catalogue makes the myth the
   mechanic that literally.

   - Give the `Skin` a `symbol: (glyph: Glyph) => string`, defaulting to a pass-through (`glyph => glyph`)
     so the current board is unchanged. This is sudoku's `token` field in another family — read it first.
   - The generator's pool is `["🪲", "🏺", "🐍", "🦅", "🐈", "🪶"]`, already Egyptian and already holding the
     feather. The funerary face maps those to a judgement set with the heart among them, and the mapping
     **must be total**: a glyph it has not heard of returns the glyph itself.
   - **Do NOT edit `GLYPH_POOL` in `src/mods/puzzle/game/balanceScale/generateBalance.ts`.** This family is
     seedable, so changing what the generator emits changes generated boards for a purely visual reason.
     The remap belongs in the skin.

4. **The symbol must reach all three places it is shown, or a hint points at something not on the board.**
   The raw glyph appears on the pan chip, on the palette key that sets its value, and interpolated into the
   hint sentence — `BalancePuzzle.tsx` renders `t(\`balance.hint.\${hint.key}\`, hint.params)`and`hint.params.glyph` is that symbol. Route all three through the face. Sudoku hit this exact trap, and
   its spec records the rule: a board drawing its own signs while its sentences typed them is a hint
   pointing at something not quite there.
5. Dress the pans and the ground too, keeping the constraint the board's own comment states: _"the pans
   hold numbers the player is reading, and a dramatic tilt costs more legibility than it buys drama."_
   Stones stay legible numbers. It is the unknowns that become funerary, not the arithmetic.
6. `ROLE_SKINS` maps **both** `judgement` and `funerary` to this face: the narrow place and the wide one are
   the same room for this family. `tags` gains `"funerary"` and `"judgement"`. `themes` gains the face name.
7. Spec the system in `skins.spec.ts`: the default is drawn when nothing was said, both roles draw the
   weighing face, `night` and `default` read as nothing-said, and an unknown name falls back silently. Two
   more matter here — the default face's `symbol` is the identity, and the weighing face maps every member
   of the generator's pool to a **distinct** symbol, since a face collapsing two unknowns onto one symbol
   would make the board unsolvable. The existing board and hint specs must pass untouched.

**Watch for:** `judgement` will be a one-family pool. That is intended and safe, because task 5 never
authors it alone — see there.

**Commit:** two if you split the refactor. Second one: `Balance scale weighs a heart against a feather`

**Next prompt — paste after clearing context:**

> Read `TASKS.md` in the repo root and do **Task 5 — author the six funerary journeys**. Tasks 1 to 4 are
> done and committed, so all four families now carry the `funerary` tag. Follow the task's own steps and
> its acceptance checks, then stop and show me the diff.

---

## Task 5 — author the six journeys, and regenerate the world

**Now the pool is four** — sudoku, hidato, constellation, balance scale — which is exactly the floor
`src/worldGen/rolePools.spec.ts` enforces. This is the task that makes any of it visible.

**Files**

- `src/worldGen/spec/expert.ts`, `master.ts`, `wizard.ts`
- `src/data/generatedWorld.ts` (generated — do not hand-edit)
- `docs/game-design/journeys.md`
- `CHANGELOG.md`

**Do**

1. Author the wide role on the four journeys whose story is funerary without being a judgement:

   ```ts
   journey("expert_1").pyramid("1-4", { encounter: "funerary" }) // Valley of the Kings
   journey("master_3").pyramid("1-5", { encounter: "funerary" }) // Curse of the Pharaohs
   journey("master_4").pyramid("1-5", { encounter: "funerary" }) // Tomb of Nefertari
   journey("wizard_1").pyramid("1-4", { encounter: "funerary" }) // Ra's Solar Journey, the duat
   ```

   Check each journey's real pyramid count in `journeys.md` §6–§8 before writing the range.

2. Author the pair whose story names the scales — the Book of the Dead's "judgement" and the Chamber of
   Ma'at's "feather of truth":

   ```ts
   journey("master_2").pyramid("1-5", { encounter: ["judgement", "funerary"] })
   journey("wizard_3").pyramid("1-6", { encounter: ["judgement", "funerary"] })
   ```

   **The narrow word goes first, and it is load-bearing.** A role list is a union for eligibility, so these
   still draw from all four families and clear the pool floor. But the skin resolver takes the first role a
   family has a face for, so `judgement` first is what makes the scale turn up wearing the scales while
   every other family wears its funerary face. `junior_4` in `src/worldGen/spec/junior.ts` is the same
   pattern one pool size down (`["light", "sky"]`) — read its comment.

3. `yarn generate-world`. **This time the world is meant to change.** Confirm the diff is `role` fields and
   the content hash, plus whatever families the allocator re-drew — and that no floor's structure moved.
4. Update `journeys.md`: the `Wears` column for all six journeys, their `What its story asks for` cells,
   §9's funerary row (the gap is now closed, so say so rather than deleting the row's history), and §2's
   role table gains `funerary` and `judgement` with their pools.
5. **Add the CHANGELOG `## Unreleased` entry** — this is the first task a player can see. Six journeys now
   dress their puzzles as the tomb they are set in.

**Watch for:**

- `yarn vitest run src/worldGen src/game` in full, not just the family specs. `rolePools.spec.ts` is the
  one that judges this task, and the floor-assembly sweep proves no wall moved.
- If `rolePools` complains about a thin pool, a tag from tasks 1–4 is missing rather than the authoring
  being wrong.

**Commit:** `Six journeys are set in a tomb, so their puzzles dress as one`

**Next prompt — paste after clearing context:**

> Read `TASKS.md` in the repo root. All five tasks are done and committed. Show me what
> `docs/game-design/journeys.md` §9 now ranks as the biggest remaining gap, and what it would take.
