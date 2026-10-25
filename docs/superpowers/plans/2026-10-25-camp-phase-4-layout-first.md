# Camp phase 4 (resumed) and phase 5 — layout first, keys, money, animals — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This plan says what to build, which files, and what the tests prove; it carries no code (docs/instructions/agent-work.md).

**Replaces** Tasks 3–8 of `docs/superpowers/plans/2026-10-25-camp-phase-4-animal-gates.md` (its Tasks 1–2, AND gates and the gate walk, are done and stay) and the Phase 5 brief in `docs/handover-camp-release.md`. The designer's answers to the first draft's open questions are folded in (2026-10-25).

**Goal:** The world is built in the designer's order, and the bake proves that the player can never get stuck in the world that ships.

1. The DSL fixes floors, locks, chests and puzzles.
2. Every floor's layout (`seed` + `packing`) is picked **before** any loot is placed. The layout meets **hard** criteria: it carves, its lock walks sound, every lock holds a puzzle on the way, no dead region and no bare stub. A floor whose authoring cannot meet them fails the bake by name. `packing` is an intention, not a requirement: the search prefers the pair closest to it and never fails a floor on it.
3. On that layout the worklist places keys, first blockage first: hieroglyphs, ward keys, map pieces and the animals Fez sells. Tomb treasures (the corridor detector among them) are fixed when the tombs are built (Phase 3), before the layout, and count as structure.
4. Money is a condition, not a placement: in every ground the player can stand in, the money lying there covers everything for sale there.
5. The fixed quantities follow: mosaic pieces, camp finds and parts, waterskins, Fez's waterskins.
6. Money is placed last, so that it meets every condition from step 4.

A guard walks the **stamped** world and refuses any bake in which a journey cannot be entered, a tableau cannot be finished, or a ground is short of money. A hidden corridor counts as a gate too: what lies behind it is reachable only once the corridor detector is held. Saves do not exist yet, so every tier's layout and loot (starter included) may be reshaped by any bake. Master's open junk corridor becomes a trap path, so the waterskins that follow traps put master between expert and wizard. Then the animals: buying one opens its gate, Alle reizen says what a locked tier still needs, and the animal waits in the camp.

**Diagnosis (established, not re-derived):**

- Today the bake builds the world with only the wizard web floors pinned (`pinWebFloors`, `src/worldGen/webPlacement.ts:41-50`).
- It places loot (`placeFragments`, `src/worldGen/configBuilder.ts:404`) and validates it on floors carved at `defaultSeedFor` (`src/worldGen/reachability.ts:95,147,187`).
- Only then does it stamp a carve-searched `seed` + `packing` on every floor (`assembleOnce`, `scripts/generateWorld.ts:133-224`, base `floorAssemblySeed`). It re-builds only when the web moved (`bakeOnSettledPins`, `webPlacement.ts:58-77`).
- Nothing walks the stamped world. Which rooms lie before a tableau or lock depends on the carve, so pieces land behind their own gates in play. The strict walk enters 22 of 29 journeys at the shipped layout, and none of the 7 wizard journeys.
- The carve search falls back silently. It raises `packing` from the authored value in steps of 0.02 up to `PACKING_CEILING` (1, `src/game/carve/ladder.ts:47`), which is acceptable variation. But a floor no pair satisfies is pinned at its base seed and carved by the runtime ladder, and that ladder carve is only checked for `success` (`scripts/generateWorld.ts:206-222`). So a floor whose lock walks unsound, or which leaves a dead region, ships unless `STRICT_ATTEMPT_ZERO` is set: the fallback hides real failures.
- On a lock floor the carve already lays ungated side sections into the lock's laid corridors and regions; this is the designer's "a lock is a blueprint whose corridors may be filled in as a side path", in part (see Decision 7 for the evidence and the gap).
- The gate walk treats a hidden section as open. At runtime a hidden corridor is found only with the corridor detector: the `detection` perk, L1 at the earliest (`useCorridorDetection.ts`, `treasurePerks.ts`).

**Architecture:**

1. **A layout stage inside the build.** `buildConfigs` gains an injected `pickLayout` hook. It runs after every structural pass (roles, encounters, dressing, shop stock and its trim, shop-end clearing) and before the web and placement. It writes `seed` + `packing` on every floor. The bake supplies it from the carve search and ledger. The old after-build stamp becomes a check: if loot moved a wall, the bake is refused. Every tier is searched alike; no tier's pins are frozen.
2. **Hard layout criteria, packing as intent.** The carve search's hard criteria are: carves, lock walks sound, **every lock holds a puzzle on the way** (new), no dead region, every stub holds a room. `packing` and the ladder's widening are preferences, not criteria: the search takes the passing pair closest to the authored packing (`attempt 0` at the authored packing first, then raised packings closest first, then the ladder carve), and the ladder fallback must meet every hard criterion too. An authoring that no layout can meet is reported as **infeasible** (a check on the authoring, before or without carving); one the bounded search did not meet as **not found in budget**. Both fail the bake, naming the floor and the criterion.
3. **The corridor detector is a key.** The reachability support names the fact a hidden section needs. The tomb-treasure mod harvests a `detection` perk treasure to the detector facts for its level and below. Placement walks, the gate walk and grounds all honour it.
4. **Keys on the shipped layout.** The worklist walks the pinned floors, so its reachability is the player's. A key is placed only in a room the walk reaches (the room-reach hunk of the shelved patch). The animals are a gating currency: each fills a stock placeholder in its named shop, and only when that shop is reached before the gate.
5. **Grounds and money.** The gate walk gains a mode in which shop stock counts as held only once bought. A core function enumerates every **ground**: a fixed point the player can stand in, given which key pieces they bought. The shop mod checks `income(ground) ≥ buyable(ground)` on each ground, its waterskins and rares included. A one-gate-at-a-time check is unsound (Decision 12).
6. **Money last.** Every distribution that places a fixed quantity runs before the money distribution. Money fills the smallest ground first until each ground is covered. The authored 1070-coin allowance goes.
7. **The guard on the final world.** Once the build is done and the layout check has passed, `scripts/generateWorld.ts` builds a fresh gate walk over the final configs and refuses the bake on any unentered journey, locked tier or blocking lock. The mod validators (the shop's ground check among them) already run inside `buildConfigs` on the pinned world, which is the world that ships, so they are not run twice. A verify runs the same check over the committed `generatedWorld.ts`.
8. **The app** (old Tasks 5–7, adapted to Alle reizen): gate needs feed `allJourneys`' `extraNeeds`, the shop store records purchases as held keys, and the camp lands the animals on coming home.

**Tech Stack:** TypeScript, Vitest, React 19, Storybook, zod reward schemas, immer state models, `src/worldGen/{reachability,placeFragments,gateWalk,configBuilder,slots,slotAllocator,carveSeedSearch}.ts`, `src/game/floorLockWalk.ts`, `scripts/generateWorld.ts`, `yarn loot-report`.

**Spec:** `docs/handover-camp-release.md` (Phase 4 and Phase 5 briefs, driver rules); `docs/game-design/keys-and-locks-solver.md` (canonical order, worklist, completion pass, winnability); `docs/game-design/world-spec-stability.md` (free and structural fields, tier fingerprints); `docs/game-design/journeys.md` §3 (sprawl); `docs/superpowers/specs/2026-10-23-camp-loot-design.md` ("Bought at Fez", "No softlock"); `docs/mods/TARGET.md`; `docs/review-camp-release.md` §4 Failures (the phase-4 blocker this plan resolves).

## The purchase table (carried from the old plan; prices may move only by Task 11's rule)

| Purchase id     | Fact                     | Sold at (first Fez shop) | Opens                            | Camp steps                       | Price |
| --------------- | ------------------------ | ------------------------ | -------------------------------- | -------------------------------- | ----- |
| `donkey`        | `purchase:donkey`        | `junior_treasure_tomb`   | tier `expert`                    | `halter`, `donkey`, `saddlebags` | 200   |
| `cart`          | `purchase:cart`          | `expert_treasure_tomb`   | tier `master`                    | `cart`                           | 300   |
| `camel`         | `purchase:camel`         | `expert_treasure_tomb`   | journey `expert_treasure_tomb_b` | `camel`, `waterTrough`           | 250   |
| `secondDonkey`  | `purchase:secondDonkey`  | `master_treasure_tomb`   | tier `wizard`                    | `secondDonkey`                   | 250   |
| `secondCamel`   | `purchase:secondCamel`   | `master_treasure_tomb`   | journey `master_treasure_tomb_b` | `secondCamel`                    | 250   |
| `sturdyCart`    | `purchase:sturdyCart`    | `wizard_treasure_tomb`   | journey `wizard_treasure_tomb_b` | `paintedCart`                    | 400   |
| `caravanBanner` | `purchase:caravanBanner` | `wizard_treasure_tomb_c` | nothing                          | `caravanBanner`                  | 500   |

## Global Constraints

- **Branch** `camp/home-and-loot` only. Never `git pull`, never a bare `git stash`, never switch branches. One commit per task (Task 16 commits its docs step separately). Do not push from a task; the driver pushes after the phase.
- **Core is mod-agnostic.** `src/app`, `src/ui`, `src/game`, `src/data` and `src/worldGen` never name a mod, the `purchase` reward type, an animal, a purchase id, a `purchase:` fact, money, a sellable, a waterskin or a perk. Core speaks of buckets, stock, rewards, grounds and the support's hidden-section fact. `no-restricted-imports` stays at zero, and mods import no sibling. The one file that reads both shop and camp is an aggregate verify (`src/mods/purchaseFacts.verify.ts`, or under `scripts/` if lint refuses it, never an allowlist).
- **Mods toggle off.**
  - Shop off: no purchase, no Fez stock, no money condition and no gate need, so every tier and tomb opens as before.
  - Camp off: gates and purchases work, and no animal shows anywhere.
  - Tomb-treasure off: no detector facts and no hidden-section requirement, so hidden sections walk open, as without the mod today.
  - Task 16 proves shop off and camp off with a bake, types, build and the loot report.
- **`src/ui` takes props only**, and each new or changed `src/ui` component gets or updates its story with made-up props.
- **Strings** go nl first (spoken, everyday Dutch), then en, in `public/locales/{nl,en}/`. Every draft is listed under Drafts in `docs/review-camp-release.md`.
- **Saves never overwrite what they cannot read.** A stored value whose shape or version this build does not know reads as empty and is never written over. Ids are authoring names, never indices.
- **Tests never pin authored content or real-world counts.** Specs build made-up worlds, floors, tables, saves and needs. Agreement over the real data lives in `.verify.ts` files. Count work (walks, carves, grounds), never wall-clock.
- **Comments describe the current state and why**, never history.
- **Never weaken a check or relax a layout criterion.** Never use `SKIP_ECONOMY_GUARD`, and never hand-edit a baked number: pins, rewards and fingerprints are copied from a failure message only after a deliberate bake.
- **Every bake, loot report, verify and build runs under `timeout 900`.** When a process is quiet for long, check `ps` for a hung node or vitest.
- **Commits:** one line, `type: what changed`, ≤ 72 chars, plus the session's attribution trailer.
- **Model per task:** tasks marked **soundness** are implemented by Opus and get a per-task Opus review. The others are implemented by Sonnet. The phase review at the end is Sonnet.
- **Bakes run only in Tasks 6, 11 and 16.** The other tasks do not bake. Each runs its specs, `yarn check-types` and `yarn lint`.
- **Stop rule:** two failed attempts at a task stop the phase. Write what failed under Failures, and continue with the next task that does not depend on it. A layout infeasibility in a bake is not a failed attempt: it is the designer's authoring to fix. Record it under Failures with the floor and criterion, and stop the phase.

## Review Focus

1. **The layout is picked before loot and is the layout that ships.** Placement's reachability carves every floor at the `seed` + `packing` the layout stage wrote, and the post-build check finds no floor whose grid differs from the picked one (Tasks 1, 6).
2. **Hard layout criteria never relax, packing never fails a floor.** A floor that cannot meet a hard criterion fails the bake by name, infeasible and not-found told apart; a floor that only carves at a raised packing or on the ladder is accepted when it meets them (Task 2).
3. **A hidden corridor is a gate.** Nothing behind it counts, for placement, the guard or money, until the detector is held (Tasks 3, 9).
4. **No piece behind its own gate.** Room-level eligibility plus the stamped guard: every journey entered, every tier unlocked and no lock blocking, on the final configs and on the committed file (Tasks 4, 6).
5. **The animals are keys.** Each is placed by the worklist into its own shop, only when that shop is reached before the gate it opens. None opens starter or junior (Task 7).
6. **The money guard is sound against any spending order.** For every reachable ground, income ≥ everything for sale in it. A property test with an exhaustive spender on made-up worlds holds it (Task 8).
7. **Money is placed last and meets every ground,** with no allowance constant (Tasks 9, 10).
8. **The app gates on the same facts.** The locked tier shows the treasure lit, plus the animal it still needs and where Fez sells it (Task 12).
9. **Purchases and arrivals are saved by id and never clobbered** (Tasks 13, 14).
10. **Toggle-off works both ways** (Task 16).
11. **Master's traps sit between expert's and wizard's**, read from the loot report after the bake, never from a unit test (Tasks 5, 6).

## Decisions for the review list

Each decision is **default** / alternative. Task 16 writes them under Decisions, prefixed `Phase 4 —`.

1. **The layout stage is a hook inside the build** (`pickLayout`, one pass): the carve search runs on the structural authoring, and placement then runs on the pins. / Alternative: pin every floor from the last bake and re-bake until the pins settle, which takes two or more full builds and picks the layout after a first placement.
2. **"Loot moved a wall" refuses the bake.** The post-build carve compares each floor's grid shape with the picked one, and `bakeOnSettledPins`' re-build loop goes. A web placement that moved is also a refusal. / Alternative: keep re-building until settled.
3. **Shop-end placeholder clearing moves out of `collectSlots`** into a structural pass before the layout, because an end's `endReward` presence decides floor-key hosts. / Alternative: leave it in placement and rely on Decision 2's refusal.
4. **No tier is frozen** (designer: saves do not exist yet). Starter's floors are picked by the search like every other tier's. A baked pin that still verifies is kept (the search verifies before it searches); one that fails is re-searched. / Alternative: starter's pins verify-only, and a failing one stops the bake.
5. **A key that fits no slot before its gate stops the bake**, naming the gate and the bucket. No layout is re-picked automatically (designer: keep the default).
6. **Hard criteria, one added; packing is intent.** Hard: carves, lock walks sound, every lock holds a puzzle on the way, no dead region, every stub holds a room. Not hard: `attempt 0` and `packing` (designer: "packing is an intention, not a requirement"). The search order is the preference: every seed at the authored packing first, then each raised packing closest first up to `PACKING_CEILING` (a packing authored above the ceiling, a 1.6 sprawl hit or expert_4's 2, is searched at its own value only), then the runtime ladder carve at the base seed. The first candidate meeting every hard criterion is pinned; the ladder carve is now checked against the hard criteria instead of `success` alone, and `STRICT_ATTEMPT_ZERO` goes. `corridorStraightness` is never varied by the search; it stays as authored. / Alternative: keep `attempt 0` hard and fail floors that need the ladder.
7. **"A lock holds a puzzle on the way" is checked on what the carve already builds here; corridors as side-path blueprints are their own phase in this release.** Finding (code as it is):
   - **Already there, in part.** On a laid (lock) floor, an ungated side section (no gate, not sealed, not hidden, no sub-sections, ending in a chest, no lever, not named by a one-way, not a junction's way) is content, not a branch: its puzzles and end chest stand on the lock's laid corridor and region nodes, in walk order (`src/game/carve/prepareFloor.ts:613-632` `isContentSection`/`absorbedDemands`; `src/game/laidFloor.ts:516-524` `fillLaidFloor`). When the laid stretches are too short, the lay is lengthened on the cheapest region or corridor and laid again (`src/game/carve/layFloor.ts:17-25,79-85`; `Lengthening.kind: "region" | "corridor"`, `laidFloor.ts:514`). The main path's own puzzles stand on the lock's route (`layFloor.ts:57-61` `placeContentOnRoute`). Gates and drops keep their nodes, so rooms and obstacles interleave along a corridor.
   - **Not there.** A gated, keyed, sealed (every trap path) or hidden section, a section with sub-sections, and a junction's ways stay branches hung off laid ground, filtered only by region appetite (`prepareFloor.ts:607-611`, `hangBranches.ts:397-403`). Nothing addresses a section to a particular corridor or says "between these two areas": the spread is from the way in, and "a floor the spread cannot seat is packed from the way in instead" (`laidFloor.ts:521-522`). A `.lock` connection has no appetite of its own, only regions do (`src/game/regions.ts:12`, `lockAuthoring.ts:32`), and every placed catalogue lock is stood with every region `free` (`src/worldGen/spec/locks/onFloor.ts:43-45`), so no authored region appetite is in force. No check asks whether a lock's way holds a puzzle.
   - **This plan (default):** the hard criterion "every lock holds a puzzle on the way" (on the lock's solving walk, `walkFloorLock`, from the first sight of its shut door to its last control, at least one encounter room that is neither its control nor its door), plus "every region whose appetite asks for puzzles or a reward holds one", built on today's absorption. Infeasible when the floor has no content that may stand on lock ground: no main-path puzzle and no content section. A small task, before the first bake.
   - **Phase 4b, in this release (recommended order: after this plan, before the release):** locks as side-path blueprints, its own plan (`docs/superpowers/plans/<date>-camp-phase-4b-lock-blueprints.md`). This release may reset saves, so every lock floor re-carving is allowed. A connection gets an appetite and may name the side section it carries; the lay sizes that corridor for the section's rooms; `fillLaidFloor` seats each named section on its own corridor, the corridor's obstacles interleaved; gated, sealed and hidden sections may be laid into a corridor where a gate can stand on it. Size, honestly: the `.lock` notation and `lockAuthoring` types, `layLocks`' corridor sizing, `fillLaidFloor`'s assignment, `lockReview`, the catalogue's authoring, and every lock floor re-carved; large, a phase of its own. It ends with a re-bake through this plan's pipeline (layout stage, hard criteria, stamped guard, grounds), which is why it sits after: the guards it needs are built here, and its re-bake is mechanical. What this plan leaves ready for it: Task 2's lock-ground check reads appetite through one `appetiteOf(part)` over regions now and connections once they have one, so "every corridor asking for a side path carries one" becomes a case of the same `lockGroundUnfed` check, not a new criterion; `layoutInfeasible` reads the same appetites; Task 2 adds the corridor case as `it.todo` in `lockPuzzles.spec.ts`; and Task 16's review list names phase 4b as next.
   / Alternative: build phase 4b first, before this plan's first bake (Task 6). One bake fewer, but the animals, money and the stamped guard wait on a large carve feature, and 4b's carve changes would be checked without the guards this plan builds.
8. **No sprawl band** (designer): packing never fails a floor; Decision 6 says how the search prefers it. / Alternative: a band per tier (dropped).
9. **Infeasible versus not found.** The search reports one of two kinds for a hard criterion:
   - **Infeasible** is decided on the authoring, before carving, by checks that hold for every seed: a lock floor with no content that may stand on lock ground (no main-path puzzle, no content section); a region asking for puzzles or a reward on a floor with none to give; a seed-independent assembler refusal (a one-way naming a missing section, a switch asking for more junctions than `forks` reserves).

     Message: `<journey> level <n> floor <f>: infeasible — <criterion>: <authoring field and why>`.
   - **Not found** follows the bounded search: `CARVE_SEED_BUDGET` seeds × every packing step up to the ceiling, then the ladder carve, with each hard criterion's refusal counts.

     Message: `<journey> level <n> floor <f>: no layout in <seeds> seeds × <packings> packings and the ladder meets "<hardest criterion>" (<counts per criterion>) — change <field> or raise the budget`.

   Both fail the bake. The ledger records not-found results by authoring hash, so they are not re-searched until something changes. / Alternative: one message for both.
10. **The corridor detector is a key.** `ReachabilitySupport.hiddenRequirement?: () => string`, one fact for the whole world. A hidden section's cells are walkable only while that fact is held (strict walk, placement walks, grounds). The tomb-treasure support harvests a treasure with a `detection` perk of level n to the fact `detector:corridor:<k>` for every k ≤ n, and names `detector:corridor:1` as the hidden requirement, since L1 is what lets a player step onto a hidden junction at runtime. The permissive "everything ever reachable" walk keeps hidden open, because it answers collection totals. / Alternative: a hidden section needs a level per section (needs authoring that does not exist).
11. **The purchase table, shops and prices carry over** from the old plan (table above). / Alternative: price them like the rare stock (500–1000).
12. **A money moment is a reachable ground, not a withheld gate.** A ground is a fixed point from empty hands in which shop stock counts only once bought. Grounds are enumerated breadth-first by buying one key piece at a time, and are deduplicated by the set of rewards reached. Check: `income(R) ≥ buyable(R)` for every ground R. This is sound: a stuck player at R with an unbought key K has spent at most `buyable(R) − price(K)`.

    The old one-gate-withheld check is unsound. Made-up counterexample: starting income is 100, and keys A, B and C cost 50 each. A opens a room with a 50-coin mosaic and no money; B and C each open 1000. Every one-withheld walk passes, but buying A and then the mosaic strands the player.

    / Alternative: per-gate rows (unsound); count only key stock (unsound when rares are bought first).
13. **The ground enumeration is capped at 4096 grounds.** Over the cap, the bake refuses and names the count. / Alternative: no cap.
14. **Hidden-pocket money counts as income only in grounds where the corridor detector is held** (designer). This follows from Decision 10 with no money-specific rule.
15. **Fez keeps his key stock** (designer): the 6 hieroglyph pieces and the map piece stay in shops, bought with money and part of the ground enumeration.
16. **Fez sells waterskins: 2 per tomb shop, expert and up** (7 shops, 14 in all). Price: 30 at expert, 40 at master, 50 at wizard. They are not keys, just stock that money must cover in their grounds. A bought waterskin works like a found one (heals a missing heart at once). The trap mod adds the stock placeholders through `shopStock`, and they come on top of the trap-scaled count of Decision 18. / Alternative: 1 per shop, taken out of the trap-scaled count, or none in junior and up.
17. **Money runs last by a flag**, `Distribution.fillsLast` (mod-agnostic): every other dynamic distribution fills before it. / Alternative: rely on registry order.
18. **Waterskins follow the traps (designer's ruling).** For expert and up, each tier gets `round(WATERSKINS_PER_TRAP × traps in that tier)`, with the traps counted from the world's trap encounters at build time, never hard-coded. The trap mod authors `WATERSKINS_PER_TRAP = 1.3`, which comes to about 150 in all at today's 32 / 19 / 64 expert / master / wizard traps (≈ 42 / 25 / 83). If Task 11's bake cannot meet a ground's money, the ratio steps down by 0.2, never below 0.6. / Alternative: a flat 50 per tier, or keep 60.
18a. **Master's open junk corridor is a trap path of 3 puzzles** (`src/worldGen/spec/master.ts`, `MASTER_SIDE_PATHS`: `{ density: "low", pathPuzzles: 3, end: "junk", encounter: "trap" }`), so master's trap count lands between expert's and wizard's and its waterskins follow (Decision 18). / Alternatives: `encounter: "trap"` at 2 puzzles (fewer traps added); or 4 puzzles like expert's open junk path (more traps, a longer corridor).
19. **A shop has no empty stock slot.** Stock arrays are trimmed to what was assigned, right after `placeShopStock`, before the layout. / Alternative: fill the spare slots with sellables for sale.
20. **Sellables: the same 25 kinds, more and dearer.** The tier sell values in `src/data/sellables.ts` are raised once, so that world income ≈ 1.1 × sinks (13 rares, 7 purchases and Fez's waterskins). `PER_ITEM_CAP` is raised only if the fill needs more drops. The fill varies drop counts per ground, never per-drop values. / Alternative: new sellable ids at new values.
21. **`MONEY_ALLOWANCE` goes.** The budget is each ground's need plus a 10 % margin, then the world up to ≈ 1.1 × sinks. / Alternative: keep an allowance.
22. **A need line can carry a hint.** `JourneyNeed.hint` is shown under the label. The locked tier group, shown only when `tierKeyHeld`, lists the tier treasure lit and "Je hebt een ezel nodig" with "Fez verkoopt er een in <tomb>". / Alternative: the place inside the label.
23. **Carried unchanged from the old plan:**
    - a purchase opens its gate at once, and the animal arrives on the next homecoming (old 8);
    - the catalogue's steps land (old 9);
    - the camp learns through held keys (old 10);
    - camp save v2 with `arrived` (old 11);
    - a shop store `{ version: 1, purchases }` (old 12);
    - purchases in Fez's one buy list (old 16);
    - emoji 🫏 🐪 🛞 🚩 (old 17);
    - toggle-off semantics (old 18);
    - the dev grant "Koop alle dieren" (old 21).

---

### Task 1: The layout is picked before placement (**soundness**: world-gen layout)

**Files:**

- Modify: `src/worldGen/configBuilder.ts` (+ spec): the `pickLayout` option, called after Phase 3.6, the stock trim and the shop-end pass, before 3.65 (web) and Phase 4 (placement).
- Modify: `src/worldGen/slots.ts`, `slots.spec.ts`: `collectSlots` skips shop ends and clears nothing.
- Modify: `src/worldGen/shopStock.ts` (+ `shopStock.spec.ts`): `clearShopEnds(configs, resolveEncounter)` and `trimEmptyStock(configs)`, both structural passes.
- Modify: `src/mods/buildWorldConfigs.ts`: takes `pickLayout` as an option and hands it to `buildConfigs`; exports `pinsFrom(baked)`, a `PickLayout` that copies `seed` + `packing` from a baked world (default: `generatedWorldConfigs`); the `pinWebFloors` call goes (C1).
- Modify: every caller of `buildConfigs` / `buildWorldConfigs` other than the bake passes `pinsFrom(generatedWorldConfigs)`, so it builds the shipped world (C1): `src/worldGen/configBuilder.integration.verify.ts`, `src/data/newFamilyIsNoOp.verify.ts`, `src/mods/topology/carveNeverDependsOnAMod.verify.ts`, `src/worldGen/lockPlanWorld.verify.ts`, `src/worldGen/lockFloorInspector.verify.ts`, `src/worldGen/seedDemand.verify.ts`, `scripts/puzzleSeeds.ts` (re-check with `grep -rln "buildConfigs(\|buildWorldConfigs(" src scripts`). Only `scripts/generateWorld.ts` passes the search.
- Modify: `src/worldGen/reachability.ts` (+ spec): `reachableFloorsInSite` carves floor `i` at `site[i].seed ?? defaultSeedFor(ref) + i`, passed explicitly, and keys its cache on that seed; the comment that says it assembles at `defaultSeedFor` and not the runtime seed is rewritten to the current state (C5).
- Modify: `src/worldGen/webPlacement.ts`: `pinWebFloors` and `bakeOnSettledPins` go; `placementMoved` stays for the refusal.
- Create: `src/worldGen/layoutCheck.ts`, `layoutCheck.spec.ts`.
- Modify: `scripts/generateWorld.ts`:
  - `assembleOnce` becomes the `pickLayout` implementation;
  - after the build, `layoutMoved` (carving every final floor afresh, never through the pick's grid cache, R4) and `placementMoved` run, and either one non-empty exits 1;
  - `pickLayout` refuses by name a lock with outside inputs (a web's `A outside`) that cannot carve before the web is laid, and a web floor's pick is verified again after Phase 3.65 (C4; no web ships today, so this costs nothing now).

**Interfaces:**

- Produces: `PickLayout = (configs: Record<string, SiteConfig[]>) => void`, which writes `seed` and `packing` on every floor.
- Produces: `clearShopEnds`, which clears a section's `fragmentSlot` end placeholder when its end resolves to the Fez-shop family. The resolver is injected.
- Produces: `trimEmptyStock`, which drops every `undefined` stock entry.
- Produces: `gridShape(grid: FloorGrid): string`, a hash of the cells and walls only: rewards, web doors and web gates are left out (web placement has its own `placementMoved` check, C4).
- Produces: `layoutMoved(picked: ReadonlyMap<string, string>, configs, carve): string[]`; `carve` carves the final config afresh (R4).
- Produces: `pinsFrom(baked): PickLayout` (C1).
- Consumes: `searchCarvePair`, `verifyCarvePair`, the carve ledger.

- [ ] **Step 1: Failing tests** (made-up worlds and a made-up encounter resolver):
  - `configBuilder.spec.ts` "the layout hook sees the world before any loot": every `fragmentSlot` placeholder is still unfilled and no distribution has run; shop ends are cleared and stock is trimmed. Tomb treasures written in Phase 3 are structure and may already stand (C6).
  - `reachability.spec.ts` "placement carves each floor at the layout's pin": the grid the placement walk carves for a made-up floor with a written `seed` equals `assembleFloor` at that seed (or the cache key carries it), not at `defaultSeedFor` (C5).
  - `buildWorldConfigs` spec "pinsFrom copies seed and packing from the baked world onto every floor".
  - `layoutCheck.spec.ts` "a placed reward moves no wall": `gridShape` is equal with placeholders and with concrete rewards.
  - `layoutCheck.spec.ts` "an end that loses its reward after the pick is named".
  - `shopStock.spec.ts`: "a shop's end placeholder is cleared before the layout", "a shop keeps only its assigned stock", and "trimming moves no wall", which carves the made-up floor with both stock shapes (untrimmed and trimmed) and compares the two `gridShape`s (R5).
  - `layoutCheck.spec.ts` "layoutMoved carves afresh": handed a carve that returns a different grid than the pick saw, it names the floor (R4).
  - `slots.spec.ts`: "collectSlots skips a shop end and clears nothing".
- [ ] **Step 2: Run** `yarn test src/worldGen src/mods/buildWorldConfigs` → FAIL. (Before the first commit, the working tree must hold no edits that are not this task's.)
- [ ] **Step 3: Implement.** Comments say why the layout precedes loot and why end presence is structural.
- [ ] **Step 4: Run** → PASS; `yarn check-types`; `yarn lint`. Do not bake.
- [ ] **Step 5: Per-task review** (Opus): no structural write after `pickLayout`; the web is read on picked floors; every non-bake caller of `buildConfigs` builds on `pinsFrom` (C1).
- [ ] **Step 6: Commit:** `refactor: world layout is picked before loot is placed`

---

### Task 2: Layout criteria are hard, packing is intent (**soundness**: world-gen layout)

**Files:**

- Modify: `src/worldGen/carveSeedSearch.ts` (+ spec): the hard criteria (Decision 6), the search order as preference, the ladder carve as the last candidate checked against the hard criteria, and the two result kinds.
- Create: `src/game/lockPuzzles.ts`, `lockPuzzles.spec.ts`: on the carved grid, the locks whose solving walk passes no encounter room, and the lock ground (regions; corridors once 4b lands) whose appetite asks for puzzles or a reward and holds none (Decision 7).
- Create: `src/worldGen/layoutFeasibility.ts`, `layoutFeasibility.spec.ts`: the authoring checks that hold for every seed (Decision 9).
- Modify: `scripts/generateWorld.ts`: `STRICT_ATTEMPT_ZERO` goes; the ladder fallback is no longer pinned unchecked; any infeasible or not-found floor exits 1 after every floor has been tried, listing all of them.
- Modify: `scripts/carveLedger.ts`: the entry carries `kind: "notFound"`.
- Modify: `src/worldGen/carveSeedSearch.ts` `verifyCarvePair`: a pin equal to (base seed, authored packing) verifies when its full-ladder carve meets every hard criterion (`laddered: true`), so a laddered floor is verified, not re-searched, each bake (C3).
- Modify: `src/worldGen/bakedCarve.verify.ts`: the `NEEDS_THE_LADDER` list and the attempt-0 assertion go; it asserts `refusal(...) === null` under `HARD_CRITERIA` on every baked floor, laddered floors carved with the ladder (stricter than today, C2).
- Modify: `src/game/carve/ladder.ts`: the comment naming `STRICT_ATTEMPT_ZERO` says the current state (C2).
- Modify: the `pickLayout` implementation Task 1 put in `scripts/generateWorld.ts`, to the new result kinds.
- Create: `scripts/layoutReport.ts` and a `yarn layout-report` script in `package.json`: runs `pickLayout` over the current authoring with no bake write and prints every infeasible, not-found and ladder-only floor (C15). Committed, so later tasks re-run it.

**Interfaces:**

- Produces: `HARD_CRITERIA` = `carves`, `lock walks sound`, `lock holds a puzzle`, `no dead region`, `every stub holds a room`; `refusal(result)` reports only these. `attempt 0` and the packing step stay in the search's order, not in its refusals.
- Produces: `layoutInfeasible(floor, prep): { criterion; detail }[]`, with no carve.
- Produces: one discriminant on every result (C17): `{ kind: "found"; seed; packing; laddered: boolean; grid; … }`, `{ kind: "notFound"; hardest; counts; seeds; packings }`, `{ kind: "infeasible"; criterion; detail }`. The caller asks `layoutInfeasible` first and reports `infeasible` without searching. `seedBudget` counts seeds (offsets `0 … n-1`); each candidate is one carve, the ladder carve last.
- Produces: `lockWithoutPuzzle(grid): string[]` and `lockGroundUnfed(grid, floor): string[]` (C17): the grid's cells carry region names, the floor's locks carry the appetites, read through one `appetiteOf(part)` (regions today; connections once phase 4b gives them one).

- [ ] **Step 1: Failing tests** (made-up floors, injected assembler):
  - `layoutFeasibility.spec.ts` "a lock floor with no main-path puzzle and only gated sections is infeasible before any carve": **0** carves counted, the message names the lock and `lock holds a puzzle`.
  - `layoutFeasibility.spec.ts` "a one-way naming a missing section is infeasible".
  - `carveSeedSearch.spec.ts` "a hard criterion no candidate meets is not found": an assembler failing `no dead region` everywhere, budget 3 seeds (offsets 0–2) × 2 packings plus the ladder carve: `notFound`, 7 carves, the hardest criterion and its count.
  - `carveSeedSearch.spec.ts` "the pair closest to the authored packing wins": passing at the second packing step and at the fourth, the second is pinned.
  - `carveSeedSearch.spec.ts` "packing never fails a floor": an assembler passing only on the ladder carve gives `found` with `laddered: true`.
  - `carveSeedSearch.spec.ts` "the ladder carve must meet the hard criteria": a ladder carve whose lock walks unsound is `notFound`, never pinned.
  - `carveSeedSearch.spec.ts` "a laddered pin verifies without a search": a pin at (base, authored) whose ladder carve meets the hard criteria verifies with one carve and `laddered: true` (C3).
  - `lockPuzzles.spec.ts`: "a lock whose way passes a puzzle room passes"; "a lock whose control is the only room on its way is named"; "a region asking for puzzles that holds none is named"; `it.todo("a corridor asking for a side path that carries none is named")` for phase 4b.
- [ ] **Step 2: Run** `yarn test src/worldGen/carveSeedSearch src/worldGen/layoutFeasibility src/game/lockPuzzles` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Measure, without baking:** `timeout 900 yarn layout-report` (the committed `scripts/layoutReport.ts`). List every floor that is now infeasible or not found, with its message, under Failures in the review list, and the count of floors that pass only on the ladder (accepted). This is what Task 6's bake will refuse, so the designer sees it before the bake.
- [ ] **Step 5: Run** → PASS; `yarn check-types`; `yarn lint`; `yarn vitest run --config vitest.verify.config.ts src/worldGen/bakedCarve` on the committed world (its laddered floors must pass the hard criteria; a floor that does not goes under Failures with the Step 4 list).
- [ ] **Step 6: Per-task review** (Opus): no fallback ships a floor unchecked; infeasible is only claimed for checks that hold for every seed; packing orders the search and never refuses.
- [ ] **Step 7: Commit:** `feat: a floor's layout meets every hard criterion or the bake names it`

---

### Task 3: A hidden corridor needs the corridor detector (**soundness**: reachability)

**Files:**

- Modify: `src/worldGen/reachability.ts` (+ spec): `ReachabilitySupport.hiddenRequirement`. The strict and placement walks treat a hidden cell as walkable only while that fact is held, and record the requirement as a discovered lock.
- Modify: `src/game/siteValidator.ts` (+ spec): `reachableFrom` and `collectReachableKeys` take `hiddenOpen` inside an options object that replaces their growing positional tail (C11; Task 8 adds to the same object).
- Modify: `src/worldGen/gateWalk.ts` (+ spec): the walk honours it.
- Modify: `src/mods/registeredMods.ts` (+ spec): `mergeReachabilitySupports` carries `hiddenRequirement`; two contributors naming one throws (C8).
- Modify: `src/worldGen/placeFragments.ts`: `mergeReachabilitySupport` (which copies a fixed list of fields today) forwards `hiddenRequirement` (C8).
- Modify: `src/worldGen/gateWalk.ts`: its top comment's "Hidden pockets in that ground count" says the current state.
- Modify: `src/mods/tombTreasure/game/reachabilitySupport.ts` (+ spec): `detector:corridor:<k>` facts from `detection` perk treasures, and the hidden requirement.

**Interfaces:**

- Produces: `hiddenRequirement?: () => string`. With no support naming one, hidden cells walk open, as today.

- [ ] **Step 1: Failing tests** (made-up worlds):
  - `gateWalk.spec.ts` "a reward in a hidden section is out of the ground until the detector fact is held, and in once a reached treasure grants it".
  - `reachability.spec.ts` "a slot not flagged hidden but reached only through hidden cells (past a hidden stair or section) gets no key until the detector is held" (C10; hidden-flagged slots are already skipped today, `placeFragments.ts:272`).
  - `placeFragments.spec.ts` "a dynamic distribution's slot reached only through hidden cells counts as behind the detector" (C10).
  - `reachability.spec.ts` "with no hidden requirement a hidden section walks open".
  - tombTreasure support spec: "a level-2 detection treasure grants levels 1 and 2".
  - `registeredMods.spec.ts`: "two supports naming a hidden requirement fail the merge"; `placeFragments.spec.ts`: "the merged support keeps the hidden requirement" (C8).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS; `yarn check-types`; `yarn lint`.
- [ ] **Step 5: Per-task review** (Opus): the runtime rule matches (L1 is what lets the player stand on a hidden junction); the permissive walk is unchanged; core names no perk.
- [ ] **Step 6: Commit:** `feat: hidden corridors count only once the corridor detector is held`

---

### Task 4: Room reach and the guard on the stamped world (**soundness**: reachability)

**Files:**

- Apply with `git apply`: only the `placeFragments.ts` and `placeFragments.spec.ts` hunks of `.superpowers/sdd/2026-10-25-camp-phase-4-animal-gates/task-2b-room-reach-and-walk-guard.patch`. Fit the spec's `demandFor` to the full `CurrencyDemand`, as Task 2c did.
- Modify by hand: `src/worldGen/slots.ts`, on Task 1's version: the patch's `Slot.sentinel` field and the room-reach eligibility line (the hunk no longer applies, C7).
- Modify: `src/worldGen/placeFragments.ts` `mergeReachabilitySupport` forwards `resolveOneWay`, `resolveRegionBarrier` and `resolvePassage` (dropped there today); `gateWalk.ts` already forwards the support whole and needs no change for them (C8).
- Modify: `src/worldGen/validate.ts` (+ spec): `stuckPoints`, which generalises the patch's `validateWalkEntersEveryJourney`.
- Modify: `scripts/generateWorld.ts`: once the build is done and the layout check has passed, a fresh walk (fresh cache) over the final configs and `stuckPoints` on it; any line exits 1. The mod validators are not re-run here: `buildConfigs` already runs them on the pinned world (R1).
- Create: `src/data/worldWinnable.verify.ts`: the same check over the committed `generatedWorld.ts`, run by `yarn verify-content`.

**Interfaces:**

- Produces: `stuckPoints(walk: GateWalk, journeyMeta): string[]`, one line each for an unentered journey, a locked tier and a blocking lock (the bucket and where it stands).

- [ ] **Step 1: Failing tests** (made-up worlds):
  - from the patch: "a slot behind a room needing the made-up glyph is skipped for another journey's end";
  - "a key on a shop's end leaves its journey unentered and is named" (the made-up world is built by hand with the key on the shop end, since placement no longer puts one there);
  - "a world whose every lock opens has no stuck points";
  - "a tier whose only group's bucket is nowhere is named locked";
  - `placeFragments.spec.ts` "the merged support keeps the one-way, region-barrier and passage resolvers", and "a one-way door is walked as the support resolves it" (C8);
  - "a journey reachable only through a hidden corridor with no detector anywhere is named".
- [ ] **Step 2: Run** `yarn test src/worldGen src/data` → FAIL.
- [ ] **Step 3: Implement.** The script prints `strict walk enters N of M journeys` on success.
- [ ] **Step 4: Run** → PASS; `yarn check-types`; `yarn lint`.
- [ ] **Step 5: Per-task review** (Opus): final configs, a fresh cache, nothing withheld; messages name a target, never a fix.
- [ ] **Step 6: Commit:** `feat: the bake refuses a stamped world the player can get stuck in`

---

### Task 5: Master's open junk corridor carries traps

Sonnet.

Master has fewer traps than expert (32 expert / 19 master / 64 wizard today). Its open junk corridor carries none, while expert's open junk path is a trap path, so master's waterskins (which follow traps, Decision 18) fall below expert's.

**Files:**

- Modify: `src/worldGen/spec/master.ts`, the open junk corridor in `MASTER_SIDE_PATHS` (about line 60): `{ density: "low", pathPuzzles: 3, end: "junk", encounter: "trap" }` (Decision 18a). The comment above it says, in the current state only, why the corridor is a trap path: master's traps sit between expert's and wizard's, and its income still comes from the junk end.
- Modify: `src/mods/trap/game/lootTotals.ts` (+ `lootTotals.spec.ts`): the loot report shows traps and waterskins per tier (`Traps (<tier>)`, `Waterskins (<tier>)`), with the tier read from the section, so the bake can be checked.

No unit test pins the authored spec: the bake and the loot report are the check (Task 6).

- [ ] **Step 1: Failing test** (`lootTotals.spec.ts`, made-up configs): "traps and waterskins are counted per tier", where a made-up world with traps on two tiers gets one row per tier with those counts.
- [ ] **Step 2: Run** `yarn test src/mods/trap` → FAIL. **Step 3: Implement** both edits. **Step 4: Run** → PASS; `yarn check-types`; `yarn lint`. Do not bake.
- [ ] **Step 5:** The corridor's length is structural, so run `timeout 900 yarn layout-report` (committed by Task 2, C15) and update the review list's layout-refusal lines for master.
- [ ] **Step 6: Commit:** `feat: master's open junk corridor carries traps`

---

### Task 6: Bake 1 — the world on its picked layout (**soundness**: the bake)

**Files (by the bake):** `src/data/generatedWorld.ts`, `src/data/carveLedger.json`, `src/data/tierFingerprints.json` (moved tiers, deliberately), `docs/loot-report.md`, `docs/review-camp-release.md`, `.betterer.results` (re-key only).

- [ ] **Step 1: Before:** `timeout 900 yarn loot-report` on the committed bake, with its totals and per-tier trap counts kept in the scratchpad.
- [ ] **Step 2: Bake:** `timeout 900 yarn generate-world`.
  - If it refuses on layout (infeasible or not found), stop the phase. The floors and criteria go under Failures for the designer's authoring, which Task 2 already listed.
  - Otherwise it must:
    - print `strict walk enters 29 of 29 journeys`;
    - report no "loot moved a wall" and no "web moved";
    - place hieroglyphs 296/296;
    - leave 0 empty chests;
    - keep every currency total.
    - show in the loot report master's trap count between expert's and wizard's. Waterskins still follow the flat rule until Task 9; from Task 11 on, they follow these new trap counts.
- [ ] **Step 3: Fingerprints:** every tier may move, starter included. For each tier whose fingerprint moved, copy its hash and write one review-list line saying why (layout re-picked, loot re-placed on it, master's trap corridor).
- [ ] **Step 4: Report:** `timeout 900 yarn loot-report`. Totals are exact, and the slot mix and hidden-pocket keys move.
- [ ] **Step 5: Checks:** `timeout 900 yarn verify-content` (includes `worldWinnable.verify.ts`, `bakedCarve.verify.ts` under the hard criteria, and the verifies that now build on `pinsFrom`, C1/C2) and `timeout 900 yarn verify`.
- [ ] **Step 6: Review list:** the phase-4 blocker moves from Failures to resolved, with the walk counts (22/29 → 29/29 shipped) and how many floors moved pin.
- [ ] **Step 7: Commit:** `chore: bake the world with loot placed on its picked layout`

---

### Task 7: The animals are keys (**soundness**: world-gen placement)

**Files:**

- Create: `src/mods/shop/game/purchases.ts`, `purchaseCurrency.ts` and `reachabilitySupport.ts`, each with a spec.
- Modify: `src/mods/shop/game/rewardSchemas.ts`, `pricing.ts` (+ spec), `src/mods/shop/index.ts` (`shopStock`, `currencies`, `reachabilitySupport`).

**Interfaces:**

- Produces: `Purchase = { id; fact; price; soldAt: { journeyId; nth? }; opens?: { tier } | { journeyId } }`, `PURCHASES` and `purchaseFact(id)`.
- Produces: `purchaseProblems(table, tombIds)`, which reports a duplicate, a bad fact, a bad price, a non-tomb shop, two purchases on one gate, or a purchase opening starter or junior.
- Produces: `requirementsFor(table)`.
- Produces: `purchaseRewardSchema = { type: "purchase"; id }`; `priceFor` prices a purchase flat from the table.
- Produces: `purchaseCurrency(table): CurrencyDistribution`. It owns every purchase fact, and its demand is one `{ type: "purchase", id }`. Its `rank` returns only the candidates whose `preference` is that fact (it may shorten the list), so no other slot is ever offered; no core change (C14). If the worklist turns out to assume `rank` keeps every candidate, add an optional core `eligible` to `CurrencyDistribution` and list `src/worldGen/placeFragments.ts`. `allBuckets` lists every fact, so the banner is placed.
- Produces: `SHOP_REACHABILITY`, which maps a purchase to its fact and supplies `tierUnlockGroups` / `journeyEntryLocks`.
- Consumes: `CurrencyDistribution` as it is (`ownsBucket`, `demandFor`, `rank`, `allBuckets`).

- [ ] **Step 1: Failing tests** (made-up tables and worlds):
  - every problem is reported once and named;
  - "a purchase lands in its own shop's placeholder";
  - "a purchase whose shop lies behind the gate it opens fails the build, naming both";
  - "a purchase that opens nothing is still placed by the completion pass";
  - "no other currency takes a purchase placeholder";
  - "a purchase is never ranked into a slot that is not its placeholder" (C14);
  - a purchase is priced from a made-up table at every tier.
- [ ] **Step 2: Run** `yarn test src/mods/shop src/worldGen` → FAIL. **Step 3: Implement.** Do not bake. **Step 4: Run** → PASS; `yarn check-types`; `yarn lint`.
- [ ] **Step 5: Per-task review** (Opus): the gate is the frontier when the purchase is placed; core reads no reward type; nothing gates starter → junior.
- [ ] **Step 6: Commit:** `feat: Fez's animals are keys placed before the gates they open`

---

### Task 8: Grounds and the money guard (**soundness**: the economy guard, reachability)

**Files:**

- Modify: `src/worldGen/reachability.ts` (+ spec): a `stockHeld?: (reward) => boolean` hook in the walk's options object (Task 3's), consulted where shop stock is harvested; absent, stock harvests as today (C11).
- Modify: `src/worldGen/gateWalk.ts` (+ spec): the `holding` mode, built on that hook.
- Create: `src/worldGen/grounds.ts`, `grounds.spec.ts` (`reachableGrounds`, `keyRewardsOf`).
- Create: `src/mods/shop/game/moneyLedger.ts`, `moneyLedger.spec.ts`.
- Modify: `src/mods/shop/game/economyGuard.ts` (+ spec) and `lootTotals.ts` (+ spec).

**Interfaces:**

- Produces: `GateWalk.holding(bought: ReadonlySet<TreasureReward>): GateWalkResult & { stock: readonly TreasureReward[] }`. Shop stock harvests only when bought (by identity). Room rewards harvest as before, the hidden requirement included. Memoised per set.
- Produces: `reachableGrounds(walk, { isKey, cap }): { grounds: Ground[] } | { overCap: number }`, with `Ground = { bought; rewards; stock }`. It searches breadth-first from ∅, buying one key piece in `stock` at a time, and deduplicates grounds by the rewards reached. `isKey` comes from core, never from a mod (C12): `keyRewardsOf(configs, support)` in `src/worldGen/grounds.ts` says a reward is a key when its bucket (through the merged support) is named by some lock in the world (an entry lock, a tier group, a gate or a tableau requirement). Purchases, hieroglyph pieces and the map piece qualify; Fez's waterskins and rares do not (a mosaic counted as a key only makes grounds finer, which is safe). The shop guard and the fill take it from there.
- Produces (shop): `moneyLedger(grounds, priceFor, incomeOf): MoneyRow[]`, each row `{ label: the key pieces bought; income; buyable; margin }`.
- Produces (shop): `purchasePlacementProblems(walk, table)`: only a purchase stocked twice or missing. Whether its shop lies before its gate stays the worklist's (Task 7) and `stuckPoints`' (Task 4) question (R3).
- Produces (shop): `runEconomyGuard(configs, reachable, walk)`. It throws on placement problems, on any negative margin (naming the ground, income, buyable and shortfall), and on `overCap`. The global-only check goes; the last ground is the world.
- Produces: loot-report rows `Money with <bought> bought` and `Purchases in shops`.

- [ ] **Step 1: Failing tests** (made-up worlds and tables):
  - `grounds.spec.ts`:
    - "buying a key that opens nothing new adds no ground";
    - "two independent keys give four grounds";
    - "over the cap returns the count";
    - "walks ≤ grounds × key pieces" (counted);
    - "a reward is a key when some lock names its bucket": a made-up glyph a tableau names is a key, a made-up mosaic no lock names is not (C12).
  - `moneyLedger.spec.ts`:
    - the Decision 12 counterexample: the old one-withheld rows pass, and the guard refuses, naming the ground "A bought";
    - **"money behind a hidden corridor does not cover a purchase until the detector is held"**: a made-up world where the only money that pays for a key in a shop lies in a hidden section, and the detector treasure lies behind that key. The guard refuses, naming the ground. Moving the detector treasure before the shop makes it pass;
    - "Fez's waterskins count as buyable in their ground and never open anything";
    - a property test over 200 seeded made-up worlds (≤ 3 shops, ≤ 4 key pieces, ≤ 3 rares, ≤ 1 hidden section). On every world the guard passes, an exhaustive spender (every buy order) never ends with an unbought visible key it cannot afford.
  - `economyGuard.spec.ts`: a purchase stocked twice, or missing, throws naming it.
  - `lootTotals.spec.ts`: on a made-up world, the rows equal numbers computed by hand in the spec (R2).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** The top comment of `grounds.ts` says what a ground is and why every one is checked. **Step 4: Run** → PASS; `yarn check-types`; `yarn lint`. Do not bake.
- [ ] **Step 5: Per-task review** (Opus): the soundness argument holds in code; no money word in core; the property test can fail (break the guard locally and see it go red).
- [ ] **Step 6: Commit:** `feat: the economy guard checks every ground a player can stand in`

---

### Task 9: Fixed quantities before money, Fez's waterskins (**soundness**: world-gen placement)

**Files:**

- Modify: `src/worldGen/slotAllocator.ts`, `src/worldGen/placeFragments.ts` (+ specs): `Distribution.fillsLast?: true`, and distributions that fill last run after every other one.
- Modify: the trap mod's waterskin distribution. Per tier, `round(WATERSKINS_PER_TRAP × that tier's trap encounters)` (Decision 18), expert and up. The trap mod's `shopStock` gets 2 `prefers: waterskin` placeholders per expert-and-up tomb shop, filled by the same distribution (Decision 16).
- Modify: `src/mods/shop/game/pricing.ts` (+ spec): the waterskin stock price by tier.
- Modify: `src/mods/shop/game/loot.ts`: `fillsLast: true`.
- Modify: `src/mods/camp/game/campSteps.ts` + `campLoot.ts` (+ specs): the camp step table names one structure as the early one (authored data, e.g. `early: true` on a structure; today the starter `windbreak`). Its first part lands on the earliest main, ungated slot of its tier's first journey and its second part on the earliest such slot of the second journey, so it is complete after the second journey and the player sees the camp change early. A table naming more than one early structure per tier is a `campStepProblems` error. Every other structure keeps today's spread deal (designer, 2026-10-25).

- [ ] **Step 1: Failing tests** (made-up worlds):
  - `placeFragments.spec.ts`: "a distribution marked last fills after one registered after it".
  - "waterskins follow the traps per tier": with 2 / 0 / 10 traps on expert / master / wizard and a made-up ratio, the counts come out in that proportion, with none on a tier without traps or below expert.
  - "a tomb shop's waterskin placeholders are filled with waterskins and priced by its tier".
  - "no waterskin in a junior or starter shop".
  - `campLoot.spec.ts`: "the early structure completes in its tier's second journey" (made-up steps and slots: part 1 on the first journey's earliest main slot, part 2 on the second journey's; other structures still spread) and "two early structures in one tier is a step-table problem".
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS; `yarn check-types`; `yarn lint`.
- [ ] **Step 5: Per-task review** (Opus, light): ordering is mod-agnostic, and the shop prices a reward type it does not import.
- [ ] **Step 6: Commit:** `feat: fixed loot fills before money, Fez sells waterskins`

---

### Task 10: Money is placed to meet every ground (**soundness**: the economy guard)

**Files:**

- Modify: `src/worldGen/slotAllocator.ts`, `src/worldGen/placeFragments.ts`: a distribution's `fill` gets `ctx: { walk: GateWalk; isKey }`. Before the walk is built, a fill marked `fillsLast` gets a fresh placeholder object standing in every free slot it was handed (puzzle slots included, which carry no sentinel today); the walk, built with a fresh cache over the world as it stands, lists those objects, so a slot's ground is known by identity; the fill clears every placeholder it does not fill (C13).
- Modify: `src/mods/shop/game/loot.ts` (+ `loot.spec.ts`): `MONEY_ALLOWANCE` goes.
- Modify: `src/data/sellables.ts`: tier sell values, by Decision 20's rule.

**Interfaces:**

- Produces: the money fill. It computes the grounds, takes them smallest first, and places junk and coins in each ground's free slots until `income ≥ buyable × 1.1`. Then it fills the world up to ≈ 1.1 × all buyable. A ground with no free slot left throws, naming it and its shortfall. Completeness (≥ 1 of each sellable per tier) and the per-level spread stay.

- [ ] **Step 1: Failing tests** (`loot.spec.ts`, made-up nested grounds):
  - "the smallest ground is covered before the world";
  - "a ground with no free slot fails, naming it";
  - "a slot in a hidden section only counts toward grounds that hold the detector";
  - "no allowance is added";
  - "every placeholder the fill does not use is cleared, a puzzle slot's included" (C13).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Set the sellable values by the rule. Sinks come from the purchase table, the 13 rares' prices and Task 9's Fez waterskins (count × tier price), not from the Task 6 bake, which has neither purchases nor Fez waterskins; income per tier from the Task 6 loot report. Note the arithmetic in the task report.
- [ ] **Step 4: Run** `yarn test src/mods/shop src/worldGen` → PASS; `yarn check-types`; `yarn lint`. Do not bake.
- [ ] **Step 5: Per-task review** (Opus): the fill reads the same grounds the guard checks.
- [ ] **Step 6: Commit:** `feat: money is placed so every ground pays for its stock`

---

### Task 11: Bake 2 — animals, money and waterskins (**soundness**: the bake)

**Files (by the bake):** as Task 6, plus `src/mods/shop/game/purchases.ts` and `WATERSKINS_PER_TRAP`, changed only by the rules below.

- [ ] **Step 1: Bake:** `timeout 900 yarn generate-world`.
  - If a ground falls short and has no free slot: first lower `WATERSKINS_PER_TRAP` by 0.2 (never below 0.6). Then lower the price of the purchase in that ground closest to its gate by 50 (never below 100). Two rounds at most.
  - A purchase placement failure, a layout refusal, or a third round stops the phase (Failures).
- [ ] **Step 2: Required:**
  - `strict walk enters 29 of 29`;
  - every `Money with … bought` row has found ≥ needed;
  - `Purchases in shops` reads 7/7;
  - Fez's waterskins 14/14;
  - chests and path ends are 100 % filled;
  - hieroglyphs, mosaic, map pieces, tomb treasures, camp finds and parts are exact;
  - the loot report's trap counts per tier put master between expert and wizard, and each tier's waterskins follow its trap count by `WATERSKINS_PER_TRAP` (no number pinned here; the report shows them).
- [ ] **Step 3: Report and fingerprints:** `timeout 900 yarn loot-report`, then one review-list line per moved tier.
- [ ] **Step 4: Checks:** `timeout 900 yarn verify-content`.
- [ ] **Step 5: Commit:** `chore: bake the world with Fez's animals and money per ground`

---

### Task 12: Alle reizen shows what a gate still needs

Sonnet.

**Files:**

- Create: `src/app/pages/gateNeeds.ts`, `gateNeeds.spec.ts`.
- Modify: `src/app/pages/allJourneys.ts` (+ spec), `AllJourneysPage.tsx` (+ spec), `journeyAvailability.ts` (+ spec), `src/app/state/useDetector.ts`, `src/app/PyramidExpedition/utils.ts`.
- Modify: `src/ui/molecules/JourneyRow.tsx` and `TierHeader.tsx` (+ stories, + specs): a need's `hint`.
- Modify: `public/locales/{nl,en}/common.json` (frame strings only).

**Interfaces:**

- Produces: `registerGateNeeds(useNeeds)` and `useMergedGateNeeds(): { needs; unmet(gate, held); open(gate, held) }`, with `GateNeed = { key; label; hint? }`.
- Produces: `JourneyNeed.hint?`. `AllJourneysPage` feeds `extraNeeds`, and `tierOpen = ladder ∧ open({ tier })`. A tomb with an unmet need is not enterable. Availability and the detector take the same predicates, defaulting to open. Dev mode still opens pyramids.

- [ ] **Step 1: Failing tests** (made-up needs):
  - "a tier whose treasure is held but whose need is unmet is one locked group listing the treasure lit and the need with its hint";
  - "before the treasure is held there is no locked group";
  - "holding the need's key lists the tier's journeys";
  - "a tomb with every map piece and an unmet need stays locked and lists the need";
  - two need hooks concatenate, and no hooks means open;
  - `tierOpen` false offers no journey of that tier;
  - the hint renders under its need.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Stories: a locked tier with the treasure lit and one need with a hint; a complete tomb with a need.
- [ ] **Step 4: Run** → PASS; `yarn check-types`; `yarn lint`.
- [ ] **Step 5: Commit:** `feat: a locked tier or tomb says which animal it still needs`

---

### Task 13: Buying an animal (**soundness**: saves)

As old Task 6, with Travel read as Alle reizen.

**Files:**

- Create: `src/mods/shop/game/purchaseState.ts`, `src/mods/shop/app/usePurchases.ts` and `src/mods/shop/app/gateNeeds.ts`, each with a spec.
- Modify: `src/mods/shop/app/index.ts`, `rewardDisplay.tsx` (+ spec), the locales, and the review list's Drafts.

**Interfaces:**

- `PurchaseSave = { version: 1; purchases: string[] }`, with:
  - `recordPurchase`, which is idempotent;
  - `readPurchaseSave`;
  - `updatePurchaseSave`, which returns an unreadable value untouched;
  - `heldFacts`.
- `usePurchases()` over `useModState("shop")`.
- The `purchase` effect records the purchase; a purchase already recorded is skipped (sold out).
- Registrations:
  - the held-keys provider;
  - `registerGateNeeds`: key = the fact, label `purchases.<id>.need`, hint `purchases.hint` with the selling tomb's name;
  - the dev grant.

- [ ] **Step 1: Failing tests:**
  - recording twice records once;
  - an unknown id is kept and inert;
  - `version: 2` reads empty and is never written over;
  - a recorded fact is held through `useMergedHeldKeys`;
  - one need per opened gate with its hint, and none for the banner;
  - a purchase shows its name and what it opens, and a recorded one is skipped.
- [ ] **Steps 2–4:** FAIL → implement (words nl first) → PASS; `yarn check-types`; `yarn lint`.
- [ ] **Step 5: Per-task review** (Opus).
- [ ] **Step 6: Commit:** `feat: buying an animal from Fez opens its gate`

---

### Task 14: The animal arrives in the camp (**soundness**: saves)

As old Task 7, unchanged:

- `campSteps.ts` gets `purchase` on bought steps, plus its two new problems.
- `campState.ts` moves to v2 with `arrived` and `arrive`; a v1 save reads with no arrivals.
- `useCampProgress.ts` arrives before it grows.
- `src/mods/purchaseFacts.verify.ts` holds the shop–camp agreement.

- [ ] **Steps:** failing tests → FAIL → implement → PASS (`yarn test src/mods/camp src/app`, the verify) → `yarn check-types`, `yarn lint` (sibling rule at zero) → per-task review (Opus) → **Commit:** `feat: a bought animal waits in the camp on coming home`

---

### Task 15: The animal story beats are wired

Sonnet.

**Files:** `src/mods/story/game/reaction/storyBeats.ts` (+ spec) and `src/mods/story/game/drafts.ts` (+ spec; `drafts.spec.ts` today asserts every animal beat is waiting, which inverts). The story mod imports neither shop nor camp (C16); it reads core seams it already sees:

- `bought*` and `through*`: a held-key fact appearing (`useMergedHeldKeys`), the fact string named in the story's own data;
- `blocked*`: the gate-needs list (`useMergedGateNeeds`, Task 12) showing that fact unmet;
- `arrives*`: the homecoming seam with the fact held;
- `animal.forSale`: the first time the fact's gate need is shown (the stall has no core seam).

A beat with no core seam to read stays in `WAITING_BEATS` and goes under Failures, never wired by a sibling import.

- [ ] **Step 1: Failing tests** (made-up facts and needs): each wired animal beat fires once, at its moment; `WAITING_BEATS` lists no wired animal beat; the story mod's import list names no sibling mod.
- [ ] **Steps 2–4:** FAIL → wire → PASS; `yarn check-types`; `yarn lint`.
- [ ] **Step 5: Commit:** `feat: Fez and the explorer talk about the animals`

---

### Task 16: Docs, toggle-off, gate, look

Docs: Sonnet. The rest: Opus.

**Files:**

- `docs/game-design/keys-and-locks-solver.md`: the order becomes structure (tomb treasures, the corridor detector among them, fixed at build, C6) → layout (hard criteria) → keys (purchases included) → money as a condition → fixed loot → money; plus grounds and the stamped guard.
- `docs/game-design/world-spec-stability.md`: the layout is picked before loot, and loot moves no wall.
- `docs/game-design/journeys.md` §3: packing is an intention the search prefers, never a refusal.
- `docs/game-design/lock-placement.md`: what a lock floor's side sections stand on, and the lock-holds-a-puzzle check.
- `docs/game-design/shop-mechanic.md`.
- `docs/review-camp-release.md`.
- `docs/handover-camp-release.md`: tick phases 4 and 5, with a State line each.
- `CHANGELOG.md`: one line.
- This plan: tick the boxes.

- [ ] **Step 1: Docs**, current state only. **Commit:** `docs: layout first, grounds and the animals`
- [ ] **Step 2: Toggle-off, shop:** take `shopMod` out of `REGISTERED_MODS`, then under `timeout 900` run `yarn generate-world`, `yarn check-types`, `yarn build` and `yarn loot-report`. Expect no purchase, no Fez waterskin, no money rows, a passing guard, and every tier open. Restore with `git checkout src/mods/registeredMods.ts src/data docs/loot-report.md`, and confirm the tree is clean.
- [ ] **Step 3: Toggle-off, camp:** the same steps. Purchases and money rows stay; no camp rows appear.
- [ ] **Step 4: Gate:** under `timeout 900`, run `yarn verify`, `yarn verify-content` and `yarn build`.
- [ ] **Step 5: Look:** in Storybook and `yarn dev`:
  - holding a junior tomb treasure without the donkey, the expert group shows the treasure lit and "Je hebt een ezel nodig — Fez verkoopt er een in …";
  - buy the donkey, and the expert journeys open;
  - Fez lists two waterskins in an expert tomb shop;
  - the camp save carries `arrived`.

  Take screenshots. Anything not reachable goes under Look at in browser, with steps.
- [ ] **Step 6: Record:**
  - the decisions;
  - a "Phase 4 grounds" block (per purchase: shop, price, gate; per ground: income, buyable, margin);
  - the waterskin and price rounds;
  - the layout refusals, if any;
  - the fingerprint lines;
  - the toggle and gate results;
  - the CHANGELOG line.
  - phase 4b (locks as side-path blueprints, Decision 7) as the next phase, in `docs/handover-camp-release.md` too.

  **Commit:** `docs: phase 4 and 5 results in the review list`

---

## Open questions for the designer

None open. Answered for phase 4b: open side paths and trapped (sealed) side paths are laid into a lock's corridors, since a trap costs hearts and the player can always heal at the camp; gated and hidden sections keep hanging as branches, since a key or a detector inside a lock would make it not provably solvable (designer, 2026-10-25).
