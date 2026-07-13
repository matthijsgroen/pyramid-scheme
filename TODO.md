# Mod restructure — slice tracker

Plan: `docs/mods/TARGET.md`. Per-slice steps: `docs/mods/SLICE-CHECKLIST.md`.
Archived reasoning: `docs/mods/_brainstorm.md`, `docs/mods/_handover-keys-and-locks.md`.

Gate for every slice: **toggle the mod off, world + app still build.** Not a
green suite.

## Slice 0 — docs

- [x] `docs/mods/TARGET.md` — layered B + the two rules
- [x] `docs/mods/SLICE-CHECKLIST.md` — per-slice template, toggle-off gate
- [x] archive brainstorm + handover, reframe this file

## Slice 1 — mosaic (reference implementation)

- [x] 1. Deleted `computeMosaicPaths` + auto-loop + `emitMosaics`; mosaic rides
        the general loot pool via `prefers`-tagged slots; target count moved to
        the mosaic mod (`MOSAIC_TOTAL`); core holds no `mosaicPieceRewards`.
- [x] 2. Generic phase-3 capped placement in `placeFragments.ts` — spreads the
        registered currency's total across loot slots (tagged first), hard-fails
        if demand > capacity.
- [x] 3. `src/mods/mosaic/index.ts` descriptor + `src/mods/registeredMods.ts`.
- [x] 4. File moves: `mosaicRevealOrder.ts` → `mods/mosaic/game/`, `MosaicPage.tsx`
        → `mods/mosaic/app/`; `useMosaicProgress` (via `useModState`) replaces
        `mosaicSeenCount`/`markMosaicViewed` on `ProgressionState`; dropped the dead
        `mosaicPieces.ts`.
- [x] 5. Toggle-off proof (world-gen): mosaic out of `registeredMods` → generate-world
        builds with the economy guard ON, 0 mosaic, 31 map / 294 hieroglyph unchanged,
        worldGen core names no `mosaic`. VERIFIED.
- [x] 5b. FULL app toggle-off. Descriptor grew to own `currencyMeta` (game-side, no
        React) — `registerCurrencies` registers mod-contributed metas via the list. The
        SCREEN stays in `Base.tsx` (React can't live in the game descriptor that world-gen
        scripts import) but is gated on `isModEnabled("mosaic")`. Single toggle point
        (`REGISTERED_MODS`): removing mosaic drops world-gen placement + currency-meta +
        screen together. VERIFIED (0 mosaic, mosaicPiece unregistered, other currencies
        intact, guard ON). **Slice 1 complete.**

## World-authoring exercise (surfaced mid-slice — see project memory doom-loop)

Deleting the auto-distributor exposed the real world size: it was auto-expanding
loot without authorship, so the world needs authored growth to stay solvent
(economy guard). Grow each tier with authored ward content, then balance.

- [x] engine primitives: `wardChest`, floor-level `sidePaths`/`hiddenPaths`,
      varied `wardWings` (`WardWingSpec[]`), key chains (nested floor-key,
      2 levels max — assembler flattens deeper)
- [x] starter — +1 pyramid, per-pyramid ward-chest teasers (varied difficulty),
      extra corridors on the last pyramid
- [x] junior — varied ward WINGS (bonus floors, harder-tier difficulty)
- [x] expert — ward content everywhere, first open traps, consumable bump,
      first floor keys on the open main path, broad packing
- [x] master — deeper locks (multi-color keys + key chains), trapped returns
      (`wardPathTrapped`), open junk income
- [x] wizard — saturated: open traps + key chains at the ceiling
- [x] economy balances with the guard ON (no `SKIP_ECONOMY_GUARD` needed for a
      real build; the env gate stays as a dev/iteration affordance)

Escalation ladder: starter (see locked content) → junior (bonus floors) →
expert (intro traps + floor keys) → master (deepen: multi-color + chains,
hazardous returns) → wizard (saturate all).

## Slice 2 — hieroglyph (first gating currency) — DONE

Plan + decisions: `docs/mods/SLICE-2-PLAN.md`. Handover: `docs/mods/HANDOVER.md`.
Branch `mods/hieroglyph-currency` (7 commits, not pushed).

World-gen half DONE (711 green, world byte-identical):
- [x] move `mods/tableau` → `mods/hieroglyph` (family id stays `tableau`)
- [x] descriptor + registration (currencyDistributions, families, currencyMeta[], showInCollection)
- [x] DSL authors preference not baked currency + unified bucket grammar `<cur>`/`<cur>:<inst>`
- [x] reachability: inject gate threshold + reward→bucket harvest (core names no hieroglyph)
- [x] move HIEROGLYPH_REQUIRED/TOMB_SYMBOLS/FRAGMENT_MATRIX into the mod; serializer injected
- [x] reward-count validation derived from registered currencies (toggle-off safe)
- [x] winnability hard-fail (lock with no owning currency)

App-side half DONE (711 green, world byte-identical, toggle-off proven both ways):
- [x] gate tableau family registration on isModEnabled (plugin.tsx self-gates its registerFamily)
- [x] family-absence fallback (SiteMapScreen effect auto-resolves an unregistered-family room)
- [~] fragments → ledger — DROPPED. `collectedFragments: string[]` kept: it already gives the
      player-facing counter (hieroglyphProgress "Ra 3/5"), lives in src/app (outside the
      worldGen/game grep gate), and empties when the mod's off. The ledger is a flat counter;
      the migration was churn + a forced compass redesign + save migration for no toggle-off gain.
- [x] Collection hieroglyph sections gated on registered CurrencyMeta.showInCollection (meta only
      registered while the mod's on → sections drop with it)
- [x] gate the hieroglyphFragment reward handler on isModEnabled (in-place; moving it would break
      applyReward/rewardDisplay's direct import ordering)
- [x] TOGGLE-OFF PROOF: mod off → generate-world guard ON + winnable + 0/294 frags + app builds;
      re-add → byte-identical. Full suite 711 green.

**Slice 2 complete.**

## Collection redesign (post-Slice-2 follow-on) — DS-1 + MOD-1 DONE

Design: `docs/mods/collection-and-detector-design.md`.
- [x] DS-1 — design-system primitives (`CollectibleSlot`/`CollectionSection`/`CategoryGrid` +
      `difficultyColors` tokens); fixed invisible tile selection (clip-safe drop-shadow outline)
- [x] MOD-1 — mod-owned hieroglyph Collection section (collection-section registry mirroring
      `registerAllFamilies`); core Collection names no mod; toggle-off proven
- [ ] DET-1 — detector revival — folded into the Perk & detector system item below (detectors
      ARE perks). See design doc §3C + Appendix A.

## Perk & detector system — DISREGARDED pending a full redesign (user decision)

The perk system is now DISREGARDED app-wide: `applyTreasurePerk` is a no-op (useProgression), so
every perk stays at baseline (maxHealth 6, armor 0, compass/detector/scribes-eye 0…). Treasures
that grant stat perks do nothing for now. The registry (`src/game/perks`) + `registerPerks` stay
loaded (main.tsx) as dormant anchors; restoring the registry-driven bump in `applyTreasurePerk`
revives them. This unblocked trap/health from the parked-perk seam — health uses a constant
maxHealth, no perk reads.

REDESIGN scope (when picked up): detectors are perks (compass / consumable-detector / detection),
trap owns 4 perks (armor, max-health, trap-insight, pack-mule) — "how a mod contributes perks" and
"revive the detector" (DET-1) are one design problem. Open fork: does the grant path write through
the registry to mod-owned slice state (dynamic `PerkSlice`/defaults), or a gated side-effect leaving
slices in core? DET-1 detector revival rides on top (target-picking on Collection, counter-native
provider search, reachability-aware).

Scope when picked up:
- A perk-contribution mechanism mods use (the open fork: does `applyTreasurePerk`'s grant path
  write through the registry to mod-owned slice state, so `PerkSlice`/defaults go dynamic? vs a
  gated side-effect leaving slices in core `ProgressionState`). See the trap notes.
- DET-1 detector revival on top of that (target-picking on Collection, counter-native provider
  search, reachability-aware).

## Slices 3+ (re-planned after hieroglyph)

Perk UPGRADES are parked (above); the trap slice excludes them but is otherwise NOT blocked.

**The Distribution primitive is DESIGNED (design locked): `docs/mods/distribution-primitive-design.md`.**
Everything placed into the world — encounters (trap/puzzle/shop) AND loot (currencies/junk/
consumables/money) — is a `Distribution`: **core allocates slots (footprint + eligibility + rank),
the mod fills them** (owns variants/rarity/completeness/per-instance encounter config). Fixed pass
order: structure → encounters → gating → capped → dynamic (+ authorable empty quota). Target = the
full unified model (B); **built loot-first**. Subsumes: filler-loot generalization, the Slice-5
siteAssembler rewrite, shop-stock targeting, slot capacity. Settled decisions in the doc.

- [~] Slice 3a — loot distributions (Increment 1). MOSTLY DONE:
      - [x] `Distribution` + registry + `allocateDistributions`; capped currencies routed through it,
            no change (`25c4692`).
      - [x] slot pool extended to puzzle-chain slots (`slots.ts` emits `kind:"puzzle"` + `siteId`/
            `puzzleSeq`; gating + capped filter to `kind:"end"` so their output is unchanged).
      - [x] unified dynamic pass (`dynamicLoot.ts`): money + consumables byte-identical to the retired
            `assignPuzzleRewards` (same per-site seeds — money sum 1009, consumables 248/73/72
            unchanged); junk by EAGERNESS (chest 1.0 / puzzle 0.6 / trap+gate 0, per SLICE-2-PLAN)
            over ALL loot slots, round-robin per tier for ≥1-of-each completeness (hard-fail).
            `assignPuzzleRewards` retired (buildSite only inits arrays now). Guard ON build solvable;
            toggle-off (mosaic) solvable; 716 green.
      - [ ] `emptyFraction` knob SKIPPED (YAGNI) — leftover puzzle slots are the empties naturally
            (eager 0.6 fills the rest); add a real knob when an author wants to force chest empties.
      - [x] consumables → TRAP-OWNED (Slice 3b stage 2): `ModDescriptor.consumables` (density +
            rarity roll), injected via `registeredMods.CONSUMABLES` → buildConfigs → dynamicLoot.
            Core keeps the per-site layout; trap owns the fill. Trap ON = byte-identical (393
            consumable / 176 money / 795 junk); trap OFF = 0 consumables, vacated slots eager-fill
            junk (795→1030), guard holds. NOTE: expert+-path eligibility (design) NOT yet applied —
            consumables still on all puzzle paths; fold in when refining.
      - [x] PART B: placement tier follows the slot's OWN floor/section difficulty, not the journey
            tier (`collectSlots`). A ward path/wing authored at a difficulty (e.g. `wardWing({tomb,
            index, tier})`) tiers its loot by that marker — expert "come back stronger" wings in a
            junior pyramid now tier up (divine 406→422, stone 27→16); a future starter path in a
            wizard tomb would tier down. Money byte-identical (1009); completeness + guard hold.
- [~] Slice 3b — trap. MOSTLY DONE (staged):
      - [x] stage 1 — trap `ModDescriptor` + register + arithmetic-reflex family (app-gated). `dcd8881`
      - [x] stage 2 — consumables trap-owned (`ModDescriptor.consumables`, injected). `c3830e4`
      - [x] stage 3 — health currency trap-owned (descriptor `currencyMeta`; value already ledger).
      - [x] stage 4 — HUD gated: HealthDisplay + ConsumableBar hidden when trap off (all consumables
            are trap-owned — oil=full heal, bandage=1 heart, trapTool=disarm).
      - [x] perks DISREGARDED (grants no-op) — health uses constant maxHealth 6, no perk seam.
      - [x] health + consumables → `useTrapProgress` (trap mod state, useModState). Health left the
            shared ledger (it's trap-only); consumable inventory left ProgressionState. Methods
            (currentHealth/maxHealth/canAttemptTrap/takeTrapDamage/consumables/carry-cap/add/use) all
            trap-owned. Consumers rewired: TrapFamilyShell, SiteMapScreen (HUD + pickup, via the
            trap hook), fezShop buy, and the `consumable` reward handler (gated on trap, reads
            `ctx.trapProgress`). Dead `heal`/`healToFull` dropped. Persistence: health/consumables
            move to the `mod-trap` key → one-time reset for existing saves (no data loss elsewhere).
      - [x] consumable expert+-path eligibility: `ConsumableSpec.eligible` (trap sets tier ≥ expert).
            Consumables now only on expert/master/wizard sections (368: 70/123/175), none on
            starter/junior. Guard holds; junk backfills the vacated low-tier slots.
- [ ] shop — Slice 4. The whole money economy is shop-owned:
      - money currency (move the hardcoded `registerCurrencies` entry → shop descriptor) + money
        dynamic distribution (move from core `dynamicLoot` → shop-injected, like consumables).
      - **JUNK/sellables → shop-owned** (user decision, revises the design doc's "junk = core"):
        `dynamicLoot.fillJunk` + `data/sellables.ts` + ≥1-each completeness + the Collection "junk"
        category all become shop-injected. Shop off → no junk placed, leftover chests → empty.
      - economy guard (`validate.ts` shopPrices + TOTAL_CONSUMABLE_BUYABLE) moves to shop.
      - Fez shop family + descriptor + register + toggle-off.
      - may pull shop encounters from Increment 2 forward (per-instance shop capacity).
- [ ] App-side mod plugins — the CLEAN CUT (design: `docs/mods/app-plugins-design.md`). Screen +
      HUD-widget + reward-effect registries + a per-mod `app.tsx` entrypoint + one app manifest, so
      core UI names/imports no mod. Kills every `isModEnabled` in core (Base mosaic screen,
      SiteMapScreen trap HUD, registerRewardHandlers hieroglyph/trap) and the `@/mods/*` imports in
      core (MosaicPage, useTrapProgress, ApplyCtx.trapProgress). Do before shop so shop lands clean.
- [ ] Distribution Increment 2 — encounter distributions. Convert the runtime siteAssembler
      `trapped`/`puzzleFamily`/`lastMainPuzzleFamily` special-cases + offline encounter-tag authoring
      into `encounter`-pass distributions with per-instance config. Completes the B target.
- [ ] Perk & detector system (see above) — unblocks the trap perk upgrades + revives DET-1. Last.

## Frozen — now subsumed by the Distribution primitive (no longer separate)

- filler-loot fill-the-rest generalization → the `dynamic` pass.
- slot capacity (`Slot` holding several items) → a slot whose footprint contribution is >1
  (e.g. a shop's capacity).
- phase-4 uncapped loot (max-% occupancy + drop rate) → a dynamic distribution's footprint/rate;
  revisit when authoring the dynamic pass.
- `siteAssembler` core-loop rewrite → Distribution Increment 2 (encounter distributions).

## Prior work still standing (carried into core, not undone)

- [x] generic ledger + currency registry (`src/game/ledger`)
- [x] worklist-driven `placeFragments` (2 currencies: hieroglyph, mapPiece)
- [x] `CurrencyDistribution` injection pattern
- [x] reachability graph, distribution primitives, slot discovery
- [x] tomb/pyramid unified construction (`buildSite`)
