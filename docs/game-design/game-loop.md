# Game Loop Design — Pyramid Scheme

Status: design doc · cross-checked against PUZZLE_FAMILIES  
Date: 2026-06-26 (updated 2026-06-29 with loot economy redesign, 2026-07-11 with the pitch below)  
See also: `pyramid-interior-design.md` for loot economy, interior structure, and floor system;
`keys-and-locks-solver.md` for how the world guarantees this never dead-ends

---

## The pitch

Exploration in this world runs **both forward and backward**. Forward: new
keys and treasures unlock the next difficulty tier, new journeys, deeper
tomb floors. Backward: those same keys reopen *earlier* sites that were
never fully spent — a starter pyramid you finished tiers ago can hold a
gate that only your latest wizard treasure opens, and a fragment you find
there might be exactly what an early tomb's tableau was waiting on. No
site is ever "done" until every gate in it is open. The player is always
re-reading the map they already have, not just walking toward a new one.

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
| Hieroglyph fragment | 0–1 per site | Completes a hieroglyph when enough are found (2–8 per hieroglyph, scaled by tier and which tomb section first requires it) |
| Mosaic tiles | Guaranteed on critical path; also fill optional branch endpoints | Game scope |
| Map piece | 0–1 per site per tomb; surface floors feed first tomb, deep floors feed later tombs | Tomb-gate scope |

See `pyramid-interior-design.md §12` for canonical counts.

The site itself is the progress indicator — fog revealing is the reward. No separate XP bar, no streak counter. Completion is legible at a glance.

**Ward-gated content** (from Phase 5d of the build plan) means a first visit is not the whole story: some branches are deliberately inaccessible until a tomb key from a *later* tomb arrives. Early sites stay live throughout the game; they are *dormant*, not spent.

**Trap corridors** (expert tier and above) are a second reason to return or backtrack. Specific authored side branches are preceded by a warning sign — the player may opt in. Moving through a trapped corridor triggers a timed math question: pass to proceed, fail to take health damage. Health is session-persistent; depleted health blocks further trap attempts until restored by consumables (found in normal chests) or permanent upgrades (from tomb treasures). See `pyramid-interior-design.md §11` for full trap system design.

### Macro loop — one difficulty tier (several sessions)

Four pyramid journeys per tier, unlocked sequentially (completing journey N unlocks journey N+1). One to three treasure tombs per tier.

1. Complete the last pyramid of journey 1 → unlocks journey 2; collect map piece + fragments + mosaic tiles inside
2. Repeat for journeys 2–4; completing each journey's final pyramid unlocks the next
3. Each journey contains one map piece (on its surface floor); tomb unlocks as soon as all required map pieces are collected — the player need not finish the current journey first
4. Tomb interior: tableau rooms (gated on completed hieroglyphs) → treasure rooms
5. Tomb treasures are **ward keys** opening specific pyramid floors (or location keys revealing the next tomb in the tier); every treasure also grants a **permanent passive effect** (max health increase, armor, trap insight, or fragment sense) — first-tomb's final treasure also unlocks the first journey of the next difficulty tier
6. Explore newly-opened pyramid floors → find hieroglyph fragments + map pieces for Tomb B
7. Collect map pieces for Tomb B → enter Tomb B → repeat

**Multiple tombs per tier at higher difficulties:** the tomb count rises with tier (one tomb at starter/junior, two at expert/master, three at wizard), and later tombs in a tier are revealed by completing the earlier one. See `pyramid-interior-design.md §12` for canonical counts.

**Hieroglyphs are discovered via fragments** — finding a hieroglyph fragment chest adds one fragment to the collection. A hieroglyph is completed when all its fragments are found. Fragment counts scale by tier *and* by which tomb section first requires that hieroglyph — a hieroglyph only needed in section 3 has more fragments than one needed in section 1, because the player already has a larger playing surface by then. See `pyramid-interior-design.md §3` for the full matrix (2–8 fragments per hieroglyph; 273 total). Completed hieroglyphs unlock tomb tableau rooms. Fragments of the same hieroglyph are always in different pyramid sites across different journeys.

**Map pieces are flexible** — `piecesRequired` is authored per tomb and is not always 4. Later tombs within a tier need fewer pieces (they're already gated behind completing an earlier tomb). Map pieces for later tombs are found on deep floors opened by earlier tombs' ward keys — exploring new floors serves double duty.

### Meta loop — the mosaic (whole game)

A stained-glass mosaic assembles across the whole game. Solving puzzles inside pyramids reveals mosaic tiles — the critical path through any pyramid always awards tiles, and optional branches award smaller bundles. 298 reward pieces total — one per reveal step the player sees (`LEVEL_STEPS`, mosaicRevealOrder.ts) — grouped into larger pieces. A half-built mosaic is a to-do list disguised as art. The completed picture is the natural ending — no additional "final boss" needed.

The mosaic is a single image revealed in order across 298 reveal steps (`LEVEL_STEPS`) — each solved puzzle node unlocks the next slice(s) in sequence. Reveal is count-based: the Nth mosaic piece collected reveals the Nth step, so the reward total must equal the step count (298) — any extra reward reveals nothing. There is no per-journey section assignment; the picture emerges progressively as a whole. The completed mosaic is the natural ending.

---

## 2. Content scope — the level count question

`journeys.ts` defines `levelCount` per pyramid, which becomes `puzzleBudget` in the site map design (the number of puzzle nodes in the site). The per-site counts live in `journeys.ts`; see `pyramid-interior-design.md §12` for canonical totals. The analysis below reads the *shape* of those counts within and across tiers.

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

The mosaic reward total is 298 pieces — one per reveal step — assembled into the stained-glass window. At average micro-loop pace (90 s/puzzle), completing the full game is ~225 minutes of active puzzle time — before accounting for exploration, navigation, and the longer puzzle families. That is a plausible scope for an educational game aimed at extended play over weeks.

---

## 3. Conflict checks against existing documents

### `PUZZLE_FAMILIES.md`

The curriculum map (§7) assigns families to tiers T1–T5. Mapping to game difficulty tiers:

| Game tier | PUZZLE_FAMILIES tier | Families introduced |
|---|---|---|
| Starter | T1 | Cross-sum, Balance scale, Symmetry |
| Junior | T2 | Egyptian doubling, Sundial, Glyph Latin-square (4×4), Target-number, Sequence |
| Expert | T3 | Water clock, Eye of Horus fractions, Sumplete (5×5) |
| Master | T4 | Nonogram (10×10), Kakuro, Clock-arith (decoy) |
| Wizard | T5 | Ceilings: 9×9 Latin-square, 15×15 nonogram, multi-unknown algebra, modular time |

Sumplete is the initial build family (see `design-decisions.md`). This is consistent — Sumplete is a T3 family (PUZZLE_FAMILIES §7: `◐ 5×5` at T3). The initial build targets the expert tier as the live test bed for the site map system.

**One tension:** PUZZLE_FAMILIES §7 says side-families (Latin-square, nonogram, Sumplete) cannot appear before forks debut (T2+), since side-families live in optional branches. The build plan stages forks in Phase 5a, after the linear-spine Phase 1–4 ships. This is structurally correct — but it means the site configs authored in Phase 4 for all 20 pyramids will need **two passes**: one for the linear-spine launch (forks absent) and a second revision once forks ship. This should be explicit in the authoring plan.

### `docs/treasure-effects.md` (removed)

This file no longer exists. All treasure passive effects are now defined in `pyramid-interior-design.md §14` and encoded in `src/data/treasurePerks.ts`. The old probabilistic fields (`higherLootChance`, `mapFragmentChance`, `moreLootChance`, `expeditionBonus`) from `TreasureEffects` have been removed; the perk model has fully replaced them.

---

## 4. Open questions / decisions needed

1. **Wizard 38-node count** — intentional endgame depth, or drift? Decide and note it explicitly (see §2 recommendation).

2. **Tomb "disabled" condition** — once ward-gated tomb branches are in play, the disable condition needs a precise definition. Proposal: disabled only when `solvedEdges` covers all reachable nodes *and* no unspent ward keys in inventory could open further branches. (The validator's forward pass produces this data for free.)

3. **TOMB_SYMBOLS pool sizes** — currently 7–15 per tomb. Fragment model works better with 3–6. Needs authoring in `tableaus.ts` before Phase 6.

4. **Location key presentation** — distinct visual/text treatment needed for the treasure that reveals a new tomb. Design before Phase 6 UI work.

5. **WARD_MIX totals** — 36 ward keys (not 40) since 4 treasures are location keys. Final WARD_MIX values must sum to 36.
