# Camp phase 3 — camp loot: found items and structure parts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This plan says what to build, which files, and what the tests prove; it carries no code (docs/instructions/agent-work.md).

**Goal:** The camp is found in the world. A new `camp` mod places **found items** (each one camp step) and **structure parts** (a structure stands once all its parts are in) on puzzle slots of the tier its step belongs to, records every pick-up in its own save, grows the palm and brings the ibises on the next homecoming, and shows started structures in the Verzameling as a **Constructies** section ("n van m", parts named or "???" when a row is opened). A find's popup shows its own camp art and how far its spot is; a part's popup shows how far its structure is. Every sellable and every part has a prompt in the repaint queue; until painted, today's icon stays. The scene is not mounted (phase 6): the mod exposes the derived `CampFound` for it.

**Architecture:** Everything lives in `src/mods/camp/` (decision 1 of the handover); core learns nothing. The domain layer (`game/`) holds the **step table** — every catalogue step with its spot, its tier and its source (found, structure with named parts, grows, bought, fixed, given) — plus the pure checks over it, the **placement** (`campLoot`, a `Distribution` with an exact footprint and per-tier quotas, registered between trap and shop so waterskins keep their slots and the shop's money takes what is left), the **save model** (`campState`, versioned, keyed by authoring names) and the **loot report rows**. The app layer registers the two reward schemas, the claim effect, the popup displays, the homecoming (growth) and the Collection section through the existing seams (`rewardSchemas`, `rewardContributions`, `rewardHandlerRegistry`, `rewardDisplayRegistry`, `homecomingRegistry`, `collectionSectionRegistry`). The design system gains a stateless `StructureRow` and `StructuresPanel`. The ui catalogue (`src/ui/atoms/campScene/campCatalogue.ts`) keeps its art placement and `chapter` (camera framing); a verify keeps it and the mod's step table in agreement (decision 6).

**Tech Stack:** TypeScript, React 19, Vitest + Testing Library, Storybook, zod reward schemas, immer state models (`docs/instructions/state-models.md`), the world-gen allocator (`src/worldGen/slotAllocator.ts`), the bake (`yarn generate-world`), `yarn loot-report`.

**Spec:** `docs/handover-camp-release.md` (Phase 3 brief, "How the driver session works", Decisions 1 and 3), `docs/superpowers/specs/2026-10-23-camp-loot-design.md` (the loot model, sources 1 and 2, "Growing by itself", "Fixed from the start", "Slots"), `docs/superpowers/specs/2026-10-23-camp-scene-design.md` (scene; its step-count model is superseded by `CampFound` in `src/ui/atoms/campScene/campTypes.ts`), `docs/design/camp-sketches/README.md`, `docs/mods/TARGET.md` (core names no mod; toggle-off is the gate; rule 2: a mod's demand that capacity cannot meet fails the build). Where the handover brief and the loot spec disagree, the brief wins (decisions 2, 11, 20).

## The step table (authored data the plan settles)

Every step of `CAMP_CATALOGUE` gets exactly one source. Tiers are the catalogue's `chapter`s, unchanged.

| Spot       | found (one find = one step)                                              | structure (built from parts)                                                | grows (next homecoming)                                 | bought (phase 4)                                                            | fixed / given       |
| ---------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------- |
| fire       | pot (J), seatCushions (W)                                                | stoneRing (S), fire (S), cookingStones (S), seatingStones (E), clayOven (M) | —                                                       | —                                                                           | —                   |
| sleeping   | reedMat (S), blanket (S), tentRug (J), tentFlag (E)                      | windbreak (S), tent (J), secondTent (M), pavilion (W)                       | —                                                       | —                                                                           | —                   |
| water      | gourd (S), jar (S), secondJar (J)                                        | well (M), wellPulley (W)                                                    | —                                                       | waterTrough (E)                                                             | —                   |
| cooking    | spiceRack (J), breadBoard (J)                                            | tripod (J), breadOven (E), dryingRack (M), feast (W)                        | —                                                       | —                                                                           | —                   |
| donkey     | —                                                                        | —                                                                           | —                                                       | halter, donkey, saddlebags (J), cart (E), secondDonkey (M), paintedCart (W) | —                   |
| camel      | —                                                                        | —                                                                           | —                                                       | camel (E), secondCamel (M), caravanBanner (W)                               | —                   |
| mapTable   | compass (E), starMap (M), scrollCase (M), astrolabe (W), reedGlobe (W)   | table (E)                                                                   | —                                                       | —                                                                           | map (fixed)         |
| palmGarden | seed "palm seed" (E), secondPalm "palm seed" (M), figTree "fig seed" (W) | lotusPlanter (W)                                                            | sprout ← seed; palm ← sprout; dates ← palm + secondPalm | —                                                                           | bed (given)         |
| ibisPond   | papyrus "papyrus root" (M), reeds "reed cutting" (M), lotus (W)          | edgeStones (M)                                                              | ibis ← reeds; secondIbis ← ibis + lotus                 | —                                                                           | —                   |
| lookout    | flag "lookout flag" (W)                                                  | post (M), platform (M), ladder (M), roof (M), signalFire (W)                | —                                                       | —                                                                           | —                   |
| godStatues | thoth, bastet, anubis, ra (W)                                            | —                                                                           | —                                                       | —                                                                           | statueBench (given) |
| starCanopy | cloth "star cloth" (W)                                                   | poles (W), stars (W), planets (W)                                           | —                                                       | —                                                                           | —                   |

S starter, J junior, E expert, M master, W wizard. Totals: **28 found items** (S 4, J 5, E 3, M 5, W 11), **26 structures** (S 4, J 2, E 3, M 9, W 8), 5 growing steps, 10 bought steps, 1 fixed, 2 given = the catalogue's 72 steps.

**Parts per structure scale with the tier:** starter 2, junior 3, expert 3, master 4, wizard 5 = **99 parts** (S 8, J 6, E 9, M 36, W 40). The allowed band per tier (checked): starter and junior 2–3, expert 3–4, master and wizard 4–6. Each part has its own id (camelCase, unique within its structure, e.g. `well` → `wellStones`, `rope`, `bucket`, `windlass`) and its own name in en and nl. Camp loot per tier: S 12, J 11, E 12, M 41, W 51 = **127 drops**.

## Global Constraints

- **Branch** `camp/home-and-loot` only. Never `git pull`, never a bare `git stash`, never switch branches. Commit after every task.
- **Core is mod-agnostic.** `src/app`, `src/ui`, `src/game`, `src/data`, `src/worldGen` never name the camp mod, a camp step, a part or the reward types `campFind` / `campPart`; the `no-restricted-imports` rules stay at zero. The camp mod imports no sibling mod. The one core edit that names the camp's content is the i18n namespace list (`src/i18n/index.ts`), as `sellables`, `treasures` and `fez` are listed there today.
- **No unit test pins the real step table, a real part count, a real part name or a count of the real world.** Specs build made-up step tables (two or three spots, a few steps, two tiers), made-up slots and made-up saves. A total may be asserted against the table it was computed from, never as a literal. The agreement between the real step table and the real ui catalogue is a `.verify.ts` (run by `yarn verify-content`), the same kind of check as `yarn lock`.
- **Saves:** a new store, `useModState("camp")`, shaped cleanly and versioned (`version: 1`). Every id in it is an authoring name (step id, structure id, part id) — never an index or ordinal (`docs/game-design/world-stability.md`, "Storage version"). An id the table no longer knows is ignored on read and never deleted.
- **Comments state the current state and why, never history.**
- **Commits:** one subject line, `type: what changed`, ≤ 72 chars, ending with the session's attribution trailer.
- **Strings:** every new user-facing string in both `public/locales/en/` and `public/locales/nl/` (`src/i18n/keys.spec.ts` checks both). Names are drafted in spoken, everyday language; nl first, then en.
- **Stories:** every new `src/ui/` component gets a story beside it, with made-up props (no shadow game logic, `docs/instructions/storybook.md`).
- **Domain code** (`src/mods/camp/game/`) stays pure TypeScript: no React, no i18n, no DOM, no `fs`.
- **Checks per task:** the task's own specs, `yarn check-types`, `yarn lint`. Only Task 8 runs the bake, `yarn loot-report`, `yarn verify`, `yarn verify-content` and `yarn build`, each under `timeout 900`.
- **The bake changes in Task 8 and only there.** Camp loot takes puzzle slots on every tier, so the coins the shop placed there move to other slots and every tier fingerprint moves; each is updated deliberately with its reason in the review list. **Every chest and path end must still carry loot; a puzzle room may be empty.** Waterskins keep their slots (trap runs before camp). Never edit a baked number by hand; a failing allocator, economy guard or empty-end check is a stop (Failures in the review list), never `SKIP_ECONOMY_GUARD`.
- **CampScene is not mounted** and its props do not change. The phase's last step updates the handover's "State" and ticks Phase 3 there (driver's job, not a task).

## Review Focus

1. **Every find and every part is placed, on a puzzle slot of exactly its step's tier,** never on a chest, path end or shop stock slot; a tier short of slots fails the bake with a message naming the tier, the number needed and the number available (Task 3, soundness).
2. **A structure can always be finished:** all its parts are placed or the bake fails; no part sits on a slot the player can never reach before the shop has had its pick (main and ungated slots first, hidden last) (Task 3).
3. **Waterskins do not move** and the economy guard still passes: camp runs after trap and before shop (Task 3, measured in Task 8).
4. **The save is the facts, not the picture:** finds, parts and grown steps by authoring name; `CampFound` is derived; a structure is in it only when every part is; an unknown id is ignored, not lost (Task 4, soundness).
5. **Growth waits for a homecoming,** one stage per homecoming, judged on the save as it stood when the player came home (Task 4, Task 5).
6. **Nothing shows before it is started:** a structure with no parts is absent from Constructies; parts show only in an opened row; missing parts read "???"; a finished structure reads "gebouwd" (Task 6).
7. **Toggle-off:** with `campMod` out of `REGISTERED_MODS`, the bake, `yarn check-types`, `yarn build` and `yarn loot-report` pass; the world holds no camp reward, the report no camp row, the Collection no Constructies (Task 8).

## Decisions for the review list

Each is the option that changes the least shipped behaviour or the one the brief names; Task 8 writes them into `docs/review-camp-release.md` under Decisions, each prefixed `Phase 3 —`.

1. **28 found items, not 26.** The catalogue's own steps split as in the step table above: the palm, fig, papyrus and reeds are found as seeds and cuttings, the star cloth and the lookout flag are finds. Brief and loot spec say 26 (the spec's own list counts 28). Alternative: make two of them (star map, scroll case) structure parts.
2. **Parts per structure 2 / 3 / 3 / 4 / 5 by tier (99 parts),** authored per structure inside a checked band (starter and junior 2–3, expert 3–4, master and wizard 4–6). The brief's "scale with the tier" wins over the spec's "scale with the slots a tier has"; counts are authored, never computed from slots. Alternative: 2 / 3 / 4 / 5 / 6 (119 parts).
3. **Camp loot lies only on loot-bearing puzzle slots of exactly its step's tier** (a slot's tier is its section's). Chests, path ends and shop stock stay the shop's and the capped currencies'. A tier that is short fails the bake (TARGET rule 2). Alternative: allow chests, or relax to the next tier.
4. **Within a tier: ungated main slots first, then ward-gated, then hidden;** round-robin over sites in id order, slots in path order; a structure's parts are dealt so they fall on different sites. Deterministic, seed-free. Alternative: a seeded random spread.
5. **Registry order trap → camp → shop:** waterskins keep their 60 slots, camp takes its 127 next, the shop's money fills what is left (its budget is global, so its coins move to other slots, not out of the world). Alternative: camp before trap.
6. **The mod's step table is the source of each step's tier and source; the ui catalogue keeps `chapter` for its camera framing,** and `yarn verify-content` fails when the two disagree (a step missing on either side, or a different tier or spot). Alternative: strip `chapter` from the ui catalogue and pass a merged catalogue in as a prop (left to phase 6, which mounts the scene).
7. **The camp save** is `useModState("camp")` holding `{ version: 1, finds: step ids, parts: structure id → part ids, grown: step ids }`; `CampFound` for the scene is derived (fixed steps + finds + finished structures + grown steps). Alternative: store `CampFound` itself.
8. **Growth:** sprout after the palm seed, palm after the sprout, dates once both palms stand, the first ibis after the reeds, the second ibis once the first ibis and the lotus are there; one stage per rule per homecoming, judged on the save as it was on arriving home. Alternative: grow every ready stage at once.
9. **The second palm seed and the fig seed land as their tree at once** (no sprout art exists for them). Alternative: make them grow too.
10. **Constructies is a Collection section now** (registered at order 40, after the shop's), titled "Constructies"; phase 7 turns the sections into tabs. Alternative: build the tab bar in this phase.
11. **The brief overrides the Verzameling sketch's note** "Kampspullen staan hier niet in": started structures are listed in Constructies; found items stay out of the Verzameling (they are seen in the camp and in their popup).
12. **Progress lines:** a part reads "<structure> · n van m" over that structure's parts; a find reads "<spot> · n van m" over the spot's finds and structures in place. Alternative: a find shows no progress line.
13. **Missing parts always read "???"** in an opened row; there is no "seen" state. The spec's "not seen yet" variant needs a store nothing else uses. Alternative: remember seen parts.
14. **Until painted, a part shows its structure's camp art** and a sellable its glyph; a painted icon takes over by dropping its file in (`src/assets/camp/parts/<structure>-<part>.webp`, `src/assets/sellables/<id>.webp`). Alternative: an emoji per part.
15. **The icon prompts live in `docs/instructions/repaint-queue.md`** (as the brief asks), in the camp house style (`docs/game-design/camp-art-prompts.md` §0: matte, flat `#ff00ff` ground, neutral light), keys `part/<structure>-<part>` and `sellable/<id>`, imported with `yarn import-camp --out-dir`. Alternative: put them in `camp-art-prompts.md`.
16. **A new locale namespace `camp`** (`public/locales/*/camp.json`) holds spot, find, structure and part names and the Constructies strings. Alternative: under `common.json`'s `camp` key.
17. **A camp reward is skipped silently only when the save already has it** (a revisit, a dev grant); otherwise it is always taken. Alternative: no skip.
18. **No description line for finds and parts in this phase;** the popup shows name, art and progress. Story phase 8 may add flavour. Alternative: draft a description per find now.
19. **Loot report rows:** "Camp finds" against the table's found items, "Structure parts" against the table's parts, each counted wherever it lies.
20. **The brief wins over the spec on three points:** parts scale with the tier (decision 2), the found-item count follows the catalogue (decision 1), and the Constructies list shows structure art plus "n van m" with parts only in an opened row (the spec showed parts inline).

---

### Task 1: The camp mod and its step table

**Files:**

- Create: `src/mods/camp/index.ts` (descriptor `campMod`, `id: "camp"`; no fields yet beyond what this task needs)
- Create: `src/mods/camp/game/campSteps.ts`, `src/mods/camp/game/campSteps.spec.ts`
- Create: `src/mods/camp/app/campCatalogueAgreement.ts`, `src/mods/camp/app/campCatalogueAgreement.spec.ts`, `src/mods/camp/campCatalogue.verify.ts`
- Create: `src/mods/camp/app/index.ts` (the app entrypoint, gated on `isModEnabled("camp")`; empty registrations until Task 5)
- Modify: `src/mods/registeredMods.ts` (`campMod` after `trapMod`, before `shopMod`; the `DYNAMIC_DISTRIBUTIONS` comment names the order trap → camp → shop and why)
- Modify: `src/mods/registerModApps.ts` (imports `./camp/app`)

**Interfaces:**

- Produces (game): `CampSource = "found" | "structure" | "grows" | "bought" | "fixed" | "given"`; `CampStepEntry = { id; spot: string; tier: Difficulty; source; parts?: readonly string[]; growsFrom?: readonly string[] }` (spot ids are plain strings here: the domain layer does not import the ui's `CampSpotId`); `CampStepTable = readonly CampStepEntry[]`; `CAMP_STEPS: CampStepTable` — the table above, part ids drafted in this task (names come in Task 2).
- Produces (game): `PART_BANDS: Record<Difficulty, { min: number; max: number }>`; `campStepProblems(table): string[]` — duplicate step ids; a structure without parts, with duplicate part ids, or with a part count outside its tier's band; `parts` on a non-structure; a growing step without `growsFrom` or naming an unknown step; an empty list for a sound table.
- Produces (game): `campDemand(table): Record<Difficulty, { finds: number; parts: number }>` and `campUnits(table): CampUnit[]`, where `CampUnit = { kind: "find"; step } | { kind: "part"; structure; part }` with its tier — every unit the world must carry, in table order.
- Produces (app): `campCatalogueMismatches(table, catalogue: CampCatalogue): string[]` — a catalogue step with no table entry, a table entry with no catalogue step, a different spot or tier (table tier vs the step's `chapter`), a `given` step in the catalogue not `given` in the table or the reverse.

- [x] **Step 1: Failing tests** (made-up tables only).
  - `campSteps.spec.ts`: a sound made-up table gives no problems; each problem above is reported once, naming the step; `campDemand` sums finds and parts per tier and leaves a tier with none at zero; `campUnits` lists every find and every part, each with its step's tier, in table order; bought, grows, fixed and given steps make no units.
  - `campCatalogueAgreement.spec.ts`: a made-up catalogue and table that agree give no mismatches; a step missing on either side, a moved spot, a different tier and a `given` disagreement are each named.
- [ ] **Step 2: Run** `yarn test src/mods/camp` — FAIL.
- [x] **Step 3: Implement.** `CAMP_STEPS` follows the step table above exactly, part counts 2 / 3 / 3 / 4 / 5 by tier, part ids camelCase and meaningful (`stoneRing`: `fieldStones`, `sandBed`…). The table file's top comment says what each source means and that the step order of the art is never a game rule. `campCatalogue.verify.ts` asserts `campStepProblems(CAMP_STEPS)` and `campCatalogueMismatches(CAMP_STEPS, CAMP_CATALOGUE)` are empty. The descriptor comment says what the camp mod owns (camp finds, structure parts, the camp save, the camp's Collection section) and what toggle-off leaves (puzzle slots back to the shop, no camp save read, no Constructies).
- [x] **Step 4: Run** `yarn test src/mods/camp`, `yarn vitest run --config vitest.verify.config.ts src/mods/camp` — PASS. `yarn check-types`, `yarn lint` (import rules at zero).
- [x] **Step 5: Commit** — `feat: a camp mod with every camp step's source and tier`

---

### Task 2: Words — every camp name in nl and en

Mechanical; one agent (Sonnet).

**Files:**

- Create: `public/locales/en/camp.json`, `public/locales/nl/camp.json`
- Modify: `src/i18n/index.ts` (namespace `camp`)
- Modify: `docs/review-camp-release.md` (Drafts: one block listing every structure with its parts, nl / en; one line for the find names)

**Interfaces:**

- Produces keys (namespace `camp`): `spots.<spotId>` (12); `finds.<stepId>` (28 — the thing picked up: "Palmzaad" for `seed` and `secondPalm`, "Vijgenzaad" for `figTree`, "Papyruswortel", "Rietstek", "Sterrendoek" for `cloth`, "Uitkijkvlag" for `flag`); `structures.<structureId>` (26, the structure's name: "Put" for `well`); `parts.<structureId>.<partId>` (99); `collection.title` ("Constructies" / "Structures"); `collection.progress` ("{{found}} van {{total}}" / "{{found}} of {{total}}"); `collection.built` ("gebouwd" / "built"); `collection.unknownPart` ("???"); `collection.open` / `collection.close` (the row toggle's accessible label); `reward.find` ("Kampvondst" / "Camp find"); `reward.part` ("Onderdeel" / "Part"); `reward.progress` ("{{name}} · {{found}} van {{total}}" / "{{name}} · {{found}} of {{total}}").

- [x] **Step 1: Draft** every name in nl first (spoken, everyday Dutch; a thing a traveller would call it), then en. Part names are things that could lie in a tomb or a ruin: stones, poles, rope, a pulley wheel, mud bricks, thatch, planks.
- [x] **Step 2: Check** with a throwaway script in the session scratchpad (not committed) that every step id, structure id and part id in `CAMP_STEPS` has its key in both files, and nothing else is there. `yarn test src/i18n`.
- [x] **Step 3: Review list:** under Drafts, `Phase 3 — structure parts` with one line per structure: `<structure nl / en>: <part nl / en>, …`; and `Phase 3 — find names` with one line listing the 28 (nl / en).
- [x] **Step 4:** `yarn check-types`, `yarn lint`. **Commit** — `feat: names for every camp find, structure and part`

---

### Task 3: Placement — camp finds and parts on puzzle slots of their tier (**soundness**: world-gen placement)

**Files:**

- Create: `src/mods/camp/game/campLoot.ts`, `src/mods/camp/game/campLoot.spec.ts`
- Create: `src/mods/camp/game/lootTotals.ts`, `src/mods/camp/game/lootTotals.spec.ts`
- Modify: `src/mods/camp/index.ts` (`dynamicDistributions: [campLoot]`, `lootTotals: campLootTotals`)

**Interfaces:**

- Consumes: `Distribution`, `allocateDistributions` (`src/worldGen/slotAllocator.ts`), `Slot` (`src/worldGen/slots.ts`), `campUnits`, `campDemand`, `campStepProblems`, `CAMP_STEPS` (Task 1).
- Produces: `makeCampLoot(table): Distribution` and `campLoot = makeCampLoot(CAMP_STEPS)`:
  - `id: "camp-loot"`;
  - `footprint`: exact, `{ min: N, max: N }` with N = `campUnits(table).length`; throws first if `campStepProblems(table)` is not empty (the bake refuses an unsound table);
  - `eligible`: `kind === "puzzle" && rewardPriority > 0` and the slot's tier has camp demand;
  - `rank`: per tier in difficulty order, that tier's candidates ordered ungated and not hidden first, then ward-gated (`wardKeys` not empty), then hidden; within each class round-robin over sites in id order, slots in `puzzleSeq` order; it returns exactly the first `demand[tier]` of each tier, concatenated, and throws when a tier has fewer candidates than its demand, naming the tier, needed and available ("Author more loot-bearing capacity in the DSL") — a returned list shorter than the candidates is how the quota is kept, and the comment says so;
  - `fill`: per tier, deals that tier's units to its slots in rank order, the units ordered first-part-of-every-structure, then the finds, then second parts, and so on, so one structure's parts fall on different sites; assigns `{ type: "campFind", step }` or `{ type: "campPart", structure, part }`.
- Produces: `campLootTotals(configs): LootTotal[]` — `{ label: "Camp finds", found, needed }` and `{ label: "Structure parts", found, needed }`, found counted wherever the reward lies (via `forEachConfigReward`), needed from `campDemand(CAMP_STEPS)`.

- [ ] **Step 1: Failing tests** (made-up table and slots; slots built the way `waterskins.spec.ts` builds them).
  - Over made-up slots on three tiers and several sites (puzzle slots with and without loot priority, chests, path ends, a fez-shop stock slot, ward-gated and hidden puzzle slots) and a made-up table, `allocateDistributions` with `[makeCampLoot(table)]`: exactly N camp rewards; every find and every part exactly once; each on a puzzle slot of its own step's tier; none on a chest, path end, shop stock or a priority-0 slot.
  - Ungated main slots are taken before ward-gated ones, and those before hidden ones; a hidden slot is used only when a tier's other slots run out.
  - With two or more sites in a tier, no two parts of one structure share a site while the tier has sites left unused by that structure.
  - A tier with fewer eligible slots than its demand throws a message naming that tier, needed and available; a table with a problem throws before any slot is taken.
  - With a made-up waterskin-like distribution registered first and a made-up "take everything" distribution after (the shop's shape), the first keeps its slots, camp takes its N, the last gets the rest.
  - The same input gives the same placement twice.
  - `lootTotals.spec.ts`: counts `campFind` and `campPart` rewards on puzzles, chests, path ends, sub-sections and shop stock alike; ignores other types; `needed` equals the made-up table's demand, by reference.
- [ ] **Step 2: Run** `yarn test src/mods/camp src/worldGen/slotAllocator` — FAIL.
- [ ] **Step 3: Implement.** The distribution's comment says why puzzle slots only (chests carry the economy and the capped currencies; puzzle rooms carried the consumables camp loot replaces), why exact tiers, why main slots first (every player's camp must fill), and that a short tier is an authoring problem. No rank logic in core changes.
- [ ] **Step 4: Run** `yarn test src/mods src/worldGen` — PASS. `yarn check-types`, `yarn lint`.
- [ ] **Step 5: Per-task review** (soundness): every unit is placed or the bake fails; tiers exact; no chest, path end or shop slot claimed; deterministic; registry order keeps waterskins first and the shop last; core unchanged.
- [ ] **Step 6: Commit** — `feat: camp finds and parts lie on puzzle slots of their tier`

---

### Task 4: The camp save and what the camp shows (**soundness**: saves)

**Files:**

- Create: `src/mods/camp/game/campState.ts`, `src/mods/camp/game/campState.spec.ts`
- Create: `src/mods/camp/app/useCampProgress.ts`, `src/mods/camp/app/useCampProgress.spec.ts`

**Interfaces:**

- Produces (game, a state model per `docs/instructions/state-models.md`): `CampSave = { version: 1; finds: string[]; parts: Record<string, string[]>; grown: string[] }`, `emptyCampSave()`.
  - Actions (immer, pure): `recordFind(save, step)`, `recordPart(save, structure, part)` — idempotent (a second record changes nothing); `growCamp(save, table)` — adds, per growing step whose `growsFrom` steps are all in place in `save` as given and which is not yet grown, that step; stages ready only after this growth wait for the next call.
  - Queries (pure): `inPlace(save, table): Set<string>` — fixed steps, recorded finds, structures whose every part is recorded, grown steps; only ids the table knows. `campFound(save, table): Record<string, string[]>` — `inPlace` grouped by spot (the shape of `CampFound`). `structureProgress(save, table, structure): { found: string[]; total: string[] }`; `startedStructures(save, table): string[]` (table order, at least one part); `spotProgress(save, table, spot): { found: number; total: number }` over the spot's finds and structures.
  - `readCampSave(stored: unknown): CampSave` — a stored value of another shape or version becomes `emptyCampSave()` (saves reset at the starter release; this is the first version); a known shape keeps every id, known or not.
- Produces (app): `useCampProgress(): { save; found: CampFound; recordFind; recordPart; grow; structureProgress; startedStructures; spotProgress }` over `useModState("camp", emptyCampSave)`, every read through `readCampSave`. `found` is the prop phase 6 passes to `CampScene` (cast to the ui's `CampFound` in the app layer).

- [ ] **Step 1: Failing tests** (made-up table and saves).
  - `campState.spec.ts`: a find is in place once recorded, in any order; a structure is not in place with one part missing and is once the last part lands, whatever the order; recording twice changes nothing; a fixed step is always in place, a bought step never (phase 4); `growCamp` adds the sprout after the seed, the palm only on the following call, dates only once both palms stand; an ibis-like step waiting on two steps grows only when both are there; nothing grows from an empty save; an id the table does not know survives in the save and never reaches `inPlace`; `startedStructures` lists only structures with a part; `structureProgress` and `spotProgress` count as described; `readCampSave` of `undefined`, a number, a v0-shaped object or a `version: 2` object gives the empty save; of a v1 save gives it back unchanged.
  - `useCampProgress.spec.ts` (renderHook over the real `useModState` with a fresh storage): `recordPart` for every part of a made-up structure puts it in `found`; `grow` after recording a seed adds the sprout; the stored value carries `version: 1` and ids only.
- [ ] **Step 2: Run** `yarn test src/mods/camp` — FAIL.
- [ ] **Step 3: Implement.** The state file's comment says the save holds facts by authoring name and the picture is derived, so a table change never strands a save.
- [ ] **Step 4: Run** the specs — PASS. `yarn check-types`, `yarn lint`.
- [ ] **Step 5: Per-task review** (soundness): no index or ordinal stored; unknown ids kept but inert; idempotent records; growth judged on the save as given; the store key is the mod's own.
- [ ] **Step 6: Commit** — `feat: the camp remembers what was found and grows on coming home`

---

### Task 5: Picking it up — schemas, claim, popup, homecoming

**Files:**

- Create: `src/mods/camp/app/rewardSchema.ts` (`campFindRewardSchema`, `campPartRewardSchema`)
- Create: `src/mods/camp/app/rewardContribution.ts`, `src/mods/camp/app/rewardContribution.spec.ts`
- Create: `src/mods/camp/app/rewardDisplay.tsx`, `src/mods/camp/app/rewardDisplay.spec.tsx`
- Create: `src/mods/camp/app/campIcons.ts`, `src/mods/camp/app/campIcons.spec.ts` (part icon lookup with fallback)
- Modify: `src/mods/camp/app/index.ts` (registers schemas, display, contribution, homecoming)

**Interfaces:**

- Produces: `campFindRewardSchema = { type: "campFind"; step: string }`, `campPartRewardSchema = { type: "campPart"; structure: string; part: string }` (zod).
- Produces: `useCampRewardContribution(): RewardContribution` — `effects.campFind` → `recordFind`, `effects.campPart` → `recordPart`; `skip` true only for a find or part the save already has.
- Produces: the sync handlers (`registerRewardHandler`) for both types: emoji ⛺ / 🧱, `itemName` = the find's or part's name with "Kampvondst" / "Onderdeel"; and the rich displays (`registerRewardDisplays`): `ItemVisual` = the find's layer art (`campArt(step, true)`, else `campArt(step)`, else the emoji) or the part's icon (`partIcon`), `itemEffectDescription` = `reward.progress` with the spot's or structure's name and counts **after** this pick-up.
- Produces: `partIcon(structure, part): string | undefined` — the painted file `src/assets/camp/parts/<structure>-<part>.webp` when it exists, else the structure's own camp art (`campArt(structure, true)` then `campArt(structure)`). The glob is built the way `campArt.ts` builds its own.
- Produces: `registerHomecoming(() => useCampProgress().grow)`.

- [ ] **Step 1: Failing tests.**
  - `rewardContribution.spec.ts`: applying a `campFind` and a `campPart` through `mergeContributions` records them; a reward already recorded is skipped; a reward of another type is not.
  - `rewardDisplay.spec.tsx`: for a made-up save one part short of a structure, the last part's display reads "<structure> · m van m" (the count includes the part being shown, recorded or not yet) and shows the structure art while no part icon exists; a find's display reads its spot's progress the same way. (Translations through the test `t`, made-up table injected where the display reads the table.)
  - `campIcons.spec.ts`: with a made-up art map holding a part icon, it is used; without, the structure's layer art; without that, its step art; with none, `undefined`.
  - Homecoming: with a recorded seed in storage, running `useHomecoming()`'s merged handler (the camp app entrypoint imported) adds the sprout; running it again adds the palm. Lives in `useCampProgress.spec.ts`.
- [ ] **Step 2: Run** `yarn test src/mods/camp` — FAIL.
- [ ] **Step 3: Implement.** Display and contribution read the mod's own state only; nothing in `src/app` changes. `validatePlacedRewards` (boot) accepts the two types once registered.
- [ ] **Step 4: Run** `yarn test src/mods src/app/SiteMap` — PASS. `yarn check-types`, `yarn lint`.
- [ ] **Step 5: Commit** — `feat: camp finds and parts pop up with their art and progress`

---

### Task 6: Constructies in the Verzameling

**Files:**

- Create: `src/ui/molecules/StructureRow.tsx`, `StructureRow.stories.tsx`, `StructureRow.spec.tsx`
- Create: `src/ui/organisms/StructuresPanel.tsx`, `StructuresPanel.stories.tsx`
- Create: `src/mods/camp/app/CampCollectionSection.tsx`, `src/mods/camp/app/CampCollectionSection.spec.tsx`
- Modify: `src/mods/camp/app/index.ts` (`registerCollectionSection({ id: "camp", order: 40, Component: CampCollectionSection })`)

**Interfaces:**

- Produces (ui, stateless): `StructureRow` props `{ name; artUrl?: string; found: number; total: number; parts: { name?: string; iconUrl?: string }[]; open: boolean; onToggle: () => void; labels: { progress: string; built: string; unknownPart: string; toggle: string } }` — one row: art, name, "n van m" (or "gebouwd" when complete); the parts list renders only when `open`; a part without `name` reads `unknownPart`. The row is a button with `aria-expanded`.
- Produces (ui): `StructuresPanel` props `{ title: string; children }` — a heading and the rows; nothing rendered with no rows.
- Produces (app): `CampCollectionSection` — reads `useCampProgress`, lists `startedStructures` (table order), one `StructureRow` each, art from the structure's camp art, parts named when recorded; open state local to the section (one row open at a time).

- [ ] **Step 1: Failing tests.**
  - `StructureRow.spec.tsx`: closed shows name and "2 van 4" and no part names; opened shows the found parts' names and "???" for the rest; a complete row shows "gebouwd"; the toggle calls `onToggle` and carries `aria-expanded`.
  - `CampCollectionSection.spec.tsx` (made-up save through the mod's storage, real table not asserted by name): no rows and no heading for an empty save; one row per started structure; a structure with no parts is absent.
- [ ] **Step 2: Run** `yarn test src/ui/molecules/StructureRow src/mods/camp` — FAIL.
- [ ] **Step 3: Implement.** Stories: `StructureRow` closed, open with a mix of named and "???" parts, complete, without art; `StructuresPanel` with three rows, one open. Tailwind class order per lint.
- [ ] **Step 4: Run** the specs — PASS. `yarn check-types`, `yarn lint`.
- [ ] **Step 5: Commit** — `feat: started structures in the collection, n of m`

---

### Task 7: Art — prompts for every sellable and every part

Mechanical; one agent (Sonnet).

**Files:**

- Modify: `docs/instructions/repaint-queue.md` (a new section "Collection icons — sellables and camp parts": one entry per sellable (25) and per part (99))
- Modify: `scripts/repaintQueue.ts`, `scripts/repaintQueue.spec.ts` (keys may hold `_`; an `**Import:**` line naming `yarn import-camp … --out-dir=<dir> --name=<id>` sets the entry's `out` to `<dir>/<id>.webp`)
- Modify: `scripts/importCamp.ts` (`--out-dir`, default `src/assets/camp`; the master still lands in `art/masters/camp/`, under the same sub-folder)
- Create: `src/mods/shop/app/sellableArt.ts`, `src/mods/shop/app/sellableArt.spec.ts`; Modify: `src/mods/shop/app/ShopCollectionSection.tsx`, `src/mods/shop/app/rewardDisplay.tsx` (a painted `src/assets/sellables/<id>.webp` takes the glyph's place where it exists)

**Interfaces:**

- Produces: entries keyed `sellable/<id>` and `part/<structure>-<part>`; each a full block (the queue's rule: a block is the unit of use): the frame line (square, as camp art), the camp house style from `camp-art-prompts.md` §0 written out, the object in one or two sentences from its name (nl name in brackets), "flat `#ff00ff` background", attachments `art/masters/camp/chest.webp` (brushwork) and, for a part, its structure's master `art/masters/camp/<structure>.webp`; and the import line.
- Produces: `sellableArt(id): string | undefined` — the painted file or nothing.

- [ ] **Step 1: Tests.** `repaintQueue.spec.ts` on a made-up markdown: a `sellable/sell_stone_1` entry and a `part/well-rope` entry parse with their attachments, prompt and `out` under the `--out-dir`. `sellableArt.spec.ts`: a made-up art map with one file returns it, otherwise `undefined`.
- [ ] **Step 2: Write** the 124 entries (names from `public/locales/en/sellables.json` and `camp.json`), then the parser and import flag, then the sellable lookup.
- [ ] **Step 3: Run** `yarn repaint` — the new keys are listed as owed; `yarn repaint part/<any>` copies its prompt (check the clipboard text once, then restore nothing: it changes no file). `yarn test scripts src/mods/shop`, `yarn check-types`, `yarn lint`.
- [ ] **Step 4: Commit** — `docs: repaint prompts for every sellable and camp part`

---

### Task 8: Bake, report, toggle-off, gate (**soundness**: the bake)

**Files:**

- Modify (by the bake): `src/data/generatedWorld.ts`, `src/data/carveLedger.json`
- Modify: `src/data/tierFingerprints.json` (every tier that moved, deliberately)
- Modify (by the script): `docs/loot-report.md`
- Modify: `docs/review-camp-release.md` (decisions, numbers, fingerprints, look-at items)
- Modify: `CHANGELOG.md` (`## Unreleased`, one line: camp things and structure parts are found on puzzles; started structures show in the collection)
- Modify: `docs/superpowers/plans/2026-10-25-camp-phase-3-camp-loot.md` (tick boxes)

**Interfaces:** none.

- [ ] **Step 1: Before.** `timeout 900 yarn loot-report` on the committed bake; keep its per-tier table (scratchpad) for the before → after numbers.
- [ ] **Step 2: Bake** — `timeout 900 yarn generate-world`. A failing allocator (a short tier), economy guard or empty-end check stops the phase: write it under Failures and fix the cause in the task that owns it (a fresh subagent).
- [ ] **Step 3: Report** — `timeout 900 yarn loot-report`. Required: "Camp finds" and "Structure parts" exact against demand; chests and path ends filled 100% on every tier; waterskins 60, on the same slots as before (`git diff src/data/generatedWorld.ts` shows no waterskin moved); income still covers buyable stock. Commit `docs/loot-report.md` with the bake.
- [ ] **Step 4: Fingerprints** — `yarn vitest run --config vitest.verify.config.ts src/data/tierFingerprints.verify.ts`; for every tier that moved, copy its new hash into `tierFingerprints.json` and write one line per tier in the review list saying why (camp finds and parts on N puzzle slots of that tier; coins moved to other slots by the shop's budget).
- [ ] **Step 5: Commit the bake** — `chore: bake the world with camp finds and parts`
- [ ] **Step 6: Toggle-off proof** — remove `campMod` (and its import) from `src/mods/registeredMods.ts`; each under `timeout 900`: `yarn generate-world`, `yarn check-types`, `yarn build`, `yarn loot-report` (no camp row; no `campFind` / `campPart` in the baked world). Then `git checkout src/mods/registeredMods.ts src/data/ docs/loot-report.md` and confirm `git status --short` is clean.
- [ ] **Step 7: Gate** — each under `timeout 900`: `yarn verify`, `yarn verify-content` (includes the catalogue agreement), `yarn build`. All pass.
- [ ] **Step 8: Look** — `yarn storybook`: `StructureRow` and `StructuresPanel` stories (closed, open, "???", "gebouwd"); screenshot each. `yarn dev`: solve a starter puzzle that holds a camp part (find one with `yarn loot-report --journey <starter id>`), see the popup with the structure art and "n van m"; open the collection and the Constructies section, open the row. Screenshot; anything not reachable unattended goes under Look at in browser with steps.
- [ ] **Step 9: Record** in `docs/review-camp-release.md`: this plan's twenty decisions under Decisions; a "Phase 3 loot" block — per tier camp finds and parts placed, puzzle-loot share before → after, empty puzzle rooms, chests and path ends filled, coins and sellables before → after, income against buyable; the fingerprint lines; the toggle-off and gate results; under Look at in browser: the Constructies section, a part popup, a find popup with its layer art. Tick this plan's boxes.
- [ ] **Step 10: Commit** — `docs: phase 3 loot numbers in the review list`

The driver then runs the phase review (Sonnet), pushes the branch, ticks Phase 3 in `docs/handover-camp-release.md` and adds one line to its State.
