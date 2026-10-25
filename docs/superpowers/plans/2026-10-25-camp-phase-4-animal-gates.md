# Camp phase 4 — animals as gates, the per-gate guard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This plan says what to build, which files, and what the tests prove; it carries no code (docs/instructions/agent-work.md).

**Goal:** The animals are obstacles. Fez sells seven purchases in his tomb shops; six of them open a gate (a tier or an optional tomb) **on top of** the gate that is already there, the banner opens nothing. Without the donkey the expert tier stays shut even with a junior tomb treasure in hand; without the camel the Inner Sanctum stays shut even with every map piece. A locked tier or tomb in Travel says what it needs ("Je hebt een ezel nodig") and where Fez sells it. A bought animal waits in the camp on the next homecoming. World generation proves every purchase stands in a shop the player reaches before its gate, and that **per gate** the money reachable before it pays for everything buyable before it, the animal included. Shop mod off: the purchases and their gates are gone; camp mod off: the gates work, the camp just does not show the animals.

**Architecture:** Three seams, each mod-agnostic in core, and one shared vocabulary of **purchase facts** (`purchase:<id>`, a plain string the shop owns and the camp names in its data).

1. **World-gen gates become AND-lists** (`src/worldGen/reachability.ts`). `ReachabilitySupport.journeyEntryLock` (one lock, first owner wins) becomes `journeyEntryLocks` (a list; every lock must hold) and `tierUnlockBucket` (one OR-group) becomes `tierUnlockGroups` (a list of OR-groups; every group needs one held bucket). `MOD_REACHABILITY_SUPPORT` merges them by concatenation, so the tomb-treasure mod's ladder and map pieces and the shop's animals each add a requirement to the same gate. A shop's **stock is harvested** like a room's reward (a piece in a reachable shop counts as held; the money for it is the guard's job), and the winnability guard also refuses a world that ends with a tier still locked.
2. **A gate walk** (`src/worldGen/gateWalk.ts`): "what can the player reach when this one bucket is never held" — the strict-bracket fixed point from empty hands, over the finished world. `placeFragments` builds it after placement and `buildConfigs` hands it to every `WorldValidator` as a third argument; `scripts/lootReport.ts` builds the same walk over the baked world and hands it to every mod's `lootTotals` as a second argument. Core names no currency.
3. **App gate needs** (`src/app/pages/gateNeeds.ts`): a hook registry where a mod says, per tier or journey, which held key it needs and the words for it. Core checks needs against `useMergedHeldKeys()`; `journeyAvailability`, Travel, the completion overlay and the detector all ask the same merged check.

The **shop mod** owns the purchase table (`src/mods/shop/game/purchases.ts`: id, fact, price, the shop that sells it, the gate it opens), places each purchase as a concrete reward into its tomb shop's stock (`ShopStockAssignment` grows a `reward` variant), prices it, supplies the reachability requirements, runs the **per-gate guard** over the gate walk, reports **money before each gate**, records purchases in its own versioned store, exposes them as held keys, and registers the gate needs. The **camp mod** names the fact on each `bought` step and records an arrival on the homecoming after the fact is held (camp save v2). Neither imports the other; a verify at the `src/mods/` aggregate level holds the camp's facts and the shop's table together.

**Tech Stack:** TypeScript, React 19, Vitest + Testing Library, Storybook, zod reward schemas, immer state models (`docs/instructions/state-models.md`), the keys-and-locks solver (`src/worldGen/reachability.ts`, `src/worldGen/placeFragments.ts`), the bake (`yarn generate-world`), `yarn loot-report`.

**Spec:** `docs/handover-camp-release.md` (Phase 4 brief, "How the driver session works", Decisions 3 and 6), `docs/superpowers/specs/2026-10-23-camp-loot-design.md` ("Bought at Fez", "No softlock: the per-gate guard", "Settled with the builder check", "Left to the builder"), `docs/game-design/keys-and-locks-solver.md` (the worklist, the tier ladder, the winnability guard), `docs/game-design/shop-mechanic.md`, `docs/mods/TARGET.md` (core names no mod; mods import no sibling; toggle-off is the gate). Where the brief and the spec disagree, the brief wins (see decision 20).

## The purchase table (authored data the plan settles)

| Purchase id     | Fact                     | Sold at (tomb shop)      | Opens                                                     | Lands in the camp (catalogue steps) | Price (default) |
| --------------- | ------------------------ | ------------------------ | --------------------------------------------------------- | ----------------------------------- | --------------- |
| `donkey`        | `purchase:donkey`        | `junior_treasure_tomb`   | tier `expert`                                             | `halter`, `donkey`, `saddlebags`    | 200             |
| `cart`          | `purchase:cart`          | `expert_treasure_tomb`   | tier `master`                                             | `cart`                              | 300             |
| `camel`         | `purchase:camel`         | `expert_treasure_tomb`   | journey `expert_treasure_tomb_b` (Inner Sanctum)          | `camel`, `waterTrough`              | 250             |
| `secondDonkey`  | `purchase:secondDonkey`  | `master_treasure_tomb`   | tier `wizard`                                             | `secondDonkey`                      | 250             |
| `secondCamel`   | `purchase:secondCamel`   | `master_treasure_tomb`   | journey `master_treasure_tomb_b` (Hall of Osiris)         | `secondCamel`                       | 250             |
| `sturdyCart`    | `purchase:sturdyCart`    | `wizard_treasure_tomb`   | journey `wizard_treasure_tomb_b` (Realm of Cosmic Forces) | `paintedCart`                       | 400             |
| `caravanBanner` | `purchase:caravanBanner` | `wizard_treasure_tomb_c` | nothing                                                   | `caravanBanner`                     | 500             |

Every shop is the first (`nth: 0`) Fez shop of its journey; each has four or five empty stock slots today (phase 1 emptied 35). The prices are sized to today's economy, measured on the committed bake with a throwaway walk by tier: income before the expert gate ≈ 1528 against 800 of rare stock (slack ≈ 728), before the master gate ≈ 3193 against ≈ 2000 (≈ 1193), before the wizard gate ≈ 5391 against ≈ 3900 (≈ 1491), whole world 8107 against 6300 (1807). The prices before each gate sum to 200 / 750 / 1250 / 2150, and the shop's budget grows by the sum of the prices (its floor is the priced stock), so every gate keeps a margin. Task 8 measures the real per-gate margins and may lower a price (never the economy; that is phase 5).

## Global Constraints

- **Branch** `camp/home-and-loot` only. Never `git pull`, never a bare `git stash`, never switch branches. Commit after every task.
- **Core is mod-agnostic.** `src/app`, `src/ui`, `src/game`, `src/data`, `src/worldGen` never name the shop or camp mod, the `purchase` reward type, an animal, a purchase id or a `purchase:` fact; the `no-restricted-imports` rules stay at zero. The shop and camp mods import no sibling. The only file that reads both is a verify at the `src/mods/` aggregate level (Task 7), next to `puzzleSeeds.verify.ts`; if the lint rule refuses it there, it goes under `scripts/` as a check `yarn verify-content` runs, never through an allowlist.
- **The world stays byte-identical until Task 8.** Tasks 1 and 2 are refactors: Task 1 proves it with one bake probe (baseline, bake, `git diff --quiet src/data`, restore). Task 3 adds the purchases to the world's data, but nothing is baked before Task 8.
- **No unit test pins the real purchase table, a real price, a real journey id's gate, or a count of the real world.** Specs build made-up tables, made-up configs (the way `reachability.spec.ts` and `economyGuard.spec.ts` build them) and made-up saves. A total may be asserted against the table it was computed from, never as a literal. Agreement checks over the real tables are `.verify.ts` files.
- **Saves:** the shop's purchase store is new (`useModState("shop")`, `version: 1`, purchase ids only). The camp store moves to `version: 2`; a v1 save reads as v2 with no arrivals. A stored value whose version this build does not know reads as the empty save and is **never written over** (the `updateCampSave` rule, applied to both stores). Ids are authoring names, never indices; an unknown id is kept and inert.
- **Comments state the current state and why, never history.**
- **Commits:** one subject line, `type: what changed`, ≤ 72 chars, ending with the session's attribution trailer.
- **Strings:** every new user-facing string in both `public/locales/en/` and `public/locales/nl/` (`src/i18n/keys.spec.ts`). nl first (spoken, everyday Dutch), then en. Every drafted string is listed under Drafts in the review list.
- **Stories:** every new or changed `src/ui/` component gets or updates its story, with made-up props.
- **Domain code** (`src/worldGen/`, `src/mods/*/game/`) stays pure TypeScript: no React, no i18n, no DOM, no `fs`. `src/app/appImports.spec.ts` keeps fs-reading modules out of the app bundle: the app may import `src/mods/shop/game/purchases.ts` but never a module that pulls in the bake, the gate walk's script wiring or `node:` modules.
- **Checks per task:** the task's own specs, `yarn check-types`, `yarn lint`. Only Task 8 runs the bake, `yarn loot-report`, `yarn verify`, `yarn verify-content` and `yarn build`, each under `timeout 900` (Task 1's byte-identical probe is the one exception, also under `timeout 900`).
- **Never** `SKIP_ECONOMY_GUARD`, never a hand-edited baked number, never a weakened check. A failing guard is a price to lower (Task 8's rule) or a Failure in the review list.

## Review Focus

1. **AND, not OR, across mods:** a tier opens only when every group holds one bucket; a journey only when every entry lock holds. With only the tomb-treasure mod contributing, the world is byte-identical (Task 1, soundness).
2. **A shop's stock is harvested** and the winnability guard refuses a world that ends with a tier locked; neither moves today's bake (Task 1).
3. **The gate walk is a fresh strict fixed point**: from empty hands, with the withheld bucket never counted, over the finished world. With nothing withheld it reaches every journey of the world, or the guard says which it misses (Tasks 2 and 4, soundness).
4. **Every purchase stands exactly once,** in its named shop, and that shop is reached in the walk that withholds the purchase's own fact (its shop lies before its gate). No purchase opens the starter or junior tier (Tasks 3 and 4, soundness).
5. **The per-gate guard:** for every purchase that opens something, income reachable without it ≥ the price of every stock piece reachable without it plus its own price; and for the whole world. A failure names the gate, the income, the buyable and the shortfall (Task 4, soundness).
6. **The app gates on the same facts:** a tier or tomb with an unmet need is not pickable in Travel, not offered by the completion overlay, and reads "locked" in the detector; dev mode still opens everything (Task 5).
7. **Purchases are saved by id and never lost;** buying twice is impossible (sold out); the gate opens at once, the animal shows in the camp on the next homecoming (Tasks 6 and 7, soundness).
8. **Toggle-off:** shop off → no purchase in the world, no gate needs, every tier and tomb opens as before; camp off → gates work, no camp arrivals. Bake, types and build pass both ways (Task 8).

## Decisions for the review list

Each is the option that changes the least shipped behaviour, or the one the brief names; Task 8 writes them into `docs/review-camp-release.md` under Decisions, each prefixed `Phase 4 —`.

1. **Gates are AND-lists in `ReachabilitySupport`** (`journeyEntryLocks`, `tierUnlockGroups`), merged across mods by concatenation. Alternative: keep the single-answer hooks and add a parallel `extraRequirements` hook.
2. **A purchase is a concrete reward placed in shop stock before the worklist runs** (`ShopStockAssignment` gains a `reward` variant; core places it without reading its type), so the solver sees it. Alternative: a dynamic distribution after placement (too late for reachability).
3. **Shop stock is harvested by the walk** like a room's reward: a piece in a reachable shop counts as held, and money is the guard's question, not the walk's. Alternative: harvest only purchases through a separate hook (keeps shop-sold map pieces unharvested, which breaks the fresh gate walk).
4. **"Before a gate" = reachable from empty hands with that purchase's fact never held,** strict bracket, world-wide, global wallet and revisitable shops (the spec's definition). Hidden pockets in that ground count as income. Alternative: exclude hidden pockets (needs slot-level data the walk does not carry).
5. **The per-gate guard replaces the global guard;** "the whole world" is one more gate in it (nothing withheld). Alternative: keep the global guard and add the per-gate one beside it.
6. **Shops chosen:** donkey in the junior tomb; cart and camel in the first expert tomb; second donkey and second camel in the first master tomb; sturdier cart in the first wizard tomb; banner in the Throne of Eternity (`wizard_treasure_tomb_c`), the last shop. Alternative: banner in the first wizard tomb.
7. **Default prices** 200 / 300 / 250 / 250 / 250 / 400 / 500 (donkey, cart, camel, second donkey, second camel, sturdier cart, banner), sized to today's economy with a margin ≥ 10 % of each gate's buyable; phase 5 may raise them with the economy. Alternative: price them like the rare stock (500–1000) and let phase 5 make that affordable.
8. **A purchase opens its gate at once;** the animal shows in the camp on the next homecoming. Travel is reached only from base, so the player is always home before the gate matters. Alternative: open the gate only after the homecoming.
9. **Purchases land the catalogue's steps:** the camel purchase lands `camel` and `waterTrough` (the camel art carries rope and saddle); the second camel lands `secondCamel` (the catalogue has no camel-trough step). No new art. Alternative: add rope, saddle and camel-trough steps (new art).
10. **The camp learns of a purchase through held keys** (`useMergedHeldKeys`, the shop's provider), the vocabulary being the fact string in the camp's step table. Alternative: the camp registers its own reward effect on the shop's reward type (reads the shop's payload shape).
11. **The camp save goes to `version: 2`** with `arrived` (bought step ids), read from v1 as no arrivals. Alternative: keep v1 and add an optional field.
12. **A new shop store** `useModState("shop")` `{ version: 1, purchases: string[] }`. Alternative: derive purchases from the journeys' bought shop slots (an address, not an authoring name).
13. **Gate needs are an app seam of their own** (`gateNeeds.ts`), checked against held keys; the tomb's map-piece lock and the tier ladder stay where they are. Alternative: read the world-gen `MOD_REACHABILITY_SUPPORT` in the app for every gate.
14. **A tier's need shows only once its ladder key is held** (one `LockedTierCard` where its first journey would be); before that the tier stays out of the list, as today. A tomb shows its needs on its locked card from the first map piece on. Alternative: show the tier card with every unmet requirement from the start.
15. **The need line says where Fez sells it,** naming the selling tomb (the player has always been there: each tier's ladder keys lie in that same tomb). Alternative: no hint.
16. **Fez lists purchases in his one buy list** with the rare finds, priced flat. Alternative: a section of their own ("Voor de karavaan").
17. **Purchase emoji:** donkey 🫏, camel 🐪, carts 🛞, banner 🚩, until painted (the repaint queue gains no entries this phase; phase 6 and 8 own the camp's art and Fez's lines).
18. **Shop off:** no purchase is placed, no requirement and no need registers, so every gate is exactly as before; the camp's bought steps never arrive. Camp off: gates and purchases work, nothing arrives in a camp. Alternative: camp treats bought steps as fixed when no shop is registered.
19. **The loot report** gains one row per gate, "Money before <gate>", found = income before it, needed = buyable before it, plus "Purchases in shops" against the table. Alternative: a separate gate table.
20. **Brief over spec:** the spec's lists ("rope, camel, saddle, and the water trough"; "second camel and the camel trough") name art the catalogue does not have; both the brief and the spec are followed for what opens what, and the catalogue for what lands (decision 9). No other disagreement found.
21. **The dev menu gains "Koop alle dieren"** (a shop dev grant, also part of "Unlock everything"). Alternative: none.

---

### Task 1: Gates as AND-lists, stock harvested, every tier reached (**soundness**: reachability) — Opus

**Files:**

- Modify: `src/worldGen/reachability.ts`, `src/worldGen/reachability.spec.ts`
- Modify: `src/worldGen/placeFragments.ts` (the merged support passes the new hooks; the winnability guard)
- Modify: `src/mods/registeredMods.ts` (merge by concatenation), `src/mods/registeredMods.spec.ts`
- Modify: `src/mods/tombTreasure/game/reachabilitySupport.ts` (+ its spec if one exists, else `src/mods/tombTreasure/game/reachabilitySupport.spec.ts`)
- Modify: every other reader of the two old hooks (`grep -rn "journeyEntryLock\|tierUnlockBucket" src scripts`)
- Modify: `docs/game-design/keys-and-locks-solver.md` (the tier ladder and journey entry paragraphs: AND across mods, OR within a group; stock harvested)

**Interfaces:**

- Produces: `ReachabilitySupport.journeyEntryLocks?: (journeyId) => readonly { bucket: string; threshold: number }[]` — every lock must hold; `ReachabilitySupport.tierUnlockGroups?: (tier) => readonly (readonly string[])[]` — every group needs one held bucket; no groups = open. The old `journeyEntryLock` and `tierUnlockBucket` are gone.
- Produces: `isTierUnlocked(tier, ownedFacts, support)` over the groups; `computeReachability` checks every entry lock, adding each unmet one to `discoveredLocks`.
- Produces: `reachableFloorsInSite` harvests each shop stock piece through `bucketForReward` and `alsoHarvests`, exactly as a room's reward.
- Produces: the winnability guard in `placeFragments` also throws when, after the drain, a tier in the walk is still locked, naming the tier and its unmet groups.
- Produces: `MOD_REACHABILITY_SUPPORT.journeyEntryLocks` / `.tierUnlockGroups` = the concatenation over every contributing mod, in registry order; the tomb-treasure mod returns one group (its `TIER_UNLOCK_PERK_IDS[tier]`, none for starter) and one lock (its map pieces).

- [x] **Step 1: Failing tests** (made-up configs and supports only).
  - `reachability.spec.ts`: a tier with two groups opens only when both have a held bucket; one group of three opens on any one; no groups is open. A journey with two entry locks is entered only when both hold, and each unmet one is a discovered lock. A key in a shop's stock in a reachable room is harvested; the same key in a shop behind a locked gate is not.
  - `registeredMods.spec.ts` (or a spec beside the merge, with made-up supports): two supports' groups and locks are concatenated, not first-wins; a support with none adds nothing.
  - A `placeFragments` spec on a made-up world: a tier whose only group's bucket no one places ends locked, and the build throws naming that tier.
  - Tomb-treasure: its support gives one group per non-starter tier and one map-piece lock per tomb.
- [ ] **Step 2: Run** `yarn test src/worldGen/reachability src/worldGen/placeFragments src/mods/registeredMods src/mods/tombTreasure` — FAIL.
- [x] **Step 3: Implement.** Comments say AND across contributors, OR within a group, and why stock counts as held (the guard owns money).
- [x] **Step 4: Run** the specs — PASS. `yarn check-types`, `yarn lint`.
- [x] **Step 5: Byte-identical probe** (the one bake before Task 8): `git status --short` clean, then `timeout 900 yarn generate-world`, then `git diff --quiet src/data` must hold (no byte moved: the tomb-treasure mod alone gives the same gates, and harvesting a shop's map piece changes no placement). Restore with `git checkout src/data` if anything was written. A moved byte stops the task: report what moved.
- [x] **Step 6: Per-task review** (soundness): AND semantics everywhere both hooks were read; no core file names a currency; the guard's new throw cannot fire on today's world (the probe).
- [x] **Step 7: Commit** — `refactor: gates hold every mod's requirement, shops are harvested`

---

### Task 2: The gate walk, handed to validators and the loot report (**soundness**: reachability) — Opus

**Files:**

- Create: `src/worldGen/gateWalk.ts`, `src/worldGen/gateWalk.spec.ts`
- Modify: `src/worldGen/placeFragments.ts` (export the support merge it builds, `mergeReachabilitySupport(currencies, support)`; return the walk with `reachableRewards`)
- Modify: `src/worldGen/configBuilder.ts` (hands the walk to every validator)
- Modify: `src/worldGen/validate.ts` (`WorldValidator` gains `walk: GateWalk` as its third argument; the comment says what it answers)
- Modify: `src/worldGen/lootReport.ts` (`LootTotal` unchanged), `src/mods/modDescriptor.ts` (`lootTotals?: (configs, walk: GateWalk) => LootTotal[]`), `src/mods/registeredMods.ts` (`MOD_LOOT_TOTALS(configs, walk)`)
- Modify: `scripts/lootReport.ts` (builds the walk over the baked world, injected the way `scripts/generateWorld.ts` injects support, currencies, key requirements and encounter resolution)
- Modify: the existing validators and `lootTotals` of the hieroglyph, mosaic, shop, trap, camp and tomb-treasure mods only as far as their types need (they ignore the new argument)

**Interfaces:**

- Produces: `GateWalkResult = { rewards: readonly TreasureReward[]; unlockedTiers: ReadonlySet<Tier>; enteredJourneys: ReadonlySet<string>; blocking: ReadonlySet<string> }` and `GateWalk = (withheld?: string) => GateWalkResult`.
- Produces: `makeGateWalk({ configs, journeyMeta, support, resolveRequirements?, resolveEncounter?, cache? }): GateWalk` — each call starts from empty owned counts, settles the harvest to its fixed point in the strict bracket (authored doors need their keys) with `withheld` never counted, and returns what that ground holds: every reward standing in it (room rewards and shop stock alike), the tiers unlocked, the journeys entered and the locks still blocking. Results are memoised per `withheld`. `journeyMetaFor(PYRAMID_JOURNEYS, TOMB_JOURNEYS)` is exported for callers outside `placeFragments`.
- Produces: `placeFragments` returns `{ reachableRewards, walk }`; its walk uses one cache built over the finished (post-fill) world, never the pre-fill `assemblyCache`.

- [ ] **Step 1: Failing tests** (`gateWalk.spec.ts`, made-up configs: two journeys, two tiers, a tier gate on a bucket a reward in the first journey grants, a shop holding a key).
  - With nothing withheld the walk reaches both tiers and journeys and returns every reward in them; withholding the tier's bucket leaves the second tier locked and its rewards out, and the first journey's rewards in; a bucket whose key lies in a shop is held once the shop's room is reached; a withheld bucket is never held even when its reward is in reach (the reward itself is still listed); two calls with the same `withheld` return the same result object (memoised).
  - `configBuilder` (an existing spec with made-up mods): a validator receives a walk whose no-withheld result reaches what the permissive `reachableRewards` lists, minus nothing a strict walk can reach.
  - `lootReport.spec.ts`: `MOD_LOOT_TOTALS`-style aggregation passes the walk through to each contributor (a made-up contributor reads it).
- [ ] **Step 2: Run** `yarn test src/worldGen src/mods` — FAIL.
- [ ] **Step 3: Implement.** The file's top comment says what "before a gate" means (decision 4) and that the walk never decides money. Measure once with a throwaway script (scratchpad, not committed) how long `walk()` plus seven withheld walks take over the real baked world; note it in the task report (no assertion on time).
- [ ] **Step 4: Run** `yarn test src/worldGen src/mods scripts` — PASS. `yarn check-types`, `yarn lint`. `timeout 900 yarn loot-report` prints the same totals as before (no row reads the walk yet) and leaves `docs/loot-report.md` unchanged.
- [ ] **Step 5: Per-task review** (soundness): fresh counts every call; strict bracket; post-fill cache; core names no currency; validators and `lootTotals` still drop with their mods.
- [ ] **Step 6: Commit** — `feat: a gate walk tells what lies before each gate`

---

### Task 3: The purchase table, its stock, price and requirements (**soundness**: world-gen placement) — Opus

**Files:**

- Create: `src/mods/shop/game/purchases.ts`, `src/mods/shop/game/purchases.spec.ts`
- Create: `src/mods/shop/game/reachabilitySupport.ts`, `src/mods/shop/game/reachabilitySupport.spec.ts`
- Modify: `src/mods/shop/game/rewardSchemas.ts` (`purchaseRewardSchema`)
- Modify: `src/mods/shop/game/pricing.ts`, `src/mods/shop/game/pricing.spec.ts`
- Modify: `src/worldGen/shopStock.ts` (+ a spec beside it: `src/worldGen/shopStock.spec.ts`)
- Modify: `src/mods/shop/index.ts` (`shopStock`, `reachabilitySupport`; the descriptor comment says what toggle-off leaves)

**Interfaces:**

- Produces (`purchases.ts`, pure): `PurchaseGate = { tier: Difficulty } | { journeyId: string }`; `Purchase = { id: string; fact: string; price: number; soldAt: { journeyId: string; nth?: number }; opens?: PurchaseGate }`; `PurchaseTable = readonly Purchase[]`; `PURCHASES` — the table above; `purchaseFact(id) = "purchase:" + id`; `purchaseProblems(table, tombJourneyIds)` — a duplicate id or fact, a fact not equal to `purchaseFact(id)`, a price ≤ 0 or not whole, a shop journey that is not a tomb, two purchases opening the same gate, a purchase opening the `starter` or `junior` tier; empty for a sound table. `requirementsFor(table)` → `{ tierGroups(tier): string[][]; entryLocks(journeyId): { bucket; threshold: 1 }[] }`, one group or lock per purchase that opens that gate.
- Produces: `purchaseRewardSchema = { type: "purchase"; id: string }` (zod).
- Produces: `priceFor({ type: "purchase", id }, tier)` = the table's price, flat across tiers; an unknown id is 0.
- Produces: `ShopStockAssignment` = `{ journeyId; nth?; prefers: string }` (a sentinel, as today) **or** `{ journeyId; nth?; reward: TreasureReward }` (placed as it is into the first free stock slot; core does not read its type). A full or missing shop drops the assignment, as today (Task 4 makes that a build failure for purchases).
- Produces: `SHOP_REACHABILITY: ReachabilitySupport` — `bucketForReward` maps a purchase reward to its fact; `tierUnlockGroups` and `journeyEntryLocks` from `requirementsFor(PURCHASES)`. The descriptor's `shopStock` lists one reward assignment per purchase.

- [ ] **Step 1: Failing tests** (made-up tables).
  - `purchases.spec.ts`: each problem above is reported once, naming the purchase; a sound made-up table gives none; `requirementsFor` gives one group per tier-opening purchase, one lock per journey-opening one, nothing for a purchase that opens nothing, and nothing for a gate no purchase names.
  - `reachabilitySupport.spec.ts`: a purchase reward harvests to its fact; any other reward to nothing.
  - `pricing.spec.ts`: a purchase is priced from the table at every tier; fragments, mosaic and map pieces keep their prices.
  - `shopStock.spec.ts`: a reward assignment lands as-is in the first free slot after earlier sentinels; a full shop or an unknown journey drops it; a sentinel assignment behaves as before.
- [ ] **Step 2: Run** `yarn test src/mods/shop src/worldGen/shopStock` — FAIL.
- [ ] **Step 3: Implement.** `purchases.ts` is the shop's one source for prices, shops and gates; its comment says the facts are the vocabulary other mods may name in their data, never import. Prices as in the table above.
- [ ] **Step 4: Run** `yarn test src/mods src/worldGen` — PASS. `yarn check-types`, `yarn lint`. Do not bake.
- [ ] **Step 5: Per-task review** (soundness): purchases enter the world before the worklist; core reads no reward type; nothing gates starter → junior.
- [ ] **Step 6: Commit** — `feat: Fez's tomb shops stock the animals that open the gates`

---

### Task 4: The per-gate guard and money before each gate (**soundness**: the economy guard, reachability) — Opus

One task, two commits.

**Files:**

- Create: `src/mods/shop/game/gateLedger.ts`, `src/mods/shop/game/gateLedger.spec.ts`
- Modify: `src/mods/shop/game/economyGuard.ts`, `src/mods/shop/game/economyGuard.spec.ts`
- Modify: `src/mods/shop/game/lootTotals.ts`, `src/mods/shop/game/lootTotals.spec.ts`

**Interfaces:**

- Consumes: `GateWalk` (Task 2), `PURCHASES`, `priceFor`, `purchaseProblems` (Task 3), `sellValueForItemId`.
- Produces: `GateRow = { gate: string /* the purchase id, or "world" */; opens?: PurchaseGate; income: number; buyable: number; margin: number }` and `gateLedger(walk, table, journeyTier): GateRow[]` — for each purchase with `opens`, the walk withholding its fact: income = Σ money + sell value of the rewards it reaches outside shop stock; buyable = Σ `priceFor` of every shop stock piece it reaches (the purchase itself included, since its shop is reached); plus a `"world"` row from the walk with nothing withheld. `margin = income − buyable`.
- Produces: `purchasePlacementProblems(walk, table, configs)` — a purchase not standing exactly once in the world; standing in another shop than `soldAt`; its own reward absent from the walk that withholds its fact (its shop lies behind its gate); a gate it opens that the no-withheld walk does not open (`unlockedTiers` / `enteredJourneys`); the no-withheld walk leaving any journey of the world unentered or any lock blocking.
- Produces: `runEconomyGuard(configs, walk)` throws on `purchaseProblems`, on `purchasePlacementProblems`, and on every row with a negative margin, the message naming each failing gate with its income, buyable and shortfall. `shopEconomyGuard` keeps `SKIP_ECONOMY_GUARD` (authoring only) and now passes the walk.
- Produces: `shopLootTotals(configs, walk)` adds one row per gate — label `Money before <gate>` (`Money before the expert tier (donkey)`, `Money before expert_treasure_tomb_b (camel)`, `Money in the whole world`), `found` = income, `needed` = buyable, unit coins — and `Purchases in shops`, found = purchases standing in their shop, needed = the table's length. The old "Income against buyable stock" row is the world row.

- [ ] **Step 1: Failing tests** (made-up configs and a made-up walk built with `makeGateWalk` over them, made-up tables).
  - `gateLedger.spec.ts`: a gate's income counts only money and sellables in ground reached without its fact; its buyable counts every stock piece reached without it, its own purchase included, a later shop's stock excluded; the world row counts everything; a purchase that opens nothing gets no row of its own but its price is in the world row and in every gate row whose walk reaches its shop.
  - `economyGuard.spec.ts`: a world whose gate rows all have margin ≥ 0 passes; one gate short throws naming that gate and its numbers; a purchase stocked behind its own gate throws naming it; a purchase missing from the world, or stocked twice, throws; a tier-opening purchase whose gate the full walk does not open throws.
  - `lootTotals.spec.ts`: the gate rows and the purchases row appear with the numbers `gateLedger` gives for the same made-up world.
- [ ] **Step 2: Run** `yarn test src/mods/shop` — FAIL.
- [ ] **Step 3: Implement** the ledger and placement problems — **commit** `feat: the economy guard checks every gate an animal opens`.
- [ ] **Step 4: Implement** the loot-report rows — **commit** `feat: the loot report shows money before each gate`.
- [ ] **Step 5: Run** `yarn test src/mods src/worldGen` — PASS. `yarn check-types`, `yarn lint`. Do not bake.
- [ ] **Step 6: Per-task review** (soundness): the guard reads the walk, never its own reachability; every purchase is proved placed before its gate; failure messages say what to change (a price, a shop) without naming a fix in core.

---

### Task 5: Gate needs in the app — Travel, completion, detector

Sonnet.

**Files:**

- Create: `src/app/pages/gateNeeds.ts`, `src/app/pages/gateNeeds.spec.ts`
- Modify: `src/app/pages/journeyAvailability.ts`, `src/app/pages/journeyAvailability.spec.ts`
- Modify: `src/app/pages/Travel.tsx`, `src/app/pages/Travel.spec.tsx`
- Modify: `src/app/PyramidExpedition/ExpeditionCompletionOverlay.tsx` (+ its spec)
- Modify: `src/app/state/useDetector.ts` (+ its spec if one covers `accessOf`)
- Create: `src/ui/molecules/LockedTierCard.tsx`, `LockedTierCard.stories.tsx`, `LockedTierCard.spec.tsx`
- Modify: `src/ui/organisms/LockedJourneyCard.tsx`, `LockedJourneyCard.stories.tsx`
- Modify: `public/locales/en/common.json`, `public/locales/nl/common.json` (the tier card's frame only: "Nog dicht" / "Not open yet")

**Interfaces:**

- Produces: `Gate = { tier: Difficulty } | { journeyId: string }`; `GateNeed = { key: string; label: string; hint?: string }` (words translated by the owning mod); `registerGateNeeds(useNeeds: () => (gate: Gate) => readonly GateNeed[])`; `useMergedGateNeeds(): { needs(gate): GateNeed[]; unmet(gate, heldKeys): GateNeed[]; open(gate, heldKeys): boolean }` — the concatenation over every registered hook, in registry order (the same hook-registry shape as `journeyContributions.ts`).
- Produces: `isTierUnlocked(difficulty, heldKeys, tierOpen = () => true)`, `comingSoonDifficulty`, `availablePyramidJourneyIds` and `nextPyramidJourneyId` take the same optional predicates (`tierOpen(difficulty)`, `journeyOpen(journeyId)`), all defaulting to open, so a build with no needs behaves as today.
- Produces (ui, stateless): `LockedTierCard` props `{ title: string; needs: { label: string; hint?: string }[]; index?: number; showAnimation?: boolean }`. `LockedJourneyCard` gains optional `needs?: { label: string; hint?: string }[]`, shown under the progress; with `found === required` and needs, the card still shows (complete map, missing animal).
- Travel: a tier whose ladder key is held and whose needs are unmet shows one `LockedTierCard` (title = the tier's name) where its first journey would be, and none of its journeys; a tomb with unmet needs shows `LockedJourneyCard` with its needs even with every map piece in, and is not enterable. Dev mode still opens every pyramid journey and does not open a tomb with an unmet need (only the dev grant does). The completion overlay never offers a journey whose tier or self has an unmet need. The detector reads a piece in such a tier or tomb as `locked`.

- [ ] **Step 1: Failing tests** (made-up needs registered in the spec; no real purchase).
  - `gateNeeds.spec.ts`: two registered hooks' needs for the same gate are both listed; `unmet` drops the ones whose key is held; no hooks → no needs, everything open.
  - `journeyAvailability.spec.ts`: with the ladder key held and `tierOpen` false, no journey of that tier is available and `nextPyramidJourneyId` offers none; with defaults, every existing case is unchanged.
  - `Travel.spec.tsx`: with a made-up need on a tier whose ladder key is held, the tier card with the need's label and hint shows and its journeys do not; holding the need's key shows the journeys; a tomb with all pieces and an unmet need shows the locked card with the need and is not clickable.
  - `LockedTierCard.spec.tsx`: the title and every need with its hint render.
- [ ] **Step 2: Run** `yarn test src/app/pages src/app/PyramidExpedition src/app/state src/ui/molecules/LockedTierCard src/ui/organisms/LockedJourneyCard` — FAIL.
- [ ] **Step 3: Implement.** Stories: `LockedTierCard` with one need, two needs, a need without hint; `LockedJourneyCard` with pieces missing plus a need, and complete with a need. Tailwind class order per lint.
- [ ] **Step 4: Run** the specs — PASS. `yarn check-types`, `yarn lint`.
- [ ] **Step 5: Commit** — `feat: a locked tier or tomb says what it still needs`

---

### Task 6: Buying — the shop's store, held keys, needs, words (**soundness**: saves) — Opus

**Files:**

- Create: `src/mods/shop/game/purchaseState.ts`, `src/mods/shop/game/purchaseState.spec.ts`
- Create: `src/mods/shop/app/usePurchases.ts`, `src/mods/shop/app/usePurchases.spec.ts`
- Create: `src/mods/shop/app/gateNeeds.ts`, `src/mods/shop/app/gateNeeds.spec.ts`
- Modify: `src/mods/shop/app/index.ts` (schema, reward handler and display, contribution, held-keys provider, gate needs, dev grant)
- Modify: `src/mods/shop/app/rewardDisplay.tsx` (+ its spec, or create `rewardDisplay.spec.tsx`)
- Modify: `public/locales/en/common.json`, `public/locales/nl/common.json` (the shop's `purchases.*` keys)
- Modify: `docs/review-camp-release.md` (Drafts: the purchase names, need lines and hint, nl / en)

**Interfaces:**

- Produces (game, a state model): `PurchaseSave = { version: 1; purchases: string[] }`, `emptyPurchaseSave()`, `recordPurchase(save, id)` (idempotent), `readPurchaseSave(stored)` (another shape or version → empty), `updatePurchaseSave(prev, change)` (an unreadable stored value is returned untouched, so it is never written over), `heldFacts(save, table)` (the facts of recorded ids the table knows).
- Produces (app): `usePurchases(table = PURCHASES): { save; has(id); record(id); facts: ReadonlySet<string> }` over `useModState("shop", emptyPurchaseSave)`.
- Produces: the reward contribution `effects.purchase` → `record(id)`, `skip` true when already recorded (so Fez shows it sold out); the reward handler (emoji per decision 17, `itemName` = the purchase's name, `itemEffectDescription` = what it opens, or "just for fun" for the banner) and the rich display; `registerRewardSchema("purchase", purchaseRewardSchema)`; `registerHeldKeysProvider(() => usePurchases().facts)`; `registerGateNeeds` from `requirementsFor(PURCHASES)` — for a gate a purchase opens, `{ key: fact, label: purchases.<id>.need, hint: purchases.hint with the selling tomb's translated journey name }`; `registerDevGrants` — "Koop alle dieren" / "Buy every animal" records every purchase.
- Keys (namespace `common`): `purchases.<id>.name` ("Ezel" / "Donkey", "Kar" / "Cart", "Kameel" / "Camel", "Tweede ezel" / "Second donkey", "Tweede kameel" / "Second camel", "Stevigere kar" / "Sturdier cart", "Karavaanvaandel" / "Caravan banner"); `purchases.<id>.need` for the six that open something ("Je hebt een ezel nodig" / "You need a donkey", …); `purchases.<id>.opens` (what Fez's list says it does); `purchases.hint` ("Fez verkoopt er een in {{place}}" / "Fez sells one in {{place}}"); `purchases.devGrant`.

- [ ] **Step 1: Failing tests** (made-up table and saves).
  - `purchaseState.spec.ts`: recording twice changes nothing; `heldFacts` gives the facts of known ids and ignores an unknown id, which stays in the save; `readPurchaseSave` of `undefined`, a number, a `version: 2` object gives the empty save, of a v1 save gives it back; `updatePurchaseSave` over a `version: 2` value returns that value unchanged.
  - `usePurchases.spec.ts` (renderHook over the real `useModState` with fresh storage): `record` makes `has` true and puts the fact in `facts`; the stored value carries `version: 1` and ids only; through `useMergedHeldKeys` (the shop app entrypoint imported) the fact is held.
  - `gateNeeds.spec.ts` (shop's): for a made-up table, the gate a purchase opens has one need keyed by its fact with its label and a hint naming the selling journey; a gate no purchase opens has none; a purchase that opens nothing adds no need.
  - `rewardDisplay` spec: a purchase reward shows its name and what it opens; applying it through `mergeContributions` records it; a recorded one is skipped.
- [ ] **Step 2: Run** `yarn test src/mods/shop` — FAIL.
- [ ] **Step 3: Implement.** Fez's shop component needs no change beyond the display (the buy list already renders every stock slot through `rewardText` and marks a skipped one sold out); confirm in the spec that a purchase in stock is listed with its table price.
- [ ] **Step 4: Draft** the words, nl first; list them under Drafts as `Phase 4 — purchases`.
- [ ] **Step 5: Run** `yarn test src/mods src/app src/i18n` — PASS. `yarn check-types`, `yarn lint`.
- [ ] **Step 6: Per-task review** (soundness): ids only; never writes over an unreadable save; the gate opens through held keys alone; nothing in core names a purchase.
- [ ] **Step 7: Commit** — `feat: buying an animal from Fez opens its gate`

---

### Task 7: The animal arrives in the camp (**soundness**: saves) — Opus

**Files:**

- Modify: `src/mods/camp/game/campSteps.ts`, `src/mods/camp/game/campSteps.spec.ts` (`purchase` on bought steps)
- Modify: `src/mods/camp/game/campState.ts`, `src/mods/camp/game/campState.spec.ts` (v2, `arrived`, `arrive`)
- Modify: `src/mods/camp/app/useCampProgress.ts`, `src/mods/camp/app/useCampProgress.spec.ts`
- Modify: `src/mods/camp/app/index.ts` (the homecoming also lands arrivals)
- Create: `src/mods/purchaseFacts.verify.ts` (the aggregate-level agreement; see Global Constraints for where it goes if lint refuses it)

**Interfaces:**

- Produces: `CampStepEntry.purchase?: string` — the fact whose holding brings the step (a plain string; the camp imports nothing of the shop). `campStepProblems` also reports a bought step without `purchase` and a `purchase` on a step that is not bought. `CAMP_STEPS` gets the facts per the purchase table (`halter`, `donkey`, `saddlebags` → `purchase:donkey`; `cart` → `purchase:cart`; `camel`, `waterTrough` → `purchase:camel`; `secondDonkey` → `purchase:secondDonkey`; `secondCamel` → `purchase:secondCamel`; `paintedCart` → `purchase:sturdyCart`; `caravanBanner` → `purchase:caravanBanner`).
- Produces: `CampSave = { version: 2; finds; parts; grown; arrived: string[] }`; `readCampSave` reads a v1 save as v2 with `arrived: []` and keeps every id; another shape or an unknown version reads as empty and `updateCampSave` leaves it untouched; `arrive(save, table, heldKeys)` adds every bought step whose `purchase` is held and which has not arrived (idempotent); `inPlace` includes arrived steps.
- Produces: the camp's homecoming hook reads `useMergedHeldKeys()` and runs `arrive` before `grow`, both judged on the save as it stood on arriving home.
- Produces: `purchaseFacts.verify.ts` — with both mods registered: every camp `purchase` is the fact of a purchase in the shop's table; every shop purchase is named by at least one camp step.

- [ ] **Step 1: Failing tests** (made-up tables and saves).
  - `campSteps.spec.ts`: the two new problems are reported, naming the step.
  - `campState.spec.ts`: a v1 save reads as v2 with no arrivals and its finds, parts and growth intact; an unknown version reads as empty and `updateCampSave` returns it untouched; `arrive` with a held fact adds all its steps at once, twice changes nothing; a bought step without its fact held is not in place; an arrived step is in `campFound`.
  - `useCampProgress.spec.ts`: with a made-up held-keys provider registered and the camp app entrypoint imported, running `useHomecoming()`'s merged handler lands the bought steps; the stored value carries `version: 2`.
- [ ] **Step 2: Run** `yarn test src/mods/camp` — FAIL.
- [ ] **Step 3: Implement.** The state file's comment says an animal arrives on coming home because it is ordered, not carried.
- [ ] **Step 4: Run** `yarn test src/mods src/app`, `yarn vitest run --config vitest.verify.config.ts src/mods/purchaseFacts` (and `src/mods/camp`) — PASS. `yarn check-types`, `yarn lint` (sibling-import rule at zero).
- [ ] **Step 5: Per-task review** (soundness): v1 upgrade loses nothing; unknown versions never clobbered; arrivals only through held keys; the camp still imports no sibling.
- [ ] **Step 6: Commit** — `feat: a bought animal waits in the camp on coming home`

---

### Task 8: Docs, bake, report, toggle-off, gate, look (**soundness**: the bake and the guard)

Docs step Sonnet; the rest Opus.

**Files:**

- Modify: `docs/game-design/shop-mechanic.md` (purchases, prices from the table, the per-gate guard), `docs/game-design/keys-and-locks-solver.md` (the gate walk; Task 1 already wrote the AND gates), `docs/superpowers/specs/2026-10-23-camp-loot-design.md` (only a "Built" line under "No softlock" pointing at `gateLedger.ts`; the spec's text stays)
- Modify (by the bake): `src/data/generatedWorld.ts`, `src/data/carveLedger.json`
- Modify: `src/data/tierFingerprints.json` (every tier that moved, deliberately)
- Modify (by the script): `docs/loot-report.md`
- Modify: `src/mods/shop/game/purchases.ts` (only if a price must come down, by Step 3's rule)
- Modify: `docs/review-camp-release.md`, `CHANGELOG.md` (`## Unreleased`, one line: animals bought from Fez open the next tier and the optional tombs), this plan (tick boxes)

**Interfaces:** none.

- [ ] **Step 1: Docs** (Sonnet, one agent): the three doc edits above, current state only. Commit `docs: animals, gates and the per-gate guard`.
- [ ] **Step 2: Before** — `timeout 900 yarn loot-report` on the committed bake; keep its totals and per-tier table in the scratchpad.
- [ ] **Step 3: Bake** — `timeout 900 yarn generate-world`. If the per-gate guard fails on a margin: lower the prices of the purchases reached before that gate by 50 at a time, the one closest to the gate first, never below 100, and bake again; aim for a margin ≥ 10 % of the gate's buyable. A placement problem (a purchase behind its own gate, a full shop) or a failure after two rounds stops the phase: write it under Failures, fix the cause in the task that owns it (a fresh subagent), never with `SKIP_ECONOMY_GUARD`.
- [ ] **Step 4: Report** — `timeout 900 yarn loot-report`. Required: "Purchases in shops" exact; every "Money before …" row with found ≥ needed; chests and path ends filled 100 % on every tier; camp finds, parts, fragments, mosaic, map pieces and tomb treasures still exact; waterskins 60. Commit `docs/loot-report.md` with the bake.
- [ ] **Step 5: Fingerprints** — `yarn vitest run --config vitest.verify.config.ts src/data/tierFingerprints.verify.ts`; for every tier that moved, copy its new hash and write one line per tier in the review list saying why (an animal in its tomb shop; coins and sellables moved by the shop's larger budget).
- [ ] **Step 6: Commit the bake** — `chore: bake the world with animals in Fez's tomb shops`
- [ ] **Step 7: Toggle-off, shop** — remove `shopMod` (and its import) from `src/mods/registeredMods.ts`; each under `timeout 900`: `yarn generate-world` (passes: no purchase requirement, no guard), `yarn check-types`, `yarn build`, `yarn loot-report` (no money or gate rows); confirm with `grep -c '"purchase"' src/data/generatedWorld.ts` that no purchase stands in the world, and that `src/app/pages/gateNeeds.spec.ts`'s "no hooks → everything open" holds for the build. Restore: `git checkout src/mods/registeredMods.ts src/data/ docs/loot-report.md`; `git status --short` clean.
- [ ] **Step 8: Toggle-off, camp** — the same with `campMod`: bake, `yarn check-types`, `yarn build`, `yarn loot-report` (purchases and gate rows still there, no camp rows). Restore and confirm clean.
- [ ] **Step 9: Gate** — each under `timeout 900`: `yarn verify`, `yarn verify-content` (includes `purchaseFacts.verify.ts` and the camp catalogue agreement), `yarn build`. All pass.
- [ ] **Step 10: Look** — `yarn storybook`: `LockedTierCard` and `LockedJourneyCard` with needs; screenshot each. `yarn dev`: with dev grants give the junior tomb treasures but no donkey; Travel shows the expert tier card "Je hebt een ezel nodig — Fez verkoopt er een in …"; enter the junior tomb's cavern, open Fez's shop, see the donkey at its price, buy it (dev money if short); back in Travel the expert journeys are pickable; leave to base and check the camp save (IndexedDB) carries `arrived` with `halter`, `donkey`, `saddlebags`. Screenshot. Anything not reachable unattended goes under Look at in browser with steps.
- [ ] **Step 11: Record** in `docs/review-camp-release.md`: this plan's 21 decisions under Decisions; a "Phase 4 gates" block — per purchase its shop, price, gate, and the gate's income / buyable / margin from the report, any price lowered in Step 3 and why; coins and sellables before → after; the fingerprint lines; the two toggle-off results and the gate results; under Look at in browser: the tier card, a tomb card with a complete map and no camel, buying the donkey, the animals in the camp (phase 6 mounts the scene). Tick this plan's boxes. CHANGELOG line.
- [ ] **Step 12: Commit** — `docs: phase 4 gate numbers in the review list`

The driver then runs the phase review (Sonnet), pushes the branch, ticks Phase 4 in `docs/handover-camp-release.md` and adds one line to its State.
