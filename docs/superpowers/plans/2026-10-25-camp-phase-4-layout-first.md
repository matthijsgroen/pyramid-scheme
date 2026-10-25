# Camp phase 4 (resumed) and phase 5 — layout first, keys, money, animals — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This plan says what to build, which files, and what the tests prove; it carries no code (docs/instructions/agent-work.md).

**Replaces** Tasks 3–8 of `docs/superpowers/plans/2026-10-25-camp-phase-4-animal-gates.md` (its Tasks 1–2, AND gates and the gate walk, are done and stay) and the Phase 5 brief in `docs/handover-camp-release.md`.

**Goal:** The world is built in the designer's order, and the bake proves the player can never get stuck in the world that ships. (1) The DSL fixes floors, locks, chests and puzzles. (2) Every floor's layout (`seed` + `packing`) is picked **before** any loot is placed. (3) On that layout the worklist places keys, first blockage first: hieroglyphs, ward keys, tomb treasures, map pieces, and the animals Fez sells. (4) Money is a condition, not a placement: "in every ground the player can stand in, the money lying there covers everything for sale there". (5) The fixed quantities follow: mosaic pieces, camp finds and parts, waterskins. (6) Money is placed last, so that it meets every condition from step 4. A guard walks the **stamped** world and refuses any bake in which a journey cannot be entered, a tableau cannot be finished or a ground is short of money. Starter is released, so its layout and its loot stay exactly as they are. Then the animals: buying one opens its gate, Alle reizen says what a locked tier still needs, and the animal waits in the camp.

**Diagnosis (established, not re-derived):** today the bake builds the world (only wizard web floors pinned, `pinWebFloors`, `src/worldGen/webPlacement.ts:41-50`). It places loot (`placeFragments`, `src/worldGen/configBuilder.ts:404`) and validates it, on floors carved at `defaultSeedFor` (`src/worldGen/reachability.ts:95,147,187`). Only then does it stamp a carve-searched `seed` + `packing` on every floor (`assembleOnce`, `scripts/generateWorld.ts:133-224`, base `floorAssemblySeed`). It re-builds only when the web moved (`bakeOnSettledPins`, `webPlacement.ts:58-77`), and nothing walks the stamped world. Which rooms lie before a tableau or lock depends on the carve, so pieces land behind their own gates in play. For example, art6's last piece sits in the expert_treasure_tomb_b level 2 shop, behind that floor's tableau, which needs art6. The strict walk enters 22 of 29 journeys at the shipped layout and none of the 7 wizard journeys (`.superpowers/sdd/2026-10-25-camp-phase-4-animal-gates/task-2b-report.md`, `task-2c-report.md`).

**Architecture:**

1. **A layout stage inside the build.** `buildConfigs` gains an injected `pickLayout` hook. It runs after every structural pass (roles, encounters, dressing, shop stock, shop-end clearing) and before the web and placement. It writes `seed` + `packing` on every floor. The bake supplies it from today's carve search and ledger. The old after-build stamp becomes a check: if loot moved a wall, the bake is refused.
2. **Frozen tiers.** A bake input names the released tiers (`starter`). Their floors keep their pins from the last bake, verify-only. Every reward slot of theirs takes the last bake's reward as a literal before placement. Currencies net those literals out, and money in them counts as income.
3. **Keys on the shipped layout.** The worklist walks the pinned floors, so its reachability is the player's. A key is placed only in a room the walk reaches (the room-reach hunk of the shelved patch). The animals are a gating currency: each fills a stock placeholder in its named shop, and only when that shop is reached before the gate.
4. **Grounds and money.** The gate walk gains a mode in which shop stock counts as held only when bought. A core function enumerates every **ground**: a fixed point the player can stand in, given which key pieces they bought. The shop mod checks `income(ground) ≥ buyable(ground)` on each ground. A one-gate-at-a-time check is unsound (Decision 10).
5. **Money last.** Every distribution that places a fixed quantity runs before the money distribution. Money fills the smallest ground first until each ground is covered. The authored 1070-coin allowance goes.
6. **The stamped guard.** After the stamp, `scripts/generateWorld.ts` builds a fresh gate walk over the final configs. It refuses the bake on any unentered journey, any locked tier or any blocking lock. It also re-runs every mod's world validator, so the shop's ground check runs on the stamped world too. A verify runs the same check over the committed `generatedWorld.ts`.
7. **The app** (old Tasks 5–7, adapted to Alle reizen): gate needs feed `allJourneys`' `extraNeeds`, the shop store records purchases as held keys, and the camp lands the animals on coming home.

**Tech Stack:** TypeScript, Vitest, React 19, Storybook, zod reward schemas, immer state models, `src/worldGen/{reachability,placeFragments,gateWalk,configBuilder,slots,slotAllocator}.ts`, `src/worldGen/carveSeedSearch.ts`, `scripts/generateWorld.ts`, `yarn loot-report`.

**Spec:** `docs/handover-camp-release.md` (Phase 4 and Phase 5 briefs, driver rules); `docs/game-design/keys-and-locks-solver.md` (canonical order, worklist, completion pass, winnability); `docs/game-design/world-spec-stability.md` (free and structural fields, tier fingerprints); `docs/superpowers/specs/2026-10-23-camp-loot-design.md` ("Bought at Fez", "No softlock"); `docs/mods/TARGET.md`; `docs/review-camp-release.md` §4 Failures (the phase-4 blocker this plan resolves).

## The purchase table (carried from the old plan; prices may move only by Task 9's rule)

| Purchase id     | Fact                     | Sold at (first Fez shop) | Opens                                  | Camp steps                       | Price |
| --------------- | ------------------------ | ------------------------ | -------------------------------------- | -------------------------------- | ----- |
| `donkey`        | `purchase:donkey`        | `junior_treasure_tomb`   | tier `expert`                          | `halter`, `donkey`, `saddlebags` | 200   |
| `cart`          | `purchase:cart`          | `expert_treasure_tomb`   | tier `master`                          | `cart`                           | 300   |
| `camel`         | `purchase:camel`         | `expert_treasure_tomb`   | journey `expert_treasure_tomb_b`       | `camel`, `waterTrough`           | 250   |
| `secondDonkey`  | `purchase:secondDonkey`  | `master_treasure_tomb`   | tier `wizard`                          | `secondDonkey`                   | 250   |
| `secondCamel`   | `purchase:secondCamel`   | `master_treasure_tomb`   | journey `master_treasure_tomb_b`       | `secondCamel`                    | 250   |
| `sturdyCart`    | `purchase:sturdyCart`    | `wizard_treasure_tomb`   | journey `wizard_treasure_tomb_b`       | `paintedCart`                    | 400   |
| `caravanBanner` | `purchase:caravanBanner` | `wizard_treasure_tomb_c` | nothing                                | `caravanBanner`                  | 500   |

## Global Constraints

- **Branch** `camp/home-and-loot` only. Never `git pull`, never a bare `git stash`, never switch branches. One commit per task (Task 14 commits its docs step separately). Do not push from a task; the driver pushes after the phase.
- **Core is mod-agnostic.** `src/app`, `src/ui`, `src/game`, `src/data`, `src/worldGen` never name a mod, the `purchase` reward type, an animal, a purchase id, a `purchase:` fact, money or a sellable. Core speaks of buckets, stock, rewards and grounds. `no-restricted-imports` stays at zero; mods import no sibling. The one file that reads both shop and camp is an aggregate verify (old plan's rule: `src/mods/purchaseFacts.verify.ts`, or under `scripts/` if lint refuses it, never an allowlist).
- **Mods toggle off.** Shop off: no purchase in the world, no purchase requirement, no money condition, no gate need, so every tier and tomb opens as before. Camp off: gates and purchases work, and no animal shows anywhere. Task 14 proves both with a bake, types, build and the loot report.
- **`src/ui` takes props only**, and each new or changed `src/ui` component gets or updates its story with made-up props.
- **Strings** nl first (spoken, everyday Dutch), then en, in `public/locales/{nl,en}/`. Every draft is listed under Drafts in `docs/review-camp-release.md`.
- **Saves never overwrite what they cannot read.** A stored value whose shape or version this build does not know reads as empty and is never written over. Ids are authoring names, never indices.
- **Tests never pin authored content or real-world counts.** Specs build made-up worlds, tables, saves and needs. Agreement over the real data lives in `.verify.ts` files. Count work (walks, carves, states), never wall-clock.
- **Comments describe the current state and why**, never history.
- **Never weaken a check, never `SKIP_ECONOMY_GUARD`, never hand-edit a baked number** (pins, rewards, fingerprints are copied from a failure message only after a deliberate bake).
- **Every bake, loot report, verify and build runs under `timeout 900`.** When a process is quiet for long, check `ps` for a hung node or vitest.
- **Commits:** one line, `type: what changed`, ≤ 72 chars, plus the session's attribution trailer.
- **Model per task:** tasks marked **soundness** are implemented by Opus and get a per-task Opus review. The others are implemented by Sonnet. The phase review at the end is Sonnet.
- **Bakes run only in Tasks 4, 9 and 14.** Tasks 1–3 and 5–8 do not bake. Each runs its specs, `yarn check-types` and `yarn lint`.
- **Stop rule:** two failed attempts at a task stop the phase. Write what failed under Failures and continue with the next task that does not depend on it.

## Review Focus

1. **The layout is picked before loot and is the layout that ships.** Placement's reachability carves every floor at the `seed` + `packing` the layout stage wrote. The post-build check finds no floor whose grid differs from the picked one (Tasks 1, 4).
2. **Starter does not move.** Its pins are verify-only, its rewards are carried as literals, and its tier fingerprint and pins are byte-identical after every bake (Tasks 2, 4, 9).
3. **No piece behind its own gate.** Room-level eligibility, plus the stamped guard: every journey entered, every tier unlocked, no lock blocking, on the final configs and on the committed file (Tasks 3, 4).
4. **The animals are keys.** Each is placed by the worklist into its own shop, only when that shop is reached before the gate it opens. None opens starter or junior (Task 5).
5. **The money guard is sound against any spending order.** For every reachable ground, income ≥ everything for sale in it. A property test with an exhaustive spender on made-up worlds holds it (Task 6).
6. **Money is placed last and meets every ground**, with no allowance constant (Tasks 7, 8).
7. **The app gates on the same facts**, and the locked tier shows the treasure lit plus the animal it still needs and where Fez sells it (Task 10).
8. **Purchases and arrivals are saved by id and never clobbered** (Tasks 11, 12).
9. **Toggle-off both ways** (Task 14).

## Decisions for the review list

Each decision is listed as **default** / alternative. Task 14 writes them under Decisions, prefixed `Phase 4 —`.

1. **The layout stage is a hook inside the build** (`pickLayout`, one pass). The carve search runs on the structural authoring, and placement then runs on the pins. / Alternative: pin every floor from the last bake and re-bake until the pins settle (extend `bakeOnSettledPins`). That is two or more full builds, and the layout is still chosen after a first placement.
2. **"Loot moved a wall" refuses the bake.** The post-build carve compares each floor's grid shape with the picked one. `bakeOnSettledPins`' re-build loop goes. A web placement that moved is also a refusal, since the web is read on picked floors. / Alternative: keep re-building until settled.
3. **Shop-end placeholder clearing moves out of `collectSlots`** into a structural pass before the layout, because an end's `endReward` presence decides floor-key hosts (world-spec-stability, "Removing a section's endReward"). / Alternative: leave it in placement and rely on Decision 2's refusal.
4. **Frozen tiers carry pins and loot.** Starter's `seed`/`packing` are verify-only (a pin that no longer carves stops the bake, and starter is never re-searched). Every starter reward slot takes the last bake's reward as a literal. / Alternative: freeze only the pins and let starter's loot re-place (its fingerprint moves; the review list says why). Kept as open question 3.
5. **A key that fits no slot before its gate stops the bake**, naming the gate and the bucket (exhausted relaxation, keys-and-locks-solver.md). No automatic layout re-pick. / Alternative: re-pick that floor's layout (next seed) and place again. Open question 2.
6. **Room-level eligibility is applied again** (the `slots.ts`, `placeFragments.ts` and `placeFragments.spec.ts` hunks of `task-2b-room-reach-and-walk-guard.patch`). On the shipped layout it is sound, which it was not before. / Alternative: floor-level eligibility plus the guard alone.
7. **The stamped guard runs in `scripts/generateWorld.ts` after the stamp, and as a verify over the committed world.** It re-runs every mod's world validator on a fresh walk. / Alternative: only inside `buildConfigs` (blind to the stamp).
8. **A purchase is a gating currency.** The shop places one stock placeholder per purchase (`prefers: purchase:<id>`) in its named shop. The worklist fills it when the purchase's gate is the frontier and refuses when that shop is not reached. The completion pass places the banner. / Alternative: place each purchase as concrete stock before the worklist and only check afterwards (old Decision 2).
9. **The purchase table, shops and prices carry over** from the old plan (table above). / Alternative: price them like the rare stock (500–1000).
10. **A money moment is a reachable ground, not a withheld gate.** A ground is a fixed point from empty hands in which shop stock counts only once bought. The grounds are enumerated breadth-first by buying one key piece at a time and deduplicated by the set of rewards reached. The check is `income(R) ≥ buyable(R)` for every ground R. This is sound: a stuck player at R with an unbought key K has spent at most `buyable(R) − price(K)`. The old one-gate-withheld check is unsound. Made-up counterexample: start income 100, keys A, B, C at 50 each; A opens a room with a 50-coin mosaic and no money; B and C each open 1000 coins. Every one-withheld walk passes, but buying A and then the mosaic strands the player. / Alternative: the old per-gate rows (cheaper, unsound); or count only key stock as buyable (unsound when the player spends on rares first).
11. **The ground enumeration is capped at 4096 grounds.** Over the cap, the bake refuses and names the count. / Alternative: no cap.
12. **Hidden-pocket money counts as income** (old Decision 4). / Alternative: exclude it. Open question 1.
13. **Money runs last by a flag:** `Distribution.fillsLast` (mod-agnostic). Every other dynamic distribution fills before it. / Alternative: rely on registry order.
14. **A shop has no empty stock slot.** Stock arrays are trimmed to what was assigned, right after `placeShopStock`, before the layout. / Alternative: fill the 28 spare slots with sellables for sale.
15. **Waterskins go back to 50 per tier (150).** If Task 9's bake cannot meet a ground's money, they step down by 10 per tier, never below 20. / Alternative: keep 60.
16. **Sellables: the same 25 kinds, more and dearer.** The tier sell values in `src/data/sellables.ts` are raised once, so that world income ≈ 1.1 × sinks (13 rares + 7 purchases). `PER_ITEM_CAP` is raised only if the fill needs more drops. The fill varies drop counts per ground, never per-drop values. / Alternative: new sellable ids at new values.
17. **`MONEY_ALLOWANCE` goes.** The budget is each ground's need plus a 10 % margin, and then the world up to ≈ 1.1 × sinks. / Alternative: keep an allowance.
18. **A need line can carry a hint.** `JourneyNeed.hint` is shown under the label. The locked tier group (shown only when `tierKeyHeld`) lists the tier treasure lit and "Je hebt een ezel nodig" with "Fez verkoopt er een in <tomb>". / Alternative: the place inside the label.
19. **Carried unchanged from the old plan:** a purchase opens its gate at once and the animal arrives on the next homecoming (old 8); the catalogue's steps land (old 9); the camp learns through held keys (old 10); camp save v2 with `arrived` (old 11); a shop store `{ version: 1, purchases }` (old 12); purchases in Fez's one buy list (old 16); emoji 🫏 🐪 🛞 🚩 (old 17); toggle-off semantics (old 18); dev grant "Koop alle dieren" (old 21).

---

### Task 1: The layout is picked before placement (**soundness**: world-gen layout)

**Files:**

- Modify: `src/worldGen/configBuilder.ts` (+ its spec): the `pickLayout` option, called after Phase 3.6 and the new shop-end pass, before 3.65 (web) and Phase 4 (placement).
- Modify: `src/worldGen/slots.ts`, `src/worldGen/slots.spec.ts`: `collectSlots` no longer clears shop ends; it only skips them.
- Modify: `src/worldGen/shopStock.ts` (+ `shopStock.spec.ts`): `clearShopEnds(configs, resolveEncounter)`, a structural pass.
- Modify: `src/mods/buildWorldConfigs.ts`: passes `pickLayout`; the `pinWebFloors` call goes.
- Modify: `src/worldGen/webPlacement.ts`: `pinWebFloors` and `bakeOnSettledPins` removed; `placementMoved` kept for the refusal.
- Create: `src/worldGen/layoutCheck.ts`, `src/worldGen/layoutCheck.spec.ts`.
- Modify: `scripts/generateWorld.ts`: `assembleOnce` becomes the `pickLayout` implementation. After the build, `layoutMoved` and `placementMoved` run, and either one non-empty exits 1.

**Interfaces:**

- Produces: `PickLayout = (configs: Record<string, SiteConfig[]>) => void`, which writes `seed` and `packing` on every floor of every journey.
- Produces: `clearShopEnds(configs, resolveEncounter): void`. A section whose end resolves to the Fez-shop family loses its `fragmentSlot` end placeholder. The resolver is injected, so core names no mod.
- Produces: `gridShape(grid: FloorGrid): string`, a hash of the cells, walls and doors with rewards left out. Also `layoutMoved(picked: ReadonlyMap<string, string>, configs, carve): string[]`, one line per floor whose pin or shape changed since the pick.
- Consumes: `searchCarvePair`, `verifyCarvePair`, the carve ledger (unchanged).

- [ ] **Step 1: Failing tests** (made-up worlds and a made-up encounter resolver).
  - `configBuilder.spec.ts` "the layout hook sees the world before any loot": the hook receives configs with every end placeholder in place, no concrete placed reward and shop ends already cleared.
  - `configBuilder.spec.ts` "placement carves each floor at the layout's pin": a hook writes a distinct seed per floor, and a spy resolver records each `assembleFloor` seed placement uses. Every recorded seed is the written one, never `defaultSeedFor`.
  - `layoutCheck.spec.ts` "a placed reward moves no wall": the same made-up floor carved with placeholders and with concrete rewards gives the same `gridShape`.
  - `layoutCheck.spec.ts` "an end that loses its reward after the pick is named": removing an `endReward` after the pick makes `layoutMoved` name that floor.
  - `shopStock.spec.ts` "a shop's end placeholder is cleared before the layout"; `slots.spec.ts` "collectSlots skips a shop end and clears nothing".
- [ ] **Step 2: Run** `yarn test src/worldGen src/mods/buildWorldConfigs` → FAIL.
- [ ] **Step 3: Implement.** Comments say why the layout precedes loot (the walk must be the player's) and why end presence is structural.
- [ ] **Step 4: Run** the specs → PASS; `yarn check-types`; `yarn lint`. Do not bake.
- [ ] **Step 5: Per-task review** (Opus): no structural write after `pickLayout`; the web is read on picked floors; the after-build stamp only verifies.
- [ ] **Step 6: Commit:** `refactor: world layout is picked before loot is placed`

---

### Task 2: Frozen tiers keep their pins and their loot (**soundness**: world-gen placement)

**Files:**

- Create: `src/worldGen/frozenTiers.ts`, `src/worldGen/frozenTiers.spec.ts`
- Modify: `src/worldGen/configBuilder.ts`: a `frozen?: { tiers: readonly Tier[]; from: Record<string, SiteConfig[]> }` option, applied right after `pickLayout`.
- Modify: `src/worldGen/placeFragments.ts`, `src/worldGen/slots.ts`: a literal in a frozen journey is never a slot, and every currency's remaining demand is net of it (check each kind: gating, capped and dynamic).
- Modify: `scripts/generateWorld.ts`: `FROZEN_TIERS = ["starter"]`, `from` = the committed `generatedWorldConfigs`. `pickLayout` verifies a frozen floor's pin and never searches it; a pin that fails stops the bake.

**Interfaces:**

- Produces: `freezeJourneys(configs, frozen, journeyTier): void`. It copies `seed`, `packing` and every reward slot (room rewards, end rewards, shop stock) from `from` at the same address. It throws "frozen journey <id> changed shape at <address>" when the authoring's slots do not match the last bake's.

- [ ] **Step 1: Failing tests** (made-up worlds).
  - `frozenTiers.spec.ts` "a frozen journey comes out as it went in": after `buildConfigs`, a frozen journey's rewards and pins equal `from`.
  - "a frozen journey whose authoring gained a section is refused, naming the address".
  - `placeFragments.spec.ts` "a frozen literal counts toward its currency": with one fragment of a made-up symbol frozen, the worklist places the rest elsewhere and the total is exact.
  - "a frozen key opens its gate in the walk".
  - "a dynamic distribution never writes into a frozen slot".
- [ ] **Step 2: Run** `yarn test src/worldGen` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS; `yarn check-types`; `yarn lint`.
- [ ] **Step 5: Per-task review** (Opus): every currency nets literals; a frozen pin is never searched; the tier comes from the journey (a tomb by its own tier, as the fingerprints count it).
- [ ] **Step 6: Commit:** `feat: released tiers keep their layout and loot through a bake`

---

### Task 3: Room reach and the guard on the stamped world (**soundness**: reachability)

**Files:**

- Apply: the `slots.ts`, `placeFragments.ts` and `placeFragments.spec.ts` hunks of `.superpowers/sdd/2026-10-25-camp-phase-4-animal-gates/task-2b-room-reach-and-walk-guard.patch` (fit the spec's made-up `demandFor` to the full `CurrencyDemand`, as Task 2c did).
- Modify: `src/worldGen/validate.ts`, `src/worldGen/validate.spec.ts`: `stuckPoints` (generalises the patch's `validateWalkEntersEveryJourney`).
- Modify: `src/worldGen/gateWalk.ts`, `gateWalk.spec.ts`: the walk passes `resolveOneWay`, `resolveRegionBarrier` and `resolvePassage` from the support (the deferred minor from Task 2).
- Modify: `scripts/generateWorld.ts`: after the stamp, a fresh walk over the final configs; `stuckPoints` plus every `worldValidators` entry on it; any failure exits 1.
- Create: `src/data/worldWinnable.verify.ts`: the same check over the committed `generatedWorld.ts`, run by `yarn verify-content`.

**Interfaces:**

- Produces: `stuckPoints(walk: GateWalk, journeyMeta): string[]`, one line each for an unentered journey, a locked tier and a still-blocking lock (bucket plus where it stands). Empty means winnable.

- [ ] **Step 1: Failing tests** (made-up worlds).
  - `placeFragments.spec.ts` (from the patch): "a slot behind a room needing the made-up glyph is skipped for another journey's end".
  - `validate.spec.ts` "a key on a shop's end leaves its journey unentered and is named"; "a world whose every lock opens has no stuck points"; "a tier whose only group's bucket is nowhere is named locked".
  - `gateWalk.spec.ts` "a one-way door is walked as the support resolves it".
- [ ] **Step 2: Run** `yarn test src/worldGen src/data` → FAIL.
- [ ] **Step 3: Implement.** The script prints `strict walk enters N of M journeys` on success.
- [ ] **Step 4: Run** → PASS; `yarn check-types`; `yarn lint`.
- [ ] **Step 5: Per-task review** (Opus): the guard reads the final configs with a fresh cache; nothing is withheld; it names a fix target, never a fix.
- [ ] **Step 6: Commit:** `feat: the bake refuses a stamped world the player can get stuck in`

---

### Task 4: Bake 1 — the world on its shipped layout (**soundness**: the bake)

**Files (by the bake):** `src/data/generatedWorld.ts`, `src/data/carveLedger.json`, `src/data/tierFingerprints.json` (moved tiers only, deliberately), `docs/loot-report.md`, `docs/review-camp-release.md`, `.betterer.results` (re-key only).

- [ ] **Step 1: Before:** `timeout 900 yarn loot-report` on the committed bake; keep its totals in the scratchpad. Copy the starter journeys' pins out of `generatedWorld.ts` with a scratch script.
- [ ] **Step 2: Bake:** `timeout 900 yarn generate-world`. Required:
  - the stamped guard prints `strict walk enters 29 of 29 journeys`;
  - no "loot moved a wall" and no "web moved";
  - hieroglyphs 296/296;
  - empty chests 0;
  - every currency total as before.

  Non-starter floors may re-search where a pin fails (pre-release). A guard failure stops the phase: write it under Failures.
- [ ] **Step 3: Starter unchanged:** the fingerprint verify passes for starter without edits, and the scratch diff of starter pins is empty. For every other tier that moved, copy its hash and write one line in the review list (loot re-placed on the shipped layout).
- [ ] **Step 4: Report:** `timeout 900 yarn loot-report`; the totals are exact and only the slot mix moves.
- [ ] **Step 5: Checks:** `timeout 900 yarn verify-content` (includes `worldWinnable.verify.ts`) and `timeout 900 yarn verify`.
- [ ] **Step 6: Review list:** move the phase-4 blocker from Failures to Decisions as resolved, with the before/after walk counts (22/29 → 29/29 shipped).
- [ ] **Step 7: Commit:** `chore: bake the world with loot placed on its shipped layout`

---

### Task 5: The animals are keys (**soundness**: world-gen placement)

**Files:**

- Create: `src/mods/shop/game/purchases.ts` (+ spec), `src/mods/shop/game/purchaseCurrency.ts` (+ spec), `src/mods/shop/game/reachabilitySupport.ts` (+ spec)
- Modify: `src/mods/shop/game/rewardSchemas.ts`, `src/mods/shop/game/pricing.ts` (+ spec), `src/mods/shop/index.ts` (`shopStock`, `currencies`, `reachabilitySupport`)

**Interfaces:**

- Produces: `Purchase = { id; fact; price; soldAt: { journeyId; nth? }; opens?: { tier } | { journeyId } }`, `PURCHASES`, `purchaseFact(id)`, `purchaseProblems(table, tombIds)` (duplicates, a bad fact, a bad price, a non-tomb shop, two purchases on one gate, a purchase opening starter or junior), and `requirementsFor(table)` (tier groups and entry locks).
- Produces: `purchaseRewardSchema = { type: "purchase"; id }`; `priceFor` prices it flat from the table.
- Produces: `purchaseCurrency(table): CurrencyDistribution`. It owns every purchase fact, gives a demand of one `{ type: "purchase", id }`, and its `eligible` is a hard filter: only a slot whose `preference` is that fact. `allBuckets` lists every fact, so the banner is placed. `SHOP_REACHABILITY` maps a purchase reward to its fact and supplies `tierUnlockGroups` / `journeyEntryLocks`.

- [ ] **Step 1: Failing tests** (made-up tables and worlds).
  - `purchases.spec.ts`: each problem is reported once and named; `requirementsFor` gives one group or lock per opening purchase and nothing for the banner.
  - `purchaseCurrency.spec.ts`:
    - "a purchase lands in its own shop's placeholder";
    - "a purchase whose shop lies behind the gate it opens fails the build, naming both";
    - "a purchase that opens nothing is still placed by the completion pass";
    - "no other currency takes a purchase placeholder".
  - `pricing.spec.ts`: a purchase is priced from a made-up table at every tier.
- [ ] **Step 2: Run** `yarn test src/mods/shop src/worldGen` → FAIL.
- [ ] **Step 3: Implement.** Do not bake.
- [ ] **Step 4: Run** → PASS; `yarn check-types`; `yarn lint`.
- [ ] **Step 5: Per-task review** (Opus): the gate is the worklist's frontier when the purchase is placed; core reads no reward type; starter → junior has no purchase.
- [ ] **Step 6: Commit:** `feat: Fez's animals are keys placed before the gates they open`

---

### Task 6: Grounds and the money guard (**soundness**: the economy guard, reachability)

**Files:**

- Modify: `src/worldGen/gateWalk.ts` (+ spec): the `holding` mode.
- Create: `src/worldGen/grounds.ts`, `src/worldGen/grounds.spec.ts`
- Create: `src/mods/shop/game/moneyLedger.ts`, `src/mods/shop/game/moneyLedger.spec.ts`
- Modify: `src/mods/shop/game/economyGuard.ts` (+ spec), `src/mods/shop/game/lootTotals.ts` (+ spec)

**Interfaces:**

- Produces: `GateWalk.holding(bought: ReadonlySet<TreasureReward>): GateWalkResult`. Shop stock harvests only when the piece (by identity) is in `bought`; room rewards harvest as before. The result also lists the stock pieces standing in the ground (`stock`). It is memoised per set.
- Produces: `reachableGrounds(walk, { isKey: (r) => boolean; cap }): { grounds: Ground[] } | { overCap: number }`. `Ground = { bought; rewards; stock }`, enumerated breadth-first from ∅ by buying one key piece in `stock` at a time and deduplicated by the reached rewards.
- Produces (shop): `moneyLedger(grounds, priceFor, incomeOf): MoneyRow[]` with `{ label: the purchases held; income; buyable; margin }`. Also `purchasePlacementProblems(walk, table)`: a purchase that is not exactly once in its shop, or whose gate the full walk does not open. `runEconomyGuard(configs, reachable, walk)` throws on either, on any negative margin (naming the ground, income, buyable and shortfall) and on `overCap`. The global-only check is removed; the last ground is the world.
- Produces: loot-report rows `Money with <held> bought` (found = income, needed = buyable) and `Purchases in shops`.

- [ ] **Step 1: Failing tests** (made-up worlds and tables).
  - `grounds.spec.ts`:
    - "buying a key that opens nothing new adds no ground";
    - "two independent keys give four grounds";
    - "over the cap returns the count";
    - "the number of walks is at most grounds × key pieces" (counted through an injected walk).
  - `moneyLedger.spec.ts`:
    - the Decision 10 counterexample world: the old one-gate-withheld rows all pass, and `runEconomyGuard` refuses, naming the ground "A bought";
    - a property test: 200 seeded made-up worlds (≤ 3 shops, ≤ 4 key pieces, ≤ 3 rares). For each world the guard passes on, an exhaustive spender (every buy order) never ends with an unbought visible key it cannot afford.
  - `economyGuard.spec.ts`: a purchase stocked twice, or missing, throws naming it; a short ground throws with its numbers.
  - `lootTotals.spec.ts`: the rows equal `moneyLedger` for the same made-up world.
- [ ] **Step 2: Run** `yarn test src/worldGen/grounds src/worldGen/gateWalk src/mods/shop` → FAIL.
- [ ] **Step 3: Implement.** The top comment of `grounds.ts` states what a ground is and why every reachable ground is checked.
- [ ] **Step 4: Run** → PASS; `yarn check-types`; `yarn lint`. Do not bake.
- [ ] **Step 5: Per-task review** (Opus): the soundness argument holds in code; there is no money word in core; the property test can fail (break the guard locally and see it go red).
- [ ] **Step 6: Commit:** `feat: the economy guard checks every ground a player can stand in`

---

### Task 7: Fixed quantities before money (**soundness**: world-gen placement)

**Files:**

- Modify: `src/worldGen/slotAllocator.ts`, `src/worldGen/placeFragments.ts` (+ specs): `Distribution.fillsLast?: true`, and distributions that fill last run after every other one.
- Modify: `src/worldGen/shopStock.ts` (+ spec): `trimEmptyStock(configs)` right after `placeShopStock`.
- Modify: the trap mod's waterskin count (50 per tier) and its spec only if the spec builds a made-up count.
- Modify: `src/mods/shop/game/loot.ts`: `fillsLast: true`.

**Interfaces:**

- Produces: `trimEmptyStock`, which drops each `undefined` stock entry of a shop.

- [ ] **Step 1: Failing tests:**
  - `placeFragments.spec.ts` "a distribution marked last fills after one registered after it";
  - `shopStock.spec.ts` "a shop keeps only its assigned stock" and "trimming moves no wall" (made-up floor, `gridShape` equal).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS; `yarn check-types`; `yarn lint`.
- [ ] **Step 5: Per-task review** (Opus, light): ordering is mod-agnostic; the trim runs before the layout.
- [ ] **Step 6: Commit:** `feat: fixed loot fills before money, shops hold no empty slot`

---

### Task 8: Money is placed to meet every ground (**soundness**: the economy guard)

**Files:**

- Modify: `src/worldGen/slotAllocator.ts`, `src/worldGen/placeFragments.ts`: a distribution's `fill` gets `ctx: { walk: GateWalk }`, built with a fresh cache over the world as it stands once every earlier distribution has filled. The walk lists the remaining placeholder objects, so a slot's ground is known by identity.
- Modify: `src/mods/shop/game/loot.ts` (+ `loot.spec.ts`): `MONEY_ALLOWANCE` goes.
- Modify: `src/data/sellables.ts`: tier sell values, by Decision 16's rule.

**Interfaces:**

- Produces: the money fill. It computes the grounds (`reachableGrounds`), sorts them by size, and per ground places junk and coins in its free slots until `income ≥ buyable × 1.1`. Then it fills the world up to ≈ 1.1 × all buyable. A ground with no free slot left throws, naming the ground and its shortfall. Completeness (≥ 1 of each sellable per tier) and the per-level spread stay.

- [ ] **Step 1: Failing tests** (`loot.spec.ts`, made-up nested grounds):
  - "the smallest ground is covered before the world";
  - "a ground with no free slot fails, naming it";
  - "a frozen literal's money counts toward its ground";
  - "no allowance is added".
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement**, setting the sellable values by the rule with a scratch measurement on the Task 4 bake, noted in the task report. **Step 4: Run** `yarn test src/mods/shop src/worldGen` → PASS; `yarn check-types`; `yarn lint`. Do not bake.
- [ ] **Step 5: Per-task review** (Opus): the fill reads the same grounds the guard checks; there is no core money word.
- [ ] **Step 6: Commit:** `feat: money is placed so every ground pays for its stock`

---

### Task 9: Bake 2 — animals, money and waterskins (**soundness**: the bake)

**Files (by the bake):** as Task 4, plus `src/mods/shop/game/purchases.ts` and the waterskin count, only by the rules below.

- [ ] **Step 1: Bake:** `timeout 900 yarn generate-world`.
  - If a ground falls short and has no free slot: first lower waterskins by 10 per tier (never below 20). Then lower the price of the purchase in that ground closest to its gate by 50 (never below 100). Two rounds at most.
  - A purchase placement failure, or a third round, stops the phase (Failures).
- [ ] **Step 2: Required:**
  - `strict walk enters 29 of 29`;
  - every `Money with … bought` row found ≥ needed;
  - `Purchases in shops` 7/7;
  - chests and path ends 100 % filled;
  - hieroglyphs, mosaic, map pieces, tomb treasures, camp finds and parts exact;
  - starter fingerprint and pins unchanged.
- [ ] **Step 3: Report and fingerprints:** `timeout 900 yarn loot-report`; one review-list line per moved tier.
- [ ] **Step 4: Checks:** `timeout 900 yarn verify-content`.
- [ ] **Step 5: Commit:** `chore: bake the world with Fez's animals and money per ground`

---

### Task 10: Alle reizen shows what a gate still needs

Sonnet.

**Files:**

- Create: `src/app/pages/gateNeeds.ts`, `src/app/pages/gateNeeds.spec.ts`
- Modify: `src/app/pages/allJourneys.ts` (+ spec), `src/app/pages/AllJourneysPage.tsx` (+ spec), `src/app/pages/journeyAvailability.ts` (+ spec), `src/app/state/useDetector.ts`, `src/app/PyramidExpedition/utils.ts` (`nextPyramidJourneyId` callers)
- Modify: `src/ui/molecules/JourneyRow.tsx`, `src/ui/molecules/TierHeader.tsx` (+ stories, + specs): a need's `hint`
- Modify: `public/locales/{nl,en}/common.json` (frame strings only)

**Interfaces:**

- Produces: `registerGateNeeds(useNeeds: () => (gate: Gate) => readonly GateNeed[])` and `useMergedGateNeeds(): { needs; unmet(gate, held); open(gate, held) }`, with the same registry shape as `journeyContributions.ts`. `GateNeed = { key; label; hint? }`.
- Produces: `JourneyNeed.hint?: string`. `AllJourneysPage` feeds `extraNeeds` from unmet gate needs, and `tierOpen = ladder ∧ open({ tier })`. A tomb with an unmet need is not enterable. Availability and the detector take the same predicates, defaulting to open. Dev mode still opens pyramids.

- [ ] **Step 1: Failing tests** (made-up needs registered in the spec).
  - `allJourneys.spec.ts`:
    - "a tier whose treasure is held but whose need is unmet is one locked group listing the treasure lit and the need with its hint";
    - "before the treasure is held there is no locked group, need or not";
    - "holding the need's key lists the tier's journeys";
    - "a tomb with every map piece and an unmet need stays locked and lists the need".
  - `gateNeeds.spec.ts`: two hooks concatenate; `unmet` drops held keys; no hooks means open.
  - `journeyAvailability.spec.ts`: `tierOpen` false offers no journey of that tier; the defaults change nothing.
  - `JourneyRow.spec.tsx` / `TierHeader.spec.tsx`: the hint renders under its need.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement**, with stories: a locked tier with the treasure lit plus one need with a hint; a tomb complete with a need. **Step 4: Run** → PASS; `yarn check-types`; `yarn lint`.
- [ ] **Step 5: Commit:** `feat: a locked tier or tomb says which animal it still needs`

---

### Task 11: Buying an animal (**soundness**: saves)

As old Task 6, with Travel read as Alle reizen.

**Files:** create `src/mods/shop/game/purchaseState.ts`, `src/mods/shop/app/usePurchases.ts`, `src/mods/shop/app/gateNeeds.ts` (each + spec); modify `src/mods/shop/app/index.ts`, `src/mods/shop/app/rewardDisplay.tsx` (+ spec), locales, review list Drafts.

**Interfaces:**

- `PurchaseSave = { version: 1; purchases: string[] }`, with `recordPurchase` (idempotent), `readPurchaseSave`, `updatePurchaseSave` (an unreadable value is returned untouched) and `heldFacts`.
- `usePurchases()` over `useModState("shop")`.
- Reward effect `purchase` → record; already recorded → skip (sold out).
- Registered: the held-keys provider, `registerGateNeeds` (key = fact, label `purchases.<id>.need`, hint `purchases.hint` with the selling tomb's translated name) and the dev grant.
- Keys: `purchases.<id>.{name,need,opens}`, `purchases.hint`, `purchases.devGrant`.

- [ ] **Step 1: Failing tests:**
  - `purchaseState.spec.ts`: twice is once; an unknown id is kept and inert; `version: 2` reads empty and is never written over.
  - `usePurchases.spec.ts`: a recorded fact is held through `useMergedHeldKeys`.
  - shop `gateNeeds.spec.ts`: a made-up table gives one need per opened gate with its hint, and none for the banner.
  - `rewardDisplay` spec: a purchase shows its name and what it opens, and a recorded one is skipped.
- [ ] **Step 2–4:** FAIL → implement, drafting the words nl first → PASS; `yarn check-types`; `yarn lint`.
- [ ] **Step 5: Per-task review** (Opus): ids only; never clobbers; the gate opens through held keys alone.
- [ ] **Step 6: Commit:** `feat: buying an animal from Fez opens its gate`

---

### Task 12: The animal arrives in the camp (**soundness**: saves)

As old Task 7 unchanged: `campSteps.ts` gets `purchase` on bought steps and its two new problems; `campState.ts` goes to v2 with `arrived` and `arrive`, and a v1 save reads with no arrivals; `useCampProgress.ts` runs arrive before grow on the homecoming; `src/mods/purchaseFacts.verify.ts` holds the agreement. The tests are as the old plan lists them.

- [ ] **Steps:** failing tests → FAIL → implement → PASS (`yarn test src/mods/camp src/app`, the verify) → `yarn check-types`, `yarn lint` (sibling rule at zero) → per-task review (Opus) → **Commit:** `feat: a bought animal waits in the camp on coming home`

---

### Task 13: The animal story beats are wired

Sonnet.

**Files:** `src/mods/story/game/reaction/storyBeats.ts` (+ spec), `src/mods/story/game/drafts.ts` (+ spec); the seams the drafts name (`animal.forSale`, `bought*`, `blocked*`, `through*`, `arrives*`), firing from the shop, Alle reizen's locked group, the first journey entered past a gate, and the camp's arrival.

- [ ] **Step 1: Failing tests** (made-up seams): each animal beat fires once at its moment, and `WAITING_BEATS` lists no animal beat.
- [ ] **Steps 2–4:** FAIL → move the beats from waiting to wired → PASS; `yarn check-types`; `yarn lint`.
- [ ] **Step 5: Commit:** `feat: Fez and the explorer talk about the animals`

---

### Task 14: Docs, toggle-off, gate, look

Docs Sonnet; the rest Opus.

**Files:**
- `docs/game-design/keys-and-locks-solver.md`: the canonical order becomes layout → keys (purchases included) → money as a condition → fixed loot → money; grounds; the stamped guard.
- `docs/game-design/world-spec-stability.md`: frozen tiers; loot moves no wall.
- `docs/game-design/shop-mechanic.md`.
- `docs/review-camp-release.md`, `docs/handover-camp-release.md` (tick phases 4 and 5, one State line each), `CHANGELOG.md` (`## Unreleased`, one line), this plan (ticks).

- [ ] **Step 1: Docs**, current state only. **Commit:** `docs: layout first, grounds and the animals`
- [ ] **Step 2: Toggle-off, shop:** take `shopMod` out of `REGISTERED_MODS`. Then `timeout 900` each of `yarn generate-world`, `yarn check-types`, `yarn build` and `yarn loot-report`. Expect no purchase in the world, no money rows, the guard passing, and every tier open. Restore with `git checkout src/mods/registeredMods.ts src/data docs/loot-report.md`, and confirm `git status --short` is clean.
- [ ] **Step 3: Toggle-off, camp:** the same steps. Purchases and money rows stay; there are no camp rows.
- [ ] **Step 4: Gate:** `timeout 900` each of `yarn verify`, `yarn verify-content` and `yarn build`, in a clean worktree state.
- [ ] **Step 5: Look:** check in Storybook (the need lines) and `yarn dev`:
  - holding a junior tomb treasure without the donkey, the expert group shows the treasure lit plus "Je hebt een ezel nodig — Fez verkoopt er een in …";
  - buy the donkey in the junior tomb's shop;
  - the expert journeys open;
  - on the homecoming the camp save carries `arrived`.

  Take screenshots. Anything not reachable unattended goes under Look at in browser, with steps.
- [ ] **Step 6: Record:**
  - the decisions above;
  - a "Phase 4 grounds" block: per purchase its shop, price and gate, and per ground its income, buyable and margin;
  - the waterskin and price rounds;
  - the fingerprint lines;
  - the toggle and gate results;
  - the CHANGELOG line.

  **Commit:** `docs: phase 4 and 5 results in the review list`

---

## Open questions for the designer

1. **Hidden-pocket money:** does money in a hidden pocket count as "reachable" for the money guard? The default counts it, because the strict walk reaches it. If a player may never find a pocket, the guard must leave it out.
2. **A key that cannot be placed:** when no slot before a gate fits its key on the picked layout, should the bake re-pick that floor's layout (next seed) and try again, or stop and name it? The default is to stop.
3. **Starter's loot:** freeze it with its layout (default: its fingerprint stays and released players find the same chests), or freeze only the layout and let its loot move?
4. **The layout's acceptance:** step 2 says a layout must satisfy locks, side paths, puzzles and chests, and that side paths go into locks so a lock holds puzzles on the way. Are today's five carve criteria (carves, attempt 0, lock walks sound, no dead region, every stub holds a room) enough, or should "a lock holds a puzzle on the way" and the sprawl knobs become a sixth criterion?
5. **Keys for sale:** six hieroglyph pieces and one map piece are sold in shops today. Keep them as money-bought keys (they join the ground enumeration), or move them out of the shops so the animals are the only keys Fez sells?
