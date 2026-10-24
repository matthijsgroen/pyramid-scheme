# Camp phase 1 — consumables out, healing at the camp — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This plan says what to build, which files, and what the tests prove; it carries no code (docs/instructions/agent-work.md).

**Goal:** Bandage, oil and trap tool stop existing. Traps still bite; inside a site only a **waterskin** (trap-owned, expert-and-up puzzle loot) heals, on pickup, and is always used up. Every return to base refills the hearts through a core **coming-home** seam the trap mod registers into. Pack-mule now makes a waterskin heal two hearts; the supplies detector is gone.

**Architecture:** Core gains one app seam, `homecomingRegistry` (mods register a hook returning a handler; `App.tsx` runs the merged handler whenever it leaves the expedition for the base) and loses three trap-shaped things: the `canAccept` refusal on reward contributions, the left-behind chest flow (`skippedConsumables`, `offerSkipped`, `consumableFull`, the pending-chest badge) and the write-only `disabledTraps` store. The trap mod swaps its two consumable distributions for one `trapWaterskins` distribution and its pack for a `drinkWaterskin` / `restoreHealth` pair. The shop mod loses consumable pricing and the "Supplies" section, and keeps its money budget the size it is with an authored allowance until phase 5 recomputes the economy. The supplies detector leaves core's detector seam and UI.

**Tech Stack:** TypeScript, React 19, Vitest + Testing Library, Storybook, zod reward schemas, the world-gen allocator (`src/worldGen/slotAllocator.ts`), the bake (`yarn generate-world`).

**Spec:** `docs/handover-camp-release.md` (Phase 1 brief, Decisions 2–5), `docs/superpowers/specs/2026-10-23-camp-loot-design.md` (the loot model), `docs/game-design/camp.md` §1–2 (direction), `docs/mods/TARGET.md` (core names no mod; toggle-off is the gate).

## Global Constraints

- **Branch** `camp/home-and-loot` only. Never `git pull`, never a bare `git stash`, never switch branches. Commit after every task.
- **Saves reset at the starter release.** No migration and no backfill for removed shapes (`TrapState.consumables`, `JourneyProgress.disabledTraps` / `skippedConsumables`, the `consumable-detector` perk). Existing backfill hooks stop reading the removed fields; they are not extended.
- **Core is mod-agnostic.** `src/app`, `src/ui`, `src/game`, `src/data`, `src/worldGen` never name trap, health, waterskin or shop; the `no-restricted-imports` rules stay at zero. The homecoming seam is generic (it does not know what a mod does on coming home).
- **No unit test pins authored lock or puzzle contents, or a count of the real world.** Tests use made-up slots, sites and worlds. The waterskin count and per-tier spread are asserted on made-up slots.
- **Comments state the current state and why, never history** ("replaces", "used to", "no longer"). Delete a comment that only explains a removed thing.
- **Commits:** one subject line, `type: what changed`, ≤ 72 chars, ending with the session's attribution trailer.
- **Strings:** every new or changed user-facing string in both `public/locales/en/` and `public/locales/nl/`. Removed keys leave both.
- **Stories:** every `src/ui/` component that changes props keeps a story that renders its current props; a new `src/ui/` component gets a story beside it. A deleted component's story is deleted with it.
- **Domain code** (`src/game/`, `src/data/`, `src/worldGen/`, `src/mods/*/game/`) stays pure TypeScript: no React, no i18n, no DOM.
- **Checks per task:** the task's own specs (plus every spec the task's grep lists), `yarn check-types`, `yarn lint`. Only Task 9 runs the bake, `yarn verify`, `yarn verify-content` and `yarn build`, each under `timeout 900`.
- **The bake will change** in Task 9 and only there: consumable puzzle slots become waterskins on expert-and-up; shop stock slots that held consumables fall empty; coins and sellables shift slightly with the waterskin count. **Every chest and path end must still carry loot; a puzzle room may be empty.** Every tier fingerprint that moves is updated deliberately in Task 9, with the reason in the review list. Never edit a baked number by hand.
- **Unrelated "oil"**: the canister puzzle's oil skin (`src/mods/puzzle/**/canisters`, `common.json` canister keys, the Dutch tableau text) is not a consumable. Leave it.
- The phase's last step updates the handover's "State" and ticks Phase 1 there (driver's job, not a task).

## Review Focus

1. **Hearts refill on every return to base and nowhere else:** the back button, a finished journey, a revisit that ends on the map, backing out of an interior — all through `App.tsx`'s exits — pinned in Task 2. Chaining into the next journey from the completion overlay is not a homecoming (phase 6 removes that path).
2. **A waterskin at full health heals nothing and is still gone:** the chest shows it once, it is never offered again, nothing is remembered — pinned in Task 3.
3. **Pack-mule doubles the waterskin, nothing else:** 2 half-hearts without it, 4 with it, capped at max health — pinned in Task 3.
4. **Waterskins land only on expert-and-up puzzle slots, never on a chest, path end or shop slot, spread evenly over the three tiers** — pinned in Task 3 on made-up slots, measured in Task 9 on the real world.
5. **The shop's money budget does not shrink** when the consumable stock leaves (the allowance) and the economy guard still passes — pinned in Task 4, measured in Task 9.
6. **No chest and no path end is empty after the bake** — measured in Task 9; a failure stops the phase.
7. **Core never names trap**: the homecoming seam, the reward seam without `canAccept`, the detector seam without supplies — the lint import rules and a trap-off bake + build in Task 9.

## Decisions for the review list

Each is the option that changes the least shipped behaviour; Task 1 writes them into `docs/review-camp-release.md` under Decisions.

1. **60 waterskins, not 150.** The loot spec's decided total (~60) wins over the brief's "one for one where possible"; the waterskins take consumable slots (same eligibility), the other ~90 freed expert-and-up puzzle slots wait for phase 3's camp loot. Alternative: 150, keeping today's expert-and-up puzzle-loot share.
2. **Waterskins spread evenly by tier** (expert, master, wizard: 20 each), round-robin over sites within a tier, slots in path order. A trial bake with today's site-id round-robin and a cap of 60 gave 28 / 28 / 4. Alternative: proportional to each tier's puzzle slots.
3. **The shop's money budget keeps its size:** an authored allowance of 1070 coins (the price of the consumable stock that leaves, measured on today's bake: buyable 7370 → 6300) is added to the budget floor until phase 5 recomputes the economy. A trial bake with it kept every money and sellable total identical; without it, starter puzzle loot fell from 77% to 48% and junior from 38% to 24%. Alternative: let the budget fall to the rare stock.
4. **Shop stock slots trap used to fill stay empty**: Fez sells fewer things (junior 4 of 6 slots empty, expert and master 9 of 12, wizard 13 of 18) until phase 4 sells the animals there. The shop's "Supplies" section goes. Alternative: fill them with rares or sellables.
5. **Pack-mule keeps its perk id `pack-mule`**; only its meaning and label change ("A waterskin heals two hearts"). Alternative: rename the id.
6. **The supplies detector's three treasures** (`expert_b_1`, `master_b_1`, `wizard_b_1`) carry perk `none`.
7. **Waterskin:** reward type `waterskin`, icon 💧, "Waterskin" / "Waterzak"; heals one heart (2 half-hearts); the popup is the plain reward popup with no "you are not hurt" variant. Alternative: a popup that says whether it healed.
8. **Disarming a trap goes with the trap tool**, with no replacement: a trap is beaten or turned away from.
9. **Coming home** fires on `App.tsx`'s two exits to the base (journey complete, close). Not on chaining into the next journey (phase 6 removes it) and not on an app reload that opens on the base.
10. **Fez's `shopArrival2`** loses "everyday supplies" (en + nl) — listed under Drafts.

---

### Task 1: The review list

**Files:**

- Create: `docs/review-camp-release.md`

**Interfaces:** none (a document the designer reads first).

- [x] **Step 1:** Create the file with four sections in this order: **Decisions**, **Drafts**, **Failures**, **Look at in browser**. One line per entry. A short header (two sentences) says what the file is: the designer's morning list for the unattended camp-release queue, newest phase last within each section.
- [x] **Step 2:** Seed **Decisions** with the queue's seven defaults from `docs/handover-camp-release.md` ("Defaults this queue takes"), one line each, each marked `(queue default)`: camp mod; waterskin in the trap mod; healing at the camp fire; coming home fires on every return; pack-mule and supplies detector; animal prices; where things live once the pager is gone.
- [x] **Step 3:** Add this plan's ten "Decisions for the review list" under Decisions, each prefixed `Phase 1 —`, one line each, with its alternative.
- [x] **Step 4:** Under **Drafts**, add one line for Fez's `shopArrival2` (filled in by Task 8). Under **Look at in browser**, add: hearts refill after leaving an expedition; the waterskin popup; Fez's shop without supplies; the trap warning without heal or disarm buttons; the HUD without the supplies bar; the detector toggles without the supplies detector.
- [x] **Step 5:** `yarn lint` (Prettier formats markdown). Commit — `docs: the camp release review list`

---

### Task 2: The coming-home seam; the trap mod refills hearts

**Files:**

- Create: `src/app/homecomingRegistry.ts`, `src/app/homecomingRegistry.spec.ts`
- Modify: `src/App.tsx` (both exits to the base run the merged homecoming handler first)
- Modify: `src/mods/trap/app/useTrapProgress.ts` (adds `restoreHealth`)
- Modify: `src/mods/trap/app/index.ts` (registers the homecoming contribution)
- Test: `src/mods/trap/app/useTrapProgress.homecoming.spec.ts` (create)

**Interfaces:**

- Produces: `registerHomecoming(useContribution: () => () => void)` and `useHomecoming(): () => void` — the same hook-registry shape as `rewardContributions.ts` / `perkContributions.ts`: a registry filled once at module load, hooks called in registry order, the returned function runs every contribution's handler in registry order. No registrations → a no-op.
- Produces: `TrapProgressAPI.restoreHealth(): void` — sets health to the current derived `maxHealth`.
- Consumes: `App.tsx`'s `onJourneyComplete` and `onClose` (the only two paths that set `inGame` to false).

- [x] **Step 1: Failing tests.**
  - `homecomingRegistry.spec.ts`: the merged handler runs every registered handler once, in registration order; with none registered it is a no-op; a handler reads its hook's latest state (a contribution backed by `useState` sees the value from the last render). Test the merge as a pure fold beside the hook, as `mergeContributions` is tested.
  - `useTrapProgress.homecoming.spec.ts`: after two trap hits, `restoreHealth` brings `currentHealth` back to `maxHealth`; with a max-health perk earned it fills to the raised ceiling; at full health it changes nothing.
  - No `App`-level test: the two exits are one-line calls; Review Focus 1 is checked in the browser in Task 9.
- [x] **Step 2: Run** `yarn test src/app/homecomingRegistry src/mods/trap` — FAIL.
- [x] **Step 3: Implement.** The registry file's comment says what coming home is (the player is back at base: a journey ended or they left it) and that mods own what happens then. `App.tsx` calls `useHomecoming()` once and runs the handler before `setInGame(false)` in `onJourneyComplete` and `onClose`; `onStartJourney` is untouched. The trap app entrypoint registers a contribution returning `useTrapProgress().restoreHealth`, inside its existing `isModEnabled("trap")` block.
- [x] **Step 4: Run** the specs — PASS. `yarn check-types`, `yarn lint`.
- [x] **Step 5: Commit** — `feat: hearts refill whenever you come back to camp`

---

### Task 3: The waterskin — trap's heal on pickup, and its placement (**soundness**: world-gen placement)

**Files:**

- Create: `src/mods/trap/game/waterskin.ts`, `src/mods/trap/game/waterskin.spec.ts` (heal rule, pure)
- Create: `src/mods/trap/game/waterskins.ts`, `src/mods/trap/game/waterskins.spec.ts` (the distribution)
- Modify: `src/mods/trap/index.ts` (`dynamicDistributions`: `trapWaterskins` in place of `trapConsumables`; `trapShopStock` stays until Task 4; descriptor comment)
- Modify: `src/mods/trap/app/rewardSchema.ts` (adds `waterskinRewardSchema`)
- Modify: `src/mods/trap/app/rewardDisplay.ts` (registers the `waterskin` reward handler: name + icon)
- Modify: `src/mods/trap/app/index.ts` (schema registration; reward contribution effect `waterskin` → `drinkWaterskin`; pack-mule describe label)
- Modify: `src/mods/trap/app/useTrapProgress.ts` (adds `drinkWaterskin`; pack-mule now reads as the waterskin bonus)
- Modify: `src/mods/trap/app/useTrapProgress.perks.spec.ts` (adds the waterskin meaning of pack-mule; the carry-cap assertions leave with the pack in Task 5)
- Modify: `public/locales/en/common.json`, `public/locales/nl/common.json` (`chest.waterskin`, and a description key if the reward popup shows one)
- Modify: `public/locales/en/treasures.json`, `public/locales/nl/treasures.json` (`perks.pack-mule`: "A waterskin heals two hearts" / "Een waterzak geneest twee harten")

**Interfaces:**

- Produces (game): `waterskinHeal(currentHealth: number, maxHealth: number, packMuleStacks: number): number` — the new health in half-hearts: +2, or +4 with pack-mule, never above `maxHealth`; at `maxHealth` returns it unchanged. `WATERSKIN_HEAL` and `PACK_MULE_WATERSKIN_HEAL` constants live beside it.
- Produces (game): `trapWaterskins: Distribution` — id `trap-waterskins`; eligible: `kind === "puzzle" && rewardPriority > 0 && tier ≥ expert` (the consumable rule, unchanged); footprint `{ min: 0, max: WATERSKIN_COUNT }` with `WATERSKIN_COUNT = 60`; rank: round-robin over tiers in difficulty order, within a tier round-robin over sites in id order, within a site slots in `puzzleSeq` order (deterministic, seed-free); fill assigns `{ type: "waterskin" }`.
- Produces (app): `waterskinRewardSchema = z.object({ type: z.literal("waterskin") })`; `TrapProgressAPI.drinkWaterskin(): void`.

- [x] **Step 1: Failing tests** (made-up slots and states only).
  - `waterskin.spec.ts`: heals one heart when hurt by one or more; heals two hearts with pack-mule; never above max; at full health returns the same health.
  - `waterskins.spec.ts`: over a made-up slot set (three tiers × several sites × several puzzle slots, plus chests, path ends, a fez-shop slot and starter/junior puzzle slots), allocation through `allocateDistributions` gives at most 60 waterskins; none on a non-puzzle slot, a `rewardPriority` 0 slot, a shop slot or a tier below expert; the three tiers differ by at most one when each has more than 20 eligible slots; a tier with fewer eligible slots than its share gives the rest to the others; the same input ranks the same way twice.
  - `useTrapProgress.perks.spec.ts`: drinking a waterskin after a hit restores one heart; with `starter_a_3`'s pack-mule perk held it restores two; at full health it changes nothing.
  - A reward-contribution test (in the trap app's existing spec location, or `useTrapProgress.perks.spec.ts`): applying a `waterskin` reward through the merged contributions calls the heal; the reward is never refused.
- [x] **Step 2: Run** `yarn test src/mods/trap` — FAIL.
- [x] **Step 3: Implement.** The distribution's comment says why it is capped and why the tier round-robin (an even spread at a small cap; the site-id order alone fills expert and master first). The descriptor comment says trap owns health, its damage and the waterskin, and that with trap off no waterskin is placed.
- [x] **Step 4: Run** `yarn test src/mods/trap src/worldGen/slotAllocator` — PASS. `yarn check-types`, `yarn lint`.
- [x] **Step 5: Per-task review** (soundness): eligibility unchanged from the consumable rule; no chest, path end or shop slot can be claimed; the rank is deterministic.
- [x] **Step 6: Commit** — `feat: waterskins heal on pickup, on expert-and-up puzzles`

---

### Task 4: Consumables out of world-gen and the shop (**soundness**: the economy guard)

**Files:**

- Delete: `src/mods/trap/game/consumables.ts`, `src/mods/trap/game/consumables.spec.ts` (`consumableTypes.ts` stays until Task 5: the trap app still imports it)
- Modify: `src/mods/trap/index.ts` (no `trapShopStock`; `dynamicDistributions: [trapWaterskins]`)
- Modify: `src/mods/shop/game/pricing.ts`, `src/mods/shop/game/pricing.spec.ts` (no `CONSUMABLE_PRICES`, no `consumable` case)
- Modify: `src/mods/shop/game/loot.ts`, `src/mods/shop/game/loot.spec.ts` (the budget floor adds the allowance)
- Modify: `src/mods/shop/game/economyGuard.ts`, `src/mods/shop/game/economyGuard.spec.ts` (comments: buyable is the priced stock; no restock)
- Modify: `src/mods/shop/app/fezShop/plugin.tsx` (one buy list; no `canAccept` call; comments)
- Modify: `src/ui/organisms/FezShop.tsx`, `src/ui/organisms/FezShop.stories.tsx` (no `consumables` / `suppliesLabel` props, no Supplies section)
- Modify: `src/worldGen/dsl.ts` (no `consumableRates` on either constraint; `wardPathTrapped` doc says the return trip costs health), `src/worldGen/spec/global.ts` (no `consumableRates` default)
- Modify: `src/worldGen/serializer.spec.ts` (fixture reward: a `waterskin` or `money` in place of the consumable)

**Interfaces:**

- Produces: `priceFor(reward, tier)` prices only fragments, mosaic and map pieces (everything else 0).
- Produces: the shop money budget floor = `totalBuyable(allConfigs) + MONEY_ALLOWANCE` (name the constant for what it is: coins the world carries beyond the priced stock), `MONEY_ALLOWANCE = 1070`; the ceiling, junk share and puzzle-coin share stay multipliers of that floor. `runEconomyGuard` is unchanged in logic (income ≥ buyable).
- Produces: `FezShop` props without `consumables` and `suppliesLabel`.

- [x] **Step 1: Failing tests.**
  - `loot.spec.ts`: on a made-up world whose shop stock prices to P, the placed money-equivalent lies between `P + allowance` and `round((P + allowance) × 1.1)`; with an empty stock it still places the allowance.
  - `pricing.spec.ts`: a `consumable`-typed reward prices 0 (unknown types are free); the fragment / mosaic / map prices are unchanged.
  - `economyGuard.spec.ts`: keeps passing on its made-up worlds; any fixture using consumable stock switches to a priced currency piece.
- [x] **Step 2: Run** `yarn test src/mods/shop src/mods/trap src/worldGen/serializer` — FAIL where the specs changed.
- [x] **Step 3: Implement.** The allowance comment says what it keeps (finds pay out at the rate the world was tuned to) and where its number comes from (the stock the world no longer sells), without history words. `grep -rn "consumable" src/mods/shop src/ui/organisms/FezShop* src/worldGen/dsl.ts src/worldGen/spec/global.ts` is empty afterwards.
- [x] **Step 4: Run** `yarn test src/mods/shop src/mods/trap src/worldGen src/ui/organisms` — PASS. `yarn check-types`, `yarn lint`.
- [x] **Step 5: Per-task review** (soundness): the guard still compares all income to all buyable stock; the budget floor never falls below buyable; nothing in core learned a shop or trap name.
- [x] **Step 6: Commit** — `feat: Fez stops selling supplies; the world places none`

---

### Task 5: The pack leaves the trap mod

**Files:**

- Delete: `src/mods/trap/app/ConsumableBar.tsx`, `src/mods/trap/app/ConsumableBar.stories.tsx`, `src/mods/trap/app/consumableEmoji.ts`, `src/mods/trap/app/consumableEmoji.spec.ts`, `src/mods/trap/game/consumableTypes.ts`, `src/mods/trap/game/consumableTypes.spec.ts`
- Modify: `src/mods/trap/app/useTrapProgress.ts` (state is `{ health }`; no `consumables`, carry cap, `isConsumablePackFull`, `addConsumable`, `useConsumable`, `consumableDetectorLevel`)
- Modify: `src/mods/trap/app/useTrapProgress.perks.spec.ts` (no carry-cap or detector assertions)
- Modify: `src/mods/trap/app/TrapHud.tsx` (hearts only), `src/mods/trap/app/TrapWarningScreen.tsx` (attempt and turn around only; no heal, no disarm), `src/mods/trap/app/TrapFamilyShell.tsx` (no `onHeal` / `onDisable`, no `markTrapDisabled`)
- Modify: `src/mods/trap/app/rewardSchema.ts`, `src/mods/trap/app/rewardDisplay.ts` (no consumable schema or handler)
- Modify: `src/mods/trap/app/index.ts` (no `consumable` effect, no `canAccept`, no `consumable-detector` in `TRAP_PERKS`, no supplies detector registration; header comment lists what trap registers now)
- Modify: `src/ui/atoms/HealthDisplay.tsx`, `src/ui/atoms/DetectorButton.tsx` (comments naming "the supplies" in the HUD row)

**Interfaces:**

- Produces: `TrapProgressAPI = { currentHealth, maxHealth, armorStacks, trapInsightStacks, isTrapAttemptSafe, takeTrapDamage, restoreHealth, drinkWaterskin }`.
- Produces: `TrapWarningScreen` props `{ currentHealth, maxHealth, attemptSafe, onAttempt, onTurnAround }`.

- [x] **Step 1: Tests.** `useTrapProgress.perks.spec.ts` asserts the API above (no pack members) and that a hit still costs `trapDamage(armor)`; any spec of the warning screen asserts no heal or disarm button renders.
- [x] **Step 2: Implement**, then `grep -rnE "bandage|trapTool|ConsumableBar|useConsumable|addConsumable|consumableDetectorLevel" src/mods/trap` — empty.
- [x] **Step 3: Run** `yarn test src/mods/trap src/ui/atoms` — PASS. `yarn check-types`, `yarn lint`.
- [x] **Step 4: Commit** — `feat: no pack of supplies; traps are beaten or walked away from`

---

### Task 6: The supplies detector out of core and the treasures

Runs before Task 7: `useDetector` reads the skipped-chest store Task 7 removes.

**Files:**

- Modify: `src/mods/tombTreasure/game/treasurePerks.ts` (no `consumable-detector` in `TreasurePerk`; `expert_b_1`, `master_b_1`, `wizard_b_1` → `none`)
- Modify: `src/mods/tombTreasure/app/devGrants.spec.tsx` (no `levels.supplies`)
- Modify: `src/app/SiteMap/detectorLevels.ts` (modes `compass` and `corridor` only)
- Modify: `src/game/siteTypes.ts` (`DetectorMode` without `"consumable"`; delete `ConsumableResult`; the shop-stock comment says currency pieces)
- Modify: `src/game/perkTotals.ts` (comment examples)
- Modify: `src/app/state/useDetector.ts`, `src/app/state/useDetector.spec.ts`, `src/app/state/useDetector.access.spec.ts` (no `consumableResults`)
- Modify: `src/app/SiteMap/useDetectorBand.ts`, `src/app/SiteMap/useDetectorBand.spec.ts`, `src/app/SiteMap/useDetectorReadout.ts`, `src/app/SiteMap/useDetectorReadout.spec.ts`, `src/app/SiteMap/cellProximity.ts` (comment)
- Modify: `src/app/SiteMap/SiteMapScreen.tsx` (no `consumableDetectorLevel` / `consumableResults` props passed)
- Modify: `src/ui/atoms/DetectorPanel.tsx`, `DetectorPanel.spec.tsx`, `DetectorPanel.stories.tsx`, `DetectorToggles.tsx`, `DetectorToggles.spec.tsx`, `DetectorToggles.stories.tsx`, `detectorModeIcons.ts` (two detectors: compass and hidden passageways; no `noSkippedChests` label)
- Modify: `src/app/SiteMap/perkContributions.ts` (comment examples)

**Interfaces:**

- Produces: `DetectorLevelMode = "compass" | "corridor"`, `MergedDetectorLevels = { compass: number; corridor: number }`, `DetectorMode = "compass" | "hiddenPassageway" | null`. `DetectorPanel` / `DetectorToggles` drop `consumableDetectorLevel`, `consumableResults` and `labels.noSkippedChests`.

- [x] **Step 1: Tests.** `DetectorToggles.spec`: with only compass and corridor levels the two buttons render, with both at 0 nothing renders. `DetectorPanel.spec`: no supplies readout path remains (delete its cases; keep compass and corridor). `devGrants.spec`: the grant-all dev action yields compass and corridor levels only. A `treasurePerks` assertion is NOT added (authored content); `yarn check-types` proves the union.
- [x] **Step 2: Implement**, then `grep -rnE "consumable|supplies" src/app/state/useDetector* src/app/SiteMap/*Detector* src/app/SiteMap/detectorLevels.ts src/ui/atoms/Detector* src/ui/atoms/detectorModeIcons.ts src/mods/tombTreasure` — empty.
- [x] **Step 3: Run** `yarn test src/ui/atoms src/app/state src/app/SiteMap/useDetector src/mods/tombTreasure` — PASS. `yarn check-types`, `yarn lint`.
- [x] **Step 4: Commit** — `feat: the supplies detector is gone; its treasures stay as treasures`

---

### Task 7: No refusals, nothing left behind (**soundness**: saves)

**Files:**

- Modify: `src/app/SiteMap/rewardContributions.ts`, `src/app/SiteMap/rewardContributions.spec.ts` (no `canAccept` on `RewardContribution` or the merged result; the comment explains `skip` alone)
- Modify: `src/app/SiteMap/useRewardOffer.ts`, `src/app/SiteMap/useRewardOffer.spec.ts` (no `offerSkipped`; `PendingReward` without `consumableFull`; `offerFound` skips or offers)
- Modify: `src/app/SiteMap/RewardFlow.tsx`, `src/app/SiteMap/RewardFlow.render.spec.tsx` (no full-pack branch)
- Modify: `src/app/SiteMap/useSiteNavigation.ts`, `src/app/SiteMap/useSiteNavigation.spec.ts` (no `onSkippedConsumable`; a completed cell reopens for a staying-open family or unbought shop stock only)
- Modify: `src/app/SiteMap/SiteMapScreen.tsx`, `src/app/SiteMap/SiteMapScreen.spec.tsx` (no pending-consumable cells, no `onSkippedConsumable`)
- Modify: `src/app/SiteMap/SiteMapView.tsx`, `src/app/SiteMap/SiteMapView.spec.tsx` (no `pendingCells` prop and no `"pending"` chest badge, if nothing else sets them — check first)
- Modify: `src/app/state/useJourneys.ts`, `src/app/state/useJourneys.spec.ts` (no `disabledTraps`, `skippedConsumables`, `markTrapDisabled`, `markConsumableSkipped`, `clearConsumableSkipped`, `getSkippedConsumables`)
- Modify: `src/app/SiteMap/cellIdentity.ts`, `src/app/SiteMap/cellIdentity.spec.ts`, `src/app/SiteMap/carveIndependence.spec.ts`, `src/app/SiteMap/useCarveIndependentBackfill.ts`, `src/app/SiteMap/mechanismSlotMigration.spec.ts` (the re-key carries trap- and consumable-free shapes)
- Modify: every `JourneyAPI` fake the type checker names (`grep -rln "markTrapDisabled\|getSkippedConsumables" src`), e.g. `sequenceHarness.testing.tsx`, `lockPlayground.tsx`, `lockFloorWayOut.verify.ts`, `movementInvariant.spec.ts`, `openGate.spec.tsx`, `oneWayPrompt.spec.tsx`, `narrowPassage.spec.tsx`, `spentActivator.spec.tsx`, `regionBarrierDrawing.spec.tsx`, `tapAdmission.spec.ts`, `useDousedJourneys.spec.ts`, `shutWaysOut.spec.tsx`
- Modify: `src/mods/hieroglyph/app/index.ts`, `src/app/SiteMap/applyReward.ts`, `src/app/SiteMap/rewardHandlerRegistry.ts`, `src/app/SiteMap/registerRewardHandlers.ts`, `src/app/SiteMap/rewardSchemas.ts`, `src/app/families/familyRegistry.ts`, `src/game/families/familyMeta.ts` (comments that use the full pack or consumables as their example)

**Interfaces:**

- Produces: `RewardContribution = { effects?, seen?, skip? }`; `MergedRewardContributions = { effects, seen, skip }`. `RewardOffer = { pending, offerFound, dismiss }`; `PendingReward = { reward, keyColors?, onCollect }`.
- Produces: `JourneyProgress` and `JourneyAPI` without the six trap/consumable members. A stored save that still holds the two arrays is ignored (saves reset; no migration).

- [x] **Step 1: Tests.**
  - `rewardContributions.spec`: merged effects and `skip` behave as before; there is no refusal path.
  - `useRewardOffer.spec`: a found reward is offered and applied on collect; a skipped one shows nothing; dismiss calls `seen`. Cases about full packs and re-offers are deleted, not rewritten.
  - `useSiteNavigation.spec`: walking onto a completed chest that held a waterskin repositions the player and offers nothing.
  - `cellIdentity.spec` / `carveIndependence.spec`: the re-key still finds explored cells, opened chests and bought shop slots where they now stand; the trap and consumable cases are deleted.
- [x] **Step 2: Implement**, then `grep -rnE "canAccept|consumableFull|skippedConsumables|SkippedConsumable|disabledTraps|markTrapDisabled|offerSkipped" src` — empty.
- [x] **Step 3: Run** `yarn test src/app src/mods` — PASS. `yarn check-types`, `yarn lint`.
- [x] **Step 4: Per-task review** (soundness): no save reader still expects the removed arrays; the backfills still run on a save without them; the re-key spec covers every store the save keeps.
- [x] **Step 5: Commit** — `refactor: rewards are taken or skipped, never left behind`

---

### Task 8: Words — locale keys, docs, changelog, the world-info count

Mechanical; one agent.

**Files:**

- Modify: `public/locales/en/common.json`, `public/locales/nl/common.json` — remove `trap.heal`, `trap.fullHeal`, `trap.disable`, `chest.consumable.*`, `chest.consumableFull`, `chest.packFull`, `shop.supplies`, `detector.consumableTitle`, `detector.noSkippedChests` (each only after `grep -rn "<key>" src` shows no reader)
- Modify: `public/locales/en/treasures.json`, `public/locales/nl/treasures.json` — remove `perks.consumable-detector`
- Modify: `public/locales/en/fez.json`, `public/locales/nl/fez.json` — `shopArrival2` without "everyday supplies" / "alledaagse spullen", same voice; add the line to the review list's Drafts with both texts
- Modify: `scripts/worldInfo.ts` — counts `waterskin` and `money` puzzle rewards
- Modify: comments in `src/worldGen/slots.ts`, `src/worldGen/slotAllocator.ts`, `src/worldGen/placeFragments.ts`, `src/worldGen/buildSite.ts`, `src/worldGen/lootEconomyInvariants.verify.ts`, `src/worldGen/rewards.spec.ts`, `src/worldGen/spec/expert.ts`, `src/worldGen/spec/junior.ts`, `src/worldGen/spec/master.ts`, `src/mods/modDescriptor.ts`, `src/mods/registeredMods.ts`, `src/mods/shop/app/index.ts`, `src/mods/shop/game/loot.ts` — waterskins / health where they said consumables (comments only: no authored number, no DSL field changes)
- Modify: test fixtures that still use a `consumable` reward as their example (`grep -rln '"consumable"' src`): `useEncounter.spec.ts`, `placeMainContent.spec.ts`, `compassScanner.spec.ts`, `mapPieceCurrency.spec.ts`, `JourneyInspector.stories.tsx` — swap to `waterskin` or `money`
- Modify: `docs/game-design/pyramid-interior-design.md` (§10 loot, §11 trap system: health, loot behind traps, mitigating traps; §14 perk table), `docs/game-design/shop-mechanic.md`, `docs/mods/collection-and-detector-design.md` — describe the world as it now is: waterskins heal on pickup; hearts refill at camp; no supplies, no carry cap, no supplies detector; pack-mule doubles a waterskin
- Modify: other living docs that describe consumables as current (`grep -rli "consumable\|bandage" docs` minus `docs/superpowers/`, `docs/handover-*.md`, `camp.md` and the loot spec): at least `docs/mods/ARCHITECTURE.md`, `docs/mods/distribution-primitive-design.md`, `docs/game-design/loot-distribution.md`, `docs/game-design/TRAP_FAMILIES.md`, `docs/game-design/progression-route.md` — one sentence each where they state current behaviour
- Modify: `CHANGELOG.md` `## Unreleased` — one line: hearts refill at camp, and waterskins found on expert-and-up heal on the spot; supplies, the pack and the supplies detector are gone

- [ ] **Step 1: Edit.** Keys go in both languages. Docs state the current design and why, no history.
- [ ] **Step 2: Check** — `grep -rnE "bandage|trapTool|consumableRates|CONSUMABLE_PRICES" src scripts public` — empty; `grep -rn "consumable" src` lists nothing but the canister puzzle's unrelated words, if any.
- [ ] **Step 3: Run** `yarn test src/i18n src/worldGen src/game src/mods` (fixture swaps), `yarn check-types`, `yarn lint`.
- [ ] **Step 4: Commit** — `docs: supplies out, waterskins and the camp fire in`

---

### Task 9: Bake, gate and the loot numbers (**soundness**: the bake, the economy guard)

**Files:**

- Modify (by the bake): `src/data/generatedWorld.ts`, `src/data/carveLedger.json`
- Modify: `src/data/tierFingerprints.json` (every tier that moved, deliberately)
- Modify: `docs/review-camp-release.md` (loot numbers, fingerprint reasons, browser checks)
- Modify: `docs/superpowers/plans/2026-10-25-camp-phase-1-consumables-out.md` (tick boxes)

**Interfaces:** none.

- [x] **Step 1: Measure before.** Write a throwaway script in the session scratchpad (not committed; phase 2 builds `yarn loot-report`) that walks `generatedWorldConfigs` by section tier and prints, per tier: puzzle rooms (`pathPuzzles`, shops excluded), puzzle rooms with loot, the share, chests and path ends, empty chests and path ends, consumables / waterskins, money drops and total, sellables and their value, shop slots and empty shop slots; and world-wide `totalBuyable`. Run it on the committed world (`yarn tsx <script>`). (On 2026-10-24 it read: starter 71/92 = 77%, junior 71/186 = 38%, expert 127/431 = 29%, master 127/540 = 24%, wizard 109/860 = 13%; consumables 150 on puzzles + 35 in shops; buyable 7370; no empty chest.)
- [x] **Step 2: Bake** — `timeout 900 yarn generate-world`. A failing economy guard, allocator or carve is a stop: write it under Failures in the review list and fix the cause in the task that owns it (a fresh subagent), never by `SKIP_ECONOMY_GUARD` or a hand edit.
- [x] **Step 3: Measure after** with the same script. Required: zero empty chests and path ends (anything else stops the phase); waterskins only on expert, master and wizard puzzle slots, about 20 each; no `consumable` anywhere in `generatedWorld.ts`; money and sellable totals within a few coins of before (the allowance).
- [x] **Step 4: Fingerprints** — `yarn vitest run --config vitest.verify.config.ts src/data/tierFingerprints.verify.ts`; for every tier that moved, copy its new hash into `tierFingerprints.json` and write one line per tier in the review list saying why (expert/master/wizard: waterskins in place of consumables, shop stock emptied; starter/junior if moved: the coin round-robin's cut-off shifts when the expert-and-up puzzle pools change — a trial bake moved starter by one coin drop).
- [x] **Step 5: Commit the bake** — `chore: bake the world with waterskins and no supplies`
- [ ] **Step 6: Toggle-off proof** — remove `trapMod` from `REGISTERED_MODS` in `src/mods/registeredMods.ts`; `timeout 900 yarn generate-world`, `yarn check-types`, `timeout 900 yarn build` must pass. Then `git checkout src/mods/registeredMods.ts src/data/` and confirm `git status --short` is clean (the committed bake is back).
- [ ] **Step 7: Gate** — each under `timeout 900`: `yarn verify`, `yarn verify-content`, `yarn build`. All pass.
- [ ] **Step 8: Look** — `yarn dev`: take trap damage in an expert pyramid, leave to base, re-enter: hearts are full. Open a waterskin hurt and at full health. Open a Fez shop: no Supplies section. Screenshot each; anything not playable unattended goes under Look at in browser.
- [ ] **Step 9: Record** in `docs/review-camp-release.md`: a "Phase 1 loot" block with, per tier, the share of puzzles with loot before → after, the waterskin count, and the slots that changed (consumable → waterskin, consumable → empty, shop stock → empty, coin/sellable moves); the fingerprint lines; the toggle-off result. Tick this plan's boxes.
- [ ] **Step 10: Commit** — `docs: phase 1 loot numbers in the review list`

The driver then runs the phase review (Sonnet), pushes the branch, ticks Phase 1 in `docs/handover-camp-release.md` and adds one line to its State.
