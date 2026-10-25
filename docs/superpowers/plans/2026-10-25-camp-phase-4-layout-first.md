# Camp phase 4 (resumed) and phase 5 — layout first, keys, money, animals — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This plan says what to build, which files, and what the tests prove; it carries no code (docs/instructions/agent-work.md).

**Replaces** Tasks 3–8 of `docs/superpowers/plans/2026-10-25-camp-phase-4-animal-gates.md` (its Tasks 1–2, AND gates and the gate walk, are done and stay) and the Phase 5 brief in `docs/handover-camp-release.md`. The designer's answers to the first draft's open questions are folded in (2026-10-25).

**Goal:** The world is built in the designer's order, and the bake proves that the player can never get stuck in the world that ships.

1. The DSL fixes floors, locks, chests and puzzles.
2. Every floor's layout (`seed` + `packing`) is picked **before** any loot is placed. The layout meets **hard** criteria: it carves, every lock holds a puzzle on the way, and the sprawl knobs hold. A floor whose authoring cannot meet them fails the bake by name.
3. On that layout the worklist places keys, first blockage first: hieroglyphs, ward keys, tomb treasures, map pieces, the corridor detector, and the animals Fez sells.
4. Money is a condition, not a placement: in every ground the player can stand in, the money lying there covers everything for sale there.
5. The fixed quantities follow: mosaic pieces, camp finds and parts, waterskins, Fez's waterskins.
6. Money is placed last, so that it meets every condition from step 4.

A guard walks the **stamped** world and refuses any bake in which a journey cannot be entered, a tableau cannot be finished, or a ground is short of money. A hidden corridor counts as a gate too: what lies behind it is reachable only once the corridor detector is held. Starter is released, so its layout pins are verify-only; its loot may move. Then the animals: buying one opens its gate, Alle reizen says what a locked tier still needs, and the animal waits in the camp.

**Diagnosis (established, not re-derived):**

- Today the bake builds the world with only the wizard web floors pinned (`pinWebFloors`, `src/worldGen/webPlacement.ts:41-50`).
- It places loot (`placeFragments`, `src/worldGen/configBuilder.ts:404`) and validates it on floors carved at `defaultSeedFor` (`src/worldGen/reachability.ts:95,147,187`).
- Only then does it stamp a carve-searched `seed` + `packing` on every floor (`assembleOnce`, `scripts/generateWorld.ts:133-224`, base `floorAssemblySeed`). It re-builds only when the web moved (`bakeOnSettledPins`, `webPlacement.ts:58-77`).
- Nothing walks the stamped world. Which rooms lie before a tableau or lock depends on the carve, so pieces land behind their own gates in play. The strict walk enters 22 of 29 journeys at the shipped layout, and none of the 7 wizard journeys.
- The carve search also relaxes silently. It raises `packing` above the authored value up to `PACKING_CEILING`, and it pins a floor no pair satisfies at its base seed, carved by the ladder (fatal only under `STRICT_ATTEMPT_ZERO`).
- The gate walk treats a hidden section as open. At runtime a hidden corridor is found only with the corridor detector: the `detection` perk, L1 at the earliest (`useCorridorDetection.ts`, `treasurePerks.ts`).

**Architecture:**

1. **A layout stage inside the build.** `buildConfigs` gains an injected `pickLayout` hook. It runs after every structural pass (roles, encounters, dressing, shop stock and its trim, shop-end clearing) and before the web and placement. It writes `seed` + `packing` on every floor. The bake supplies it from the carve search and ledger. The old after-build stamp becomes a check: if loot moved a wall, the bake is refused. Released tiers' floors are verified only, never re-searched.
2. **Hard layout criteria.** The carve search adds "every lock holds a puzzle on the way" and "sprawl kept" to its five criteria. It never relaxes a criterion. An authoring that no layout can meet is reported as **infeasible**: a check on the authoring, before or without carving. An authoring the bounded search did not meet is reported as **not found in budget**. Both fail the bake, naming the floor and the criterion.
3. **The corridor detector is a key.** The reachability support names the fact a hidden section needs. The tomb-treasure mod harvests a `detection` perk treasure to the detector facts for its level and below. Placement walks, the gate walk and grounds all honour it.
4. **Keys on the shipped layout.** The worklist walks the pinned floors, so its reachability is the player's. A key is placed only in a room the walk reaches (the room-reach hunk of the shelved patch). The animals are a gating currency: each fills a stock placeholder in its named shop, and only when that shop is reached before the gate.
5. **Grounds and money.** The gate walk gains a mode in which shop stock counts as held only once bought. A core function enumerates every **ground**: a fixed point the player can stand in, given which key pieces they bought. The shop mod checks `income(ground) ≥ buyable(ground)` on each ground, its waterskins and rares included. A one-gate-at-a-time check is unsound (Decision 12).
6. **Money last.** Every distribution that places a fixed quantity runs before the money distribution. Money fills the smallest ground first until each ground is covered. The authored 1070-coin allowance goes.
7. **The stamped guard.** After the stamp, `scripts/generateWorld.ts` builds a fresh gate walk over the final configs. It refuses the bake on any unentered journey, locked tier or blocking lock. It also re-runs every mod's world validator, so the shop's ground check runs on the stamped world. A verify runs the same check over the committed `generatedWorld.ts`.
8. **The app** (old Tasks 5–7, adapted to Alle reizen): gate needs feed `allJourneys`' `extraNeeds`, the shop store records purchases as held keys, and the camp lands the animals on coming home.

**Tech Stack:** TypeScript, Vitest, React 19, Storybook, zod reward schemas, immer state models, `src/worldGen/{reachability,placeFragments,gateWalk,configBuilder,slots,slotAllocator,carveSeedSearch}.ts`, `src/game/floorLockWalk.ts`, `scripts/generateWorld.ts`, `yarn loot-report`.

**Spec:** `docs/handover-camp-release.md` (Phase 4 and Phase 5 briefs, driver rules); `docs/game-design/keys-and-locks-solver.md` (canonical order, worklist, completion pass, winnability); `docs/game-design/world-spec-stability.md` (free and structural fields, tier fingerprints); `docs/game-design/journeys.md` §3 (sprawl); `docs/superpowers/specs/2026-10-23-camp-loot-design.md` ("Bought at Fez", "No softlock"); `docs/mods/TARGET.md`; `docs/review-camp-release.md` §4 Failures (the phase-4 blocker this plan resolves).

## The purchase table (carried from the old plan; prices may move only by Task 10's rule)

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

- **Branch** `camp/home-and-loot` only. Never `git pull`, never a bare `git stash`, never switch branches. One commit per task (Task 15 commits its docs step separately). Do not push from a task; the driver pushes after the phase.
- **Core is mod-agnostic.** `src/app`, `src/ui`, `src/game`, `src/data` and `src/worldGen` never name a mod, the `purchase` reward type, an animal, a purchase id, a `purchase:` fact, money, a sellable, a waterskin or a perk. Core speaks of buckets, stock, rewards, grounds and the support's hidden-section fact. `no-restricted-imports` stays at zero, and mods import no sibling. The one file that reads both shop and camp is an aggregate verify (`src/mods/purchaseFacts.verify.ts`, or under `scripts/` if lint refuses it, never an allowlist).
- **Mods toggle off.**
  - Shop off: no purchase, no Fez stock, no money condition and no gate need, so every tier and tomb opens as before.
  - Camp off: gates and purchases work, and no animal shows anywhere.
  - Tomb-treasure off: no detector facts and no hidden-section requirement, so hidden sections walk open, as without the mod today.
  - Task 15 proves shop off and camp off with a bake, types, build and the loot report.
- **`src/ui` takes props only**, and each new or changed `src/ui` component gets or updates its story with made-up props.
- **Strings** go nl first (spoken, everyday Dutch), then en, in `public/locales/{nl,en}/`. Every draft is listed under Drafts in `docs/review-camp-release.md`.
- **Saves never overwrite what they cannot read.** A stored value whose shape or version this build does not know reads as empty and is never written over. Ids are authoring names, never indices.
- **Tests never pin authored content or real-world counts.** Specs build made-up worlds, floors, tables, saves and needs. Agreement over the real data lives in `.verify.ts` files. Count work (walks, carves, grounds), never wall-clock.
- **Comments describe the current state and why**, never history.
- **Never weaken a check or relax a layout criterion.** Never use `SKIP_ECONOMY_GUARD`, and never hand-edit a baked number: pins, rewards and fingerprints are copied from a failure message only after a deliberate bake.
- **Every bake, loot report, verify and build runs under `timeout 900`.** When a process is quiet for long, check `ps` for a hung node or vitest.
- **Commits:** one line, `type: what changed`, ≤ 72 chars, plus the session's attribution trailer.
- **Model per task:** tasks marked **soundness** are implemented by Opus and get a per-task Opus review. The others are implemented by Sonnet. The phase review at the end is Sonnet.
- **Bakes run only in Tasks 5, 10 and 15.** The other tasks do not bake. Each runs its specs, `yarn check-types` and `yarn lint`.
- **Stop rule:** two failed attempts at a task stop the phase. Write what failed under Failures, and continue with the next task that does not depend on it. A layout infeasibility in a bake is not a failed attempt: it is the designer's authoring to fix. Record it under Failures with the floor and criterion, and stop the phase.

## Review Focus

1. **The layout is picked before loot and is the layout that ships.** Placement's reachability carves every floor at the `seed` + `packing` the layout stage wrote, and the post-build check finds no floor whose grid differs from the picked one (Tasks 1, 5).
2. **Layout criteria never relax.** A floor that cannot meet one fails the bake by name. Infeasible and not-found-in-budget are told apart (Task 2).
3. **A hidden corridor is a gate.** Nothing behind it counts, for placement, the guard or money, until the detector is held (Tasks 3, 8).
4. **No piece behind its own gate.** Room-level eligibility plus the stamped guard: every journey entered, every tier unlocked and no lock blocking, on the final configs and on the committed file (Tasks 4, 5).
5. **The animals are keys.** Each is placed by the worklist into its own shop, only when that shop is reached before the gate it opens. None opens starter or junior (Task 6).
6. **The money guard is sound against any spending order.** For every reachable ground, income ≥ everything for sale in it. A property test with an exhaustive spender on made-up worlds holds it (Task 7).
7. **Money is placed last and meets every ground,** with no allowance constant (Tasks 8, 9).
8. **The app gates on the same facts.** The locked tier shows the treasure lit, plus the animal it still needs and where Fez sells it (Task 11).
9. **Purchases and arrivals are saved by id and never clobbered** (Tasks 12, 13).
10. **Toggle-off works both ways** (Task 15).

## Decisions for the review list

Each decision is **default** / alternative. Task 15 writes them under Decisions, prefixed `Phase 4 —`.

1. **The layout stage is a hook inside the build** (`pickLayout`, one pass): the carve search runs on the structural authoring, and placement then runs on the pins. / Alternative: pin every floor from the last bake and re-bake until the pins settle, which takes two or more full builds and picks the layout after a first placement.
2. **"Loot moved a wall" refuses the bake.** The post-build carve compares each floor's grid shape with the picked one, and `bakeOnSettledPins`' re-build loop goes. A web placement that moved is also a refusal. / Alternative: keep re-building until settled.
3. **Shop-end placeholder clearing moves out of `collectSlots`** into a structural pass before the layout, because an end's `endReward` presence decides floor-key hosts. / Alternative: leave it in placement and rely on Decision 2's refusal.
4. **Released tiers' pins are verify-only; their loot moves freely** (designer: starter's loot need not be frozen). `pickLayout` never searches a starter floor. A starter pin that no longer carves, or that fails a criterion, fails the bake with the floor named. It costs one flag in `pickLayout`, and it keeps released players' corridors where they walked them. / Alternative: treat starter like every other tier and let the search re-pin it.
5. **A key that fits no slot before its gate stops the bake**, naming the gate and the bucket. No layout is re-picked automatically (designer: keep the default).
6. **Hard layout criteria, two added.** The search's criteria become: carves, attempt 0, lock walks sound, **every lock holds a puzzle on the way**, no dead region, every stub holds a room, **sprawl kept**. None relaxes. `STRICT_ATTEMPT_ZERO` goes; the strict mode is the only mode. / Alternative: keep today's raise-packing and ladder fallbacks behind a flag.
7. **"Every lock holds a puzzle on the way"** means: on the lock's solving walk (`walkFloorLock`), from the first sighting of its shut door to its last control, the player passes at least one encounter room that is neither the lock's control nor its door. / Alternative: any encounter room inside the region the lock closes off.
8. **"Sprawl kept"** means the search may not raise `packing` past the floor's sprawl band:
   - A floor the DSL left tight (no `packingChance` hit and no authored `packing` above 1) must carve at its authored `packing`. It may rise at most up to just under its tier's `packingWhenHit` (default 1.6), so a tight floor never comes out broad.
   - A broad floor carves at its authored or rolled `packing`, up to + 0.2.
   - `PACKING_CEILING` stops being the search's bound.

   / Alternative: `packing` exact, seeds only.
9. **Infeasible versus not found.** The search reports one of two kinds:
   - **Infeasible** is decided on the authoring, before carving, by checks that hold for every seed. A lock whose authored sections hold no encounter on its way. A seed-independent assembler refusal (a one-way naming a missing section, a switch asking for more junctions than `forks` reserves). A tight floor whose rooms cannot fit within its band at any seed, by the assembler's own grid-size bound.

     Message: `<journey> level <n> floor <f>: infeasible — <criterion>: <authoring field and why>`.
   - **Not found** follows a bounded search: `CARVE_SEED_BUDGET` seeds × every packing rung in the band, with each criterion's refusal counts.

     Message: `<journey> level <n> floor <f>: no layout in <seeds> seeds × <rungs> packings meets "<hardest criterion>" (<counts per criterion>) — change <field> or raise the budget`.

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
18. **Waterskins follow the traps (designer's ruling).** For expert and up, each tier gets `round(WATERSKINS_PER_TRAP × traps in that tier)`, with the traps counted from the world's trap encounters at build time, never hard-coded. The trap mod authors `WATERSKINS_PER_TRAP = 1.3`, which comes to about 150 in all at today's 32 / 19 / 64 expert / master / wizard traps (≈ 42 / 25 / 83). If Task 10's bake cannot meet a ground's money, the ratio steps down by 0.2, never below 0.6. / Alternative: a flat 50 per tier, or keep 60.
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
- Modify: `src/mods/buildWorldConfigs.ts`: passes `pickLayout`; the `pinWebFloors` call goes.
- Modify: `src/worldGen/webPlacement.ts`: `pinWebFloors` and `bakeOnSettledPins` go; `placementMoved` stays for the refusal.
- Create: `src/worldGen/layoutCheck.ts`, `layoutCheck.spec.ts`.
- Modify: `scripts/generateWorld.ts`:
  - `assembleOnce` becomes the `pickLayout` implementation;
  - `RELEASED_TIERS = ["starter"]`: those floors only verify, and a failed verification exits 1, naming the floor;
  - after the build, `layoutMoved` and `placementMoved` run, and either one non-empty exits 1.

**Interfaces:**

- Produces: `PickLayout = (configs: Record<string, SiteConfig[]>) => void`, which writes `seed` and `packing` on every floor.
- Produces: `clearShopEnds`, which clears a section's `fragmentSlot` end placeholder when its end resolves to the Fez-shop family. The resolver is injected.
- Produces: `trimEmptyStock`, which drops every `undefined` stock entry.
- Produces: `gridShape(grid: FloorGrid): string`, a hash of the cells, walls and doors with rewards left out.
- Produces: `layoutMoved(picked: ReadonlyMap<string, string>, configs, carve): string[]`.
- Consumes: `searchCarvePair`, `verifyCarvePair`, the carve ledger.

- [ ] **Step 1: Failing tests** (made-up worlds and a made-up encounter resolver):
  - `configBuilder.spec.ts` "the layout hook sees the world before any loot": every end placeholder is in place, no concrete reward has been placed, shop ends are cleared and stock is trimmed.
  - `configBuilder.spec.ts` "placement carves each floor at the layout's pin": a spy resolver records each `assembleFloor` seed placement uses, and every one is the written seed.
  - `layoutCheck.spec.ts` "a placed reward moves no wall": `gridShape` is equal with placeholders and with concrete rewards.
  - `layoutCheck.spec.ts` "an end that loses its reward after the pick is named".
  - `shopStock.spec.ts`: "a shop's end placeholder is cleared before the layout", "a shop keeps only its assigned stock", and "trimming moves no wall".
  - `slots.spec.ts`: "collectSlots skips a shop end and clears nothing".
- [ ] **Step 2: Run** `yarn test src/worldGen src/mods/buildWorldConfigs` → FAIL.
- [ ] **Step 3: Implement.** Comments say why the layout precedes loot and why end presence is structural.
- [ ] **Step 4: Run** → PASS; `yarn check-types`; `yarn lint`. Do not bake.
- [ ] **Step 5: Per-task review** (Opus): no structural write after `pickLayout`; the web is read on picked floors; a released floor is never searched.
- [ ] **Step 6: Commit:** `refactor: world layout is picked before loot is placed`

---

### Task 2: Layout criteria are hard (**soundness**: world-gen layout)

**Files:**

- Modify: `src/worldGen/carveSeedSearch.ts` (+ spec): the two new criteria, the sprawl band and the two result kinds.
- Create: `src/game/lockPuzzles.ts`, `lockPuzzles.spec.ts`: on the carved grid, the locks whose solving walk passes no encounter room (Decision 7).
- Create: `src/worldGen/layoutFeasibility.ts`, `layoutFeasibility.spec.ts`: the authoring checks that hold for every seed.
- Modify: `src/worldGen/dsl.ts` / `buildSite.ts`: they record on each floor whether its `packing` came from a sprawl hit or the author (`sprawl: "tight" | "broad"`), so the band can be read. Structural, written before the layout.
- Modify: `scripts/generateWorld.ts`: `STRICT_ATTEMPT_ZERO` goes; any infeasible or not-found floor exits 1 after every floor has been tried, listing all of them; ledger entries carry the kind.
- Modify: `scripts/carveLedger.ts`: the entry carries `kind: "notFound"`.

**Interfaces:**

- Produces: `CARVE_CRITERIA` = `carves`, `attempt 0`, `lock walks sound`, `lock holds a puzzle`, `no dead region`, `every stub holds a room`, `sprawl kept`.
- Produces: `sprawlBand(floor, tierPackingWhenHit): { min: number; max: number }`.
- Produces: `layoutInfeasible(floor, resolve): { criterion: CarveCriterion; detail: string }[]`, with no carve.
- Produces: `searchCarvePair` returns `CarvePairFound | { kind: "notFound"; hardest; counts: Record<CarveCriterion, number>; seeds; rungs }`. The caller asks `layoutInfeasible` first and reports `{ kind: "infeasible"; criterion; detail }` without searching.
- Produces: `lockWithoutPuzzle(grid): string[]` (lock instance names).

- [ ] **Step 1: Failing tests** (made-up floors):
  - `layoutFeasibility.spec.ts` "a lock whose sections hold no encounter is infeasible before any carve": an injected assembler counts **0** carves, and the message names the lock and `lock holds a puzzle`.
  - `layoutFeasibility.spec.ts` "a one-way naming a missing section is infeasible".
  - `carveSeedSearch.spec.ts` "a criterion no seed in budget meets is not found": with a made-up assembler that fails `no dead region` on every seed and a budget of 3 seeds × 2 rungs, the result is `notFound` with 6 tries, the hardest criterion, and its count.
  - `carveSeedSearch.spec.ts` "a floor that passes on the third seed is found at offset 2".
  - `carveSeedSearch.spec.ts` "packing never leaves the band": a tight floor's search asks no packing ≥ its tier's `packingWhenHit`, and a broad floor none above authored + 0.2 (counted through the injected assembler).
  - `carveSeedSearch.spec.ts` "no fallback pin": a not-found floor gets no seed written.
  - `lockPuzzles.spec.ts`: "a lock whose way passes a puzzle room passes", and "a lock whose control is the only room on its way is named".
- [ ] **Step 2: Run** `yarn test src/worldGen/carveSeedSearch src/worldGen/layoutFeasibility src/game/lockPuzzles` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Measure, without baking:** run the layout stage alone (a scratch script over the committed configs). List every floor that is now infeasible or not found, with its message, under Failures in the review list. This is what Task 5's bake will refuse, so the designer sees it before the bake.
- [ ] **Step 5: Run** → PASS; `yarn check-types`; `yarn lint`.
- [ ] **Step 6: Per-task review** (Opus): no relaxation path is left; infeasible is only claimed for checks that hold for every seed; the band follows the DSL.
- [ ] **Step 7: Commit:** `feat: a floor's layout meets every criterion or the bake names it`

---

### Task 3: A hidden corridor needs the corridor detector (**soundness**: reachability)

**Files:**

- Modify: `src/worldGen/reachability.ts` (+ spec): `ReachabilitySupport.hiddenRequirement`. The strict and placement walks treat a hidden cell as walkable only while that fact is held, and record the requirement as a discovered lock.
- Modify: `src/game/siteValidator.ts` (+ spec): `reachableFrom` takes a `hiddenOpen: boolean`.
- Modify: `src/worldGen/gateWalk.ts` (+ spec): the walk honours it.
- Modify: `src/worldGen/placeFragments.ts`: `mergeReachabilitySupport` takes the one `hiddenRequirement` (two mods naming one is a build error).
- Modify: `src/mods/tombTreasure/game/reachabilitySupport.ts` (+ spec): `detector:corridor:<k>` facts from `detection` perk treasures, and the hidden requirement.

**Interfaces:**

- Produces: `hiddenRequirement?: () => string`. With no support naming one, hidden cells walk open, as today.

- [ ] **Step 1: Failing tests** (made-up worlds):
  - `gateWalk.spec.ts` "a reward in a hidden section is out of the ground until the detector fact is held, and in once a reached treasure grants it".
  - `reachability.spec.ts` "a key is never placed in a hidden section before the detector is reachable".
  - `reachability.spec.ts` "with no hidden requirement a hidden section walks open".
  - tombTreasure support spec: "a level-2 detection treasure grants levels 1 and 2".
  - `placeFragments.spec.ts`: "two supports naming a hidden requirement fail the merge".
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS; `yarn check-types`; `yarn lint`.
- [ ] **Step 5: Per-task review** (Opus): the runtime rule matches (L1 is what lets the player stand on a hidden junction); the permissive walk is unchanged; core names no perk.
- [ ] **Step 6: Commit:** `feat: hidden corridors count only once the corridor detector is held`

---

### Task 4: Room reach and the guard on the stamped world (**soundness**: reachability)

**Files:**

- Apply: the `slots.ts`, `placeFragments.ts` and `placeFragments.spec.ts` hunks of `.superpowers/sdd/2026-10-25-camp-phase-4-animal-gates/task-2b-room-reach-and-walk-guard.patch`. Fit the spec's `demandFor` to the full `CurrencyDemand`, as Task 2c did.
- Modify: `src/worldGen/validate.ts` (+ spec): `stuckPoints`, which generalises the patch's `validateWalkEntersEveryJourney`.
- Modify: `src/worldGen/gateWalk.ts` (+ spec): the walk passes `resolveOneWay`, `resolveRegionBarrier` and `resolvePassage` from the support.
- Modify: `scripts/generateWorld.ts`: after the stamp, a fresh walk over the final configs, then `stuckPoints` and every `worldValidators` entry on it. Any failure exits 1.
- Create: `src/data/worldWinnable.verify.ts`: the same check over the committed `generatedWorld.ts`, run by `yarn verify-content`.

**Interfaces:**

- Produces: `stuckPoints(walk: GateWalk, journeyMeta): string[]`, one line each for an unentered journey, a locked tier and a blocking lock (the bucket and where it stands).

- [ ] **Step 1: Failing tests** (made-up worlds):
  - from the patch: "a slot behind a room needing the made-up glyph is skipped for another journey's end";
  - "a key on a shop's end leaves its journey unentered and is named";
  - "a world whose every lock opens has no stuck points";
  - "a tier whose only group's bucket is nowhere is named locked";
  - "a one-way door is walked as the support resolves it";
  - "a journey reachable only through a hidden corridor with no detector anywhere is named".
- [ ] **Step 2: Run** `yarn test src/worldGen src/data` → FAIL.
- [ ] **Step 3: Implement.** The script prints `strict walk enters N of M journeys` on success.
- [ ] **Step 4: Run** → PASS; `yarn check-types`; `yarn lint`.
- [ ] **Step 5: Per-task review** (Opus): final configs, a fresh cache, nothing withheld; messages name a target, never a fix.
- [ ] **Step 6: Commit:** `feat: the bake refuses a stamped world the player can get stuck in`

---

### Task 5: Bake 1 — the world on its picked layout (**soundness**: the bake)

**Files (by the bake):** `src/data/generatedWorld.ts`, `src/data/carveLedger.json`, `src/data/tierFingerprints.json` (moved tiers, deliberately), `docs/loot-report.md`, `docs/review-camp-release.md`, `.betterer.results` (re-key only).

- [ ] **Step 1: Before:** `timeout 900 yarn loot-report` on the committed bake, with its totals kept in the scratchpad. Copy the starter pins out with a scratch script.
- [ ] **Step 2: Bake:** `timeout 900 yarn generate-world`.
  - If it refuses on layout (infeasible or not found), stop the phase. The floors and criteria go under Failures for the designer's authoring, which Task 2 already listed.
  - Otherwise it must:
    - print `strict walk enters 29 of 29 journeys`;
    - report no "loot moved a wall" and no "web moved";
    - place hieroglyphs 296/296;
    - leave 0 empty chests;
    - keep every currency total.
- [ ] **Step 3: Starter pins:** the scratch diff of starter `seed`/`packing` is empty. For every tier whose fingerprint moved, starter included (its loot may move), copy the hash and write one review-list line saying why.
- [ ] **Step 4: Report:** `timeout 900 yarn loot-report`. Totals are exact, and the slot mix and hidden-pocket keys move.
- [ ] **Step 5: Checks:** `timeout 900 yarn verify-content` (includes `worldWinnable.verify.ts`) and `timeout 900 yarn verify`.
- [ ] **Step 6: Review list:** the phase-4 blocker moves from Failures to resolved, with the walk counts (22/29 → 29/29 shipped) and how many floors moved pin.
- [ ] **Step 7: Commit:** `chore: bake the world with loot placed on its picked layout`

---

### Task 6: The animals are keys (**soundness**: world-gen placement)

**Files:**

- Create: `src/mods/shop/game/purchases.ts`, `purchaseCurrency.ts` and `reachabilitySupport.ts`, each with a spec.
- Modify: `src/mods/shop/game/rewardSchemas.ts`, `pricing.ts` (+ spec), `src/mods/shop/index.ts` (`shopStock`, `currencies`, `reachabilitySupport`).

**Interfaces:**

- Produces: `Purchase = { id; fact; price; soldAt: { journeyId; nth? }; opens?: { tier } | { journeyId } }`, `PURCHASES` and `purchaseFact(id)`.
- Produces: `purchaseProblems(table, tombIds)`, which reports a duplicate, a bad fact, a bad price, a non-tomb shop, two purchases on one gate, or a purchase opening starter or junior.
- Produces: `requirementsFor(table)`.
- Produces: `purchaseRewardSchema = { type: "purchase"; id }`; `priceFor` prices a purchase flat from the table.
- Produces: `purchaseCurrency(table): CurrencyDistribution`. It owns every purchase fact, and its demand is one `{ type: "purchase", id }`. `eligible` is a hard filter: only a slot whose `preference` is that fact. `allBuckets` lists every fact, so the banner is placed.
- Produces: `SHOP_REACHABILITY`, which maps a purchase to its fact and supplies `tierUnlockGroups` / `journeyEntryLocks`.

- [ ] **Step 1: Failing tests** (made-up tables and worlds):
  - every problem is reported once and named;
  - "a purchase lands in its own shop's placeholder";
  - "a purchase whose shop lies behind the gate it opens fails the build, naming both";
  - "a purchase that opens nothing is still placed by the completion pass";
  - "no other currency takes a purchase placeholder";
  - a purchase is priced from a made-up table at every tier.
- [ ] **Step 2: Run** `yarn test src/mods/shop src/worldGen` → FAIL. **Step 3: Implement.** Do not bake. **Step 4: Run** → PASS; `yarn check-types`; `yarn lint`.
- [ ] **Step 5: Per-task review** (Opus): the gate is the frontier when the purchase is placed; core reads no reward type; nothing gates starter → junior.
- [ ] **Step 6: Commit:** `feat: Fez's animals are keys placed before the gates they open`

---

### Task 7: Grounds and the money guard (**soundness**: the economy guard, reachability)

**Files:**

- Modify: `src/worldGen/gateWalk.ts` (+ spec): the `holding` mode.
- Create: `src/worldGen/grounds.ts`, `grounds.spec.ts`.
- Create: `src/mods/shop/game/moneyLedger.ts`, `moneyLedger.spec.ts`.
- Modify: `src/mods/shop/game/economyGuard.ts` (+ spec) and `lootTotals.ts` (+ spec).

**Interfaces:**

- Produces: `GateWalk.holding(bought: ReadonlySet<TreasureReward>): GateWalkResult & { stock: readonly TreasureReward[] }`. Shop stock harvests only when bought (by identity). Room rewards harvest as before, the hidden requirement included. Memoised per set.
- Produces: `reachableGrounds(walk, { isKey, cap }): { grounds: Ground[] } | { overCap: number }`, with `Ground = { bought; rewards; stock }`. It searches breadth-first from ∅, buying one key piece in `stock` at a time, and deduplicates grounds by the rewards reached. Key pieces are purchases, hieroglyph pieces and the map piece; Fez's waterskins and rares are stock, never keys.
- Produces (shop): `moneyLedger(grounds, priceFor, incomeOf): MoneyRow[]`, each row `{ label: the key pieces bought; income; buyable; margin }`.
- Produces (shop): `purchasePlacementProblems(walk, table)`.
- Produces (shop): `runEconomyGuard(configs, reachable, walk)`. It throws on placement problems, on any negative margin (naming the ground, income, buyable and shortfall), and on `overCap`. The global-only check goes; the last ground is the world.
- Produces: loot-report rows `Money with <bought> bought` and `Purchases in shops`.

- [ ] **Step 1: Failing tests** (made-up worlds and tables):
  - `grounds.spec.ts`:
    - "buying a key that opens nothing new adds no ground";
    - "two independent keys give four grounds";
    - "over the cap returns the count";
    - "walks ≤ grounds × key pieces" (counted).
  - `moneyLedger.spec.ts`:
    - the Decision 12 counterexample: the old one-withheld rows pass, and the guard refuses, naming the ground "A bought";
    - **"money behind a hidden corridor does not cover a purchase until the detector is held"**: a made-up world where the only money that pays for a key in a shop lies in a hidden section, and the detector treasure lies behind that key. The guard refuses, naming the ground. Moving the detector treasure before the shop makes it pass;
    - "Fez's waterskins count as buyable in their ground and never open anything";
    - a property test over 200 seeded made-up worlds (≤ 3 shops, ≤ 4 key pieces, ≤ 3 rares, ≤ 1 hidden section). On every world the guard passes, an exhaustive spender (every buy order) never ends with an unbought visible key it cannot afford.
  - `economyGuard.spec.ts`: a purchase stocked twice, or missing, throws naming it.
  - `lootTotals.spec.ts`: the rows equal `moneyLedger`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** The top comment of `grounds.ts` says what a ground is and why every one is checked. **Step 4: Run** → PASS; `yarn check-types`; `yarn lint`. Do not bake.
- [ ] **Step 5: Per-task review** (Opus): the soundness argument holds in code; no money word in core; the property test can fail (break the guard locally and see it go red).
- [ ] **Step 6: Commit:** `feat: the economy guard checks every ground a player can stand in`

---

### Task 8: Fixed quantities before money, Fez's waterskins (**soundness**: world-gen placement)

**Files:**

- Modify: `src/worldGen/slotAllocator.ts`, `src/worldGen/placeFragments.ts` (+ specs): `Distribution.fillsLast?: true`, and distributions that fill last run after every other one.
- Modify: the trap mod's waterskin distribution. Per tier, `round(WATERSKINS_PER_TRAP × that tier's trap encounters)` (Decision 18), expert and up. The trap mod's `shopStock` gets 2 `prefers: waterskin` placeholders per expert-and-up tomb shop, filled by the same distribution (Decision 16).
- Modify: `src/mods/shop/game/pricing.ts` (+ spec): the waterskin stock price by tier.
- Modify: `src/mods/shop/game/loot.ts`: `fillsLast: true`.

- [ ] **Step 1: Failing tests** (made-up worlds):
  - `placeFragments.spec.ts`: "a distribution marked last fills after one registered after it".
  - "waterskins follow the traps per tier": with 2 / 0 / 10 traps on expert / master / wizard and a made-up ratio, the counts come out in that proportion, with none on a tier without traps or below expert.
  - "a tomb shop's waterskin placeholders are filled with waterskins and priced by its tier".
  - "no waterskin in a junior or starter shop".
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS; `yarn check-types`; `yarn lint`.
- [ ] **Step 5: Per-task review** (Opus, light): ordering is mod-agnostic, and the shop prices a reward type it does not import.
- [ ] **Step 6: Commit:** `feat: fixed loot fills before money, Fez sells waterskins`

---

### Task 9: Money is placed to meet every ground (**soundness**: the economy guard)

**Files:**

- Modify: `src/worldGen/slotAllocator.ts`, `src/worldGen/placeFragments.ts`: a distribution's `fill` gets `ctx: { walk: GateWalk }`. The walk is built with a fresh cache over the world as it stands once every earlier distribution has filled, and it lists the remaining placeholder objects, so a slot's ground is known by identity.
- Modify: `src/mods/shop/game/loot.ts` (+ `loot.spec.ts`): `MONEY_ALLOWANCE` goes.
- Modify: `src/data/sellables.ts`: tier sell values, by Decision 20's rule.

**Interfaces:**

- Produces: the money fill. It computes the grounds, takes them smallest first, and places junk and coins in each ground's free slots until `income ≥ buyable × 1.1`. Then it fills the world up to ≈ 1.1 × all buyable. A ground with no free slot left throws, naming it and its shortfall. Completeness (≥ 1 of each sellable per tier) and the per-level spread stay.

- [ ] **Step 1: Failing tests** (`loot.spec.ts`, made-up nested grounds):
  - "the smallest ground is covered before the world";
  - "a ground with no free slot fails, naming it";
  - "a slot in a hidden section only counts toward grounds that hold the detector";
  - "no allowance is added".
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Set the sellable values by the rule, using a scratch measurement on the Task 5 bake noted in the report.
- [ ] **Step 4: Run** `yarn test src/mods/shop src/worldGen` → PASS; `yarn check-types`; `yarn lint`. Do not bake.
- [ ] **Step 5: Per-task review** (Opus): the fill reads the same grounds the guard checks.
- [ ] **Step 6: Commit:** `feat: money is placed so every ground pays for its stock`

---

### Task 10: Bake 2 — animals, money and waterskins (**soundness**: the bake)

**Files (by the bake):** as Task 5, plus `src/mods/shop/game/purchases.ts` and `WATERSKINS_PER_TRAP`, changed only by the rules below.

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
  - starter pins are unchanged.
- [ ] **Step 3: Report and fingerprints:** `timeout 900 yarn loot-report`, then one review-list line per moved tier.
- [ ] **Step 4: Checks:** `timeout 900 yarn verify-content`.
- [ ] **Step 5: Commit:** `chore: bake the world with Fez's animals and money per ground`

---

### Task 11: Alle reizen shows what a gate still needs

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

### Task 12: Buying an animal (**soundness**: saves)

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

### Task 13: The animal arrives in the camp (**soundness**: saves)

As old Task 7, unchanged:

- `campSteps.ts` gets `purchase` on bought steps, plus its two new problems.
- `campState.ts` moves to v2 with `arrived` and `arrive`; a v1 save reads with no arrivals.
- `useCampProgress.ts` arrives before it grows.
- `src/mods/purchaseFacts.verify.ts` holds the shop–camp agreement.

- [ ] **Steps:** failing tests → FAIL → implement → PASS (`yarn test src/mods/camp src/app`, the verify) → `yarn check-types`, `yarn lint` (sibling rule at zero) → per-task review (Opus) → **Commit:** `feat: a bought animal waits in the camp on coming home`

---

### Task 14: The animal story beats are wired

Sonnet.

**Files:** `src/mods/story/game/reaction/storyBeats.ts` (+ spec) and `src/mods/story/game/drafts.ts` (+ spec). The seams are the ones the drafts name: `animal.forSale`, `bought*`, `blocked*`, `through*` and `arrives*`.

- [ ] **Step 1: Failing tests** (made-up seams): each animal beat fires once, at its moment; `WAITING_BEATS` lists no animal beat.
- [ ] **Steps 2–4:** FAIL → wire → PASS; `yarn check-types`; `yarn lint`.
- [ ] **Step 5: Commit:** `feat: Fez and the explorer talk about the animals`

---

### Task 15: Docs, toggle-off, gate, look

Docs: Sonnet. The rest: Opus.

**Files:**

- `docs/game-design/keys-and-locks-solver.md`: the order becomes layout (hard criteria) → keys (detector and purchases included) → money as a condition → fixed loot → money; plus grounds and the stamped guard.
- `docs/game-design/world-spec-stability.md`: released pins, and loot moves no wall.
- `docs/game-design/journeys.md` §3: sprawl as a hard band.
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

  **Commit:** `docs: phase 4 and 5 results in the review list`

---

## Open questions for the designer

1. **Sprawl band values (Decision 8):** may a tight floor rise up to just under its tier's `packingWhenHit`, and a broad one by + 0.2? Or should `packing` be exact, seeds only? The exact rule may refuse many of today's 29 raised floors. Task 2's measurement (Step 4) lists them before any bake.
2. **"A lock holds a puzzle on the way" (Decision 7):** is the lock's solving walk, from first sight of its door to its last control, the right stretch? Or any encounter inside the region the lock closes?
