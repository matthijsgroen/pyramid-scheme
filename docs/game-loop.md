# Game Loop Design — Pyramid Scheme

Status: design doc · cross-checked against EXPEDITION_REDESIGN, PUZZLE_FAMILIES, ux-flow-map  
Date: 2026-06-26 (updated 2026-06-29 with loot economy redesign)  
See also: `docs/pyramid-interior-design.md` for loot economy, interior structure, and floor system

---

## 1. The three nested loops

### Micro loop — one puzzle encounter (30–120 s)

Player enters a puzzle node → solves a puzzle family → corridor opens / reward granted.

This is the atomic unit. Duration is deliberately short — fast to start, clear when done. Multiple encounters per site visit, so finishing one keeps the session going without forcing a break.

### Meso loop — one site visit (5–20 min)

Player enters a pyramid or tomb → navigates the node graph → fog burns back → reaches the exit.

Rewards collected during a site visit:
| Reward | Frequency | Scope |
|---|---|---|
| Hieroglyph fragment | 0–1 per site; 308 total across the game | Completes a hieroglyph when enough are found (2–8 per hieroglyph, scaled by tier and which tomb section first requires it) |
| Mosaic tiles | Guaranteed on critical path; also fill optional branch endpoints | Game scope |
| Map piece | 0–1 per site per tomb; surface floors feed first tomb, deep floors feed later tombs | Tomb-gate scope |

The site itself is the progress indicator — fog revealing is the reward. No separate XP bar, no streak counter. Completion is legible at a glance.

**Ward-gated content** (from Phase 5d of the build plan) means a first visit is not the whole story: some branches are deliberately inaccessible until a tomb key from a *later* tomb arrives. Early sites stay live throughout the game; they are *dormant*, not spent.

**Trap corridors** (expert tier and above) are a second reason to return or backtrack. Specific authored side branches are preceded by a warning sign — the player may opt in. Moving through a trapped corridor triggers a timed math question: pass to proceed, fail to take health damage. Health is session-persistent; depleted health blocks further trap attempts until restored by consumables (found in normal chests) or permanent upgrades (from tomb treasures). See `docs/pyramid-interior-design.md §11` for full trap system design.

### Macro loop — one difficulty tier (several sessions)

Four pyramid journeys per tier, unlocked sequentially (completing journey N unlocks journey N+1). One to three treasure tombs per tier.

1. Complete the last pyramid of journey 1 → unlocks journey 2; collect map piece + fragments + mosaic tiles inside
2. Repeat for journeys 2–4; completing each journey's final pyramid unlocks the next
3. Each journey contains one map piece (on its surface floor); tomb unlocks as soon as all required map pieces are collected — the player need not finish the current journey first
4. Tomb interior: tableau rooms (gated on completed hieroglyphs) → treasure rooms
5. Tomb treasures are **ward keys** opening specific pyramid floors (or location keys revealing the next tomb in the tier); every treasure also grants a **permanent passive effect** (max health increase, armor, trap insight, or fragment sense) — first-tomb's final treasure also unlocks the first journey of the next difficulty tier
6. Explore newly-opened pyramid floors → find hieroglyph fragments + map pieces for Tomb B
7. Collect map pieces for Tomb B → enter Tomb B → repeat

**Multiple tombs per tier at higher difficulties:**

| Tier | Tombs | Notes |
|---|---|---|
| Starter | 1 | 4 treasures |
| Junior | 1 | 6 treasures |
| Expert | 2 | 4 + 4 treasures; Tomb B revealed by completing Tomb A |
| Master | 2 | 5 + 5 treasures |
| Wizard | 3 | 4 + 4 + 4 treasures |

**Hieroglyphs are discovered via fragments** — finding a hieroglyph fragment chest adds one fragment to the collection. A hieroglyph is completed when all its fragments are found. Fragment counts scale by tier *and* by which tomb section first requires that hieroglyph — a hieroglyph only needed in section 3 has more fragments than one needed in section 1, because the player already has a larger playing surface by then. See `docs/pyramid-interior-design.md §3` for the full matrix (2–8 fragments per hieroglyph; 308 total). Completed hieroglyphs unlock tomb tableau rooms. Fragments of the same hieroglyph are always in different pyramid sites across different journeys.

**Map pieces are flexible** — `piecesRequired` is authored per tomb and is not always 4. Later tombs within a tier need fewer pieces (they're already gated behind completing an earlier tomb). Map pieces for later tombs are found on deep floors opened by earlier tombs' ward keys — exploring new floors serves double duty.

### Meta loop — the mosaic (whole game)

A stained-glass mosaic assembles across the whole game. Solving puzzles inside pyramids reveals mosaic tiles — the critical path through any pyramid always awards tiles, and optional branches award smaller bundles. 298 total slices, grouped into larger pieces. A half-built mosaic is a to-do list disguised as art. The completed picture is the natural ending — no additional "final boss" needed.

The mosaic has two layers: a 20-piece *image* (one section per journey, index = journey order) and a 298-slice *reveal mechanism* (individual tiles fill in as puzzles are solved). See open question 5 for the design separation between these two layers.

---

## 2. Content scope — the level count question

`journeys.ts` defines `levelCount` per pyramid, which becomes `puzzleBudget` in the site map design (the number of puzzle nodes in the site). Totals:

| Tier | Site counts | Sum | Avg nodes/site |
|---|---|---|---|
| Starter | 3, 4, 5, 5 | **17** | 4.3 |
| Junior | 3, 6, 8, 5 | **22** | 5.5 |
| Expert | 4, 6, 9, 7 | **26** | 6.5 |
| Master | 4, 9, 8, 5 | **26** | 6.5 |
| Wizard | 9, 11, 10, 8 | **38** | 9.5 |
| **Pyramid total** | — | **~104** | journeys capped at 6 levels each |
| **Tombs** (1,1,2,2,3) | — | **9** | — |
| **Grand total** | — | **~113** | — |

### Intra-tier shape

Junior, Expert have a clear warmup → peak → cool-down shape:
- Junior: 3 → 6 → **8** → 5
- Expert: 4 → 6 → **9** → 7

Master peaks early (site 2 = "Book of the Dead" at 9), then descends:
- Master: 4 → **9** → 8 → 5

Wizard has no warmup — the smallest site is 8 nodes (more than any starter/junior site):
- Wizard: **9** → **11** → **10** → **8**

This is probably *fine* for wizard (players arriving there know what they're doing) but worth noting explicitly: wizard provides no in-tier gentle introduction. The jump from master's 4-node opener to wizard's 9-node opener is the steepest single escalation in the game.

### The master → wizard jump

Expert and Master both total 26 puzzle nodes. Wizard jumps to 38 — a **+46% increase** in content volume at the final tier.

Three ways to read this:

1. **Intentional endgame depth.** Wizard is for the most committed players; more content is a feature, not bloat. The wizard sites are also structurally the most complex (most floors, most branches), so raw node count understates the session length.

2. **Escalation fatigue risk.** Players who found master challenging may experience the +12-node jump as a wall, not a reward. If wizard contains the most interesting puzzles (T5 = nonogram, kakuro, 9×9 Latin-square — all debut here per PUZZLE_FAMILIES §7), the game's best content is gated behind the largest grind.

3. **The ward-gated content effect.** Under the new design, some wizard nodes will be inaccessible on the first visit (behind wards requiring tomb keys from the wizard tomb, which hasn't been unlocked yet). The effective node count on a first pass may be closer to master's 26, with the remaining 12 surfacing only on revisits. This would make the jump feel smaller in practice. **This effect should be explicitly authored** — not a side-effect of where wards happen to land.

**Recommendation:** Before finalising, decide whether wizard's 38 is a deliberate design choice or accumulated drift. If intentional: add a note to `src/data/journeys.ts` explaining the rationale. If drift: consider trimming wizard_2 ("Secrets of the Sphinx", 11 nodes → 8–9) and wizard_3 ("Chamber of Ma'at", 10 nodes → 8), bringing the total to ~33, closer to master's 26 + a clear step up.

### Mosaic scope

149 puzzle nodes × 2 slices each = 298 pie-slice reveals in the stained-glass mosaic (per memory from prior analysis). At average micro-loop pace (90 s/puzzle), completing the full game is ~225 minutes of active puzzle time — before accounting for exploration, navigation, and the longer puzzle families. That is a plausible scope for an educational game aimed at extended play over weeks.

---

## 3. Conflict checks against existing documents

### `EXPEDITION_REDESIGN.md`

| Topic | EXPEDITION_REDESIGN says | This doc says | Status |
|---|---|---|---|
| Map pieces | Deterministic, exactly one authored pyramid per journey | One per tomb per journey; surface for first tomb, deep floors for later | ⚠️ extended — map pieces now distributed across floors |
| Mosaic | One guaranteed piece per pyramid | Guaranteed on critical path; fills optional branches | ✅ aligned (see open Q5 for two-layer model) |
| Tomb gate | Spend 4 map pieces to open | `piecesRequired` per tomb (flexible, 2–4); later tombs unlocked by location key | ⚠️ extended — multiple tombs per tier, flexible piece count |
| Tomb keys / wards | From later tombs, keep early tombs alive | 36 ward keys (mixed tier); 4 location keys reveal new tombs | ⚠️ extended — location key treasure type added |
| Ward placement | Optional branches only; critical path always completable | Same | ✅ aligned |
| Hieroglyphs | Consumable inventory items (old model) | **Fragment model** — 2–3 fragments to complete; permanent once completed | ⚠️ redesign decision; `inventoryLootLogic.ts` becomes vestigial |
| Tomb treasures | Passive effect modifiers | **Ward key + passive effect** (36); or **location key** (4) | ⚠️ redesign extension — see `docs/pyramid-interior-design.md` §5 |
| Single tomb per tier | 5 tombs total | **9 tombs total** (1+1+2+2+3) | ⚠️ redesign extension |

### `PUZZLE_FAMILIES.md`

The curriculum map (§7) assigns families to tiers T1–T5. Mapping to game difficulty tiers:

| Game tier | PUZZLE_FAMILIES tier | Families introduced |
|---|---|---|
| Starter | T1 | Cross-sum, Balance scale, Symmetry |
| Junior | T2 | Egyptian doubling, Sundial, Glyph Latin-square (4×4), Target-number, Sequence |
| Expert | T3 | Water clock, Eye of Horus fractions, Sumplete (5×5) |
| Master | T4 | Nonogram (10×10), Kakuro, Clock-arith (decoy) |
| Wizard | T5 | Ceilings: 9×9 Latin-square, 15×15 nonogram, multi-unknown algebra, modular time |

The IMPLEMENTATION_PLAN resolves to **Sumplete only for initial build**. This is consistent — Sumplete is a T3 family (PUZZLE_FAMILIES §7: `◐ 5×5` at T3). The initial build targets the expert tier as the live test bed for the site map system.

**One tension:** PUZZLE_FAMILIES §7 says side-families (Latin-square, nonogram, Sumplete) cannot appear before forks debut (T2+), since side-families live in optional branches. The build plan stages forks in Phase 5a, after the linear-spine Phase 1–4 ships. This is structurally correct — but it means the site configs authored in Phase 4 for all 20 pyramids will need **two passes**: one for the linear-spine launch (forks absent) and a second revision once forks ship. This should be explicit in the authoring plan.

### `docs/ux-flow-map.md`

The ux-flow-map describes the **current (pre-redesign) system**. Key divergences that are *intentional redesign changes*, not conflicts:

| Topic | Current (ux-flow-map) | Target (EXPEDITION_REDESIGN) | Note |
|---|---|---|---|
| Map piece drops | Probabilistic per level (`startChance + chanceIncrease`) | Deterministic, one authored pyramid per tier | Intentional replacement — IMPLEMENTATION_PLAN Phase 6 |
| Loot channel | Single priority-chain (map piece → hieroglyph → expedition bonus) | Three separate economies at room/journey/game scope | Intentional redesign |
| Expedition structure | Flat list of levels (horizontal parallax) | Site map with node graph | Intentional redesign |
| Tomb entry | Collect all map pieces for difficulty → unlock | Spend 4 map pieces at tomb gate | Semantically equivalent; gate becomes diegetic |

**One lingering conflict:** `ux-flow-map.md §2` says "Tomb with no more content → card is disabled; cannot select." Under the redesign, tombs have ward-gated branches that remain accessible for tomb keys from later tombs (§15 open decision, resolved: keys from later tombs). A "fully explored" tomb may still have wards that open when keys from higher tiers arrive. The "disabled when all treasures collected" behaviour needs revisiting — tombs should only be disabled if *all* branches (including ward-gated ones) are cleared.

### `docs/treasure-effects.md`

Treasure effects are passive modifiers to the micro loop. Under the new design:
- `higherLootChance` and `mapFragmentChance` are currently "not yet implemented" — and both modify the *probabilistic* loot system that the redesign replaces with deterministic rewards.
- These two effects become **semantically vacuous** once the redesign lands (map pieces are authored, not rolled). They should be removed or replaced with redesign-compatible effects before Phase 6.
- `moreLootChance` and `expeditionBonus` survive as-is; their exact redesign-compatible interpretation needs defining once the authored-chest system ships.

---

## 4. Open questions / decisions needed

1. **Wizard 38-node count** — intentional endgame depth, or drift? Decide and note it explicitly (see §2 recommendation).

2. **Two-pass site config authoring** — Phase 4 (all 20 `siteConfig` entries) should flag which sites will gain forks/branches in Phase 5. Either author placeholder `maxBranchFactor: 0` entries now and revise in Phase 5, or defer authoring non-spine-only sites until Phase 5a ships. Mixing both approaches per site without a clear policy will create orphaned configs.

3. **Tomb "disabled" condition** — once ward-gated tomb branches are in play, the disable condition needs a precise definition. Proposal: disabled only when `solvedEdges` covers all reachable nodes *and* no unspent ward keys in inventory could open further branches. (The validator's forward pass produces this data for free.)

4. **`higherLootChance` / `mapFragmentChance` fate** — two effect types become vestigial after the redesign. Replace with redesign-compatible effects before Phase 6, or explicitly mark deprecated in `src/data/treasures.ts`.

5. **Mosaic two-layer model** — the stained-glass has 298 slices (149 puzzle nodes × 2). The EXPEDITION_REDESIGN says "one mosaic piece per pyramid" (20 pieces). These are two different systems: the 20-piece stained glass *image* (which pyramid contributed which section) and the 298-slice *reveal mechanism* (how solved puzzles fill it in). Confirm that both systems are intentional and distinct, not a future collision. See also `pyramid-interior-design.md` §9 open Q5.

6. **`inventoryLootLogic.ts` migration** — becomes vestigial once fragments replace probabilistic drops. Remove in Phase 6.

7. **TOMB_SYMBOLS pool sizes** — currently 7–15 per tomb. Fragment model works better with 3–6. Needs authoring in `tableaus.ts` before Phase 6.

8. **Treasure passive effects** — need theming per tomb (merchant tomb = loot/fragment effects; priestly tomb = tableau-solving effects). Design before Phase 6.

9. **Location key presentation** — distinct visual/text treatment needed for the treasure that reveals a new tomb. Design before Phase 6 UI work.

10. **WARD_MIX totals** — 36 ward keys (not 40) since 4 treasures are location keys. Final WARD_MIX values must sum to 36. See `pyramid-interior-design.md` §10 open Q10.
