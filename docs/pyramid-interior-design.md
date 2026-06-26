# Pyramid Interior Design

Status: design doc · resolved decisions from design session 2026-06-26  
Companion to: `docs/game-loop.md`, `EXPEDITION_REDESIGN.md`, `IMPLEMENTATION_PLAN.md`

---

## 1. The two-world model

The game has two distinct site types. Their loot is strictly separated — nothing crosses over.

### Pyramids — the exploration space

| Loot type | Quantity in game | Placement rule |
|---|---|---|
| Map piece | 1 per tomb per journey (on the right floor) | Authored per tomb; surface for first tomb, deep floors for later tombs |
| Mosaic tiles | 298 total | Distributed across pyramid sites; fills any branch endpoint |
| Hieroglyph fragment | 157 total (2–3 per hieroglyph) | One per site that carries one; spread across journeys |
| Seal key | Local only | One chest per pyramid; opens one sealed gate within that same site |
| Ward gate | 36 total | Branch endpoint; leads to stairhead → new floor |

Ward gates always lead to a staircase. The staircase is the reward — a new floor below.

### Tombs — the key factory

| Loot type | Quantity | Notes |
|---|---|---|
| Treasure (ward key) | 36 total | Opens one specific pyramid floor |
| Treasure (location key) | 4 total | Reveals the next tomb in the same tier |

40 treasures total. Most open pyramid floors; a few open entirely new tomb locations.

---

## 2. Pyramid interior node types

The interior is a node graph (from `EXPEDITION_REDESIGN.md` §3). Every room is one of:

| Node type | Role | Loot / effect |
|---|---|---|
| `puzzle` | Math puzzle | Opens the next corridor on solve |
| `fork` | Free branch point | Reveals branch corridors ahead |
| `treasure` | Chest room | Gives hieroglyph fragment, mosaic tiles, map piece, or seal key |
| `gate (seal)` | Locked door (local) | Opens when the seal key from this site is collected |
| `gate (ward)` | Locked door (cross-site) | Opens when player holds the specific tomb treasure |
| `stairhead` | Floor transition | Descends to the next floor |
| `exit` | Leave the pyramid | Ends the interior visit |

**Seal key flow within a site:**
```
branch → [treasure: seal key] → elsewhere in site → [gate: seal] → more content
```

**Ward gate flow across worlds:**
```
branch endpoint → [gate: ward, requires treasure X]
                        ↓ (after collecting treasure X from its tomb)
                  [stairhead] → floor below
```

---

## 3. The hieroglyph fragment model

Hieroglyphs are no longer found as complete single-chest discoveries. Instead, fragments are scattered across pyramid sites. Collecting enough fragments of the same hieroglyph permanently completes it.

**Fragment counts per tier:**

| Tier | Hieroglyphs | Fragments each | Total fragments |
|---|---|---|---|
| Starter | 7 | 2 | 14 |
| Junior | 10 | 2 | 20 |
| Expert | 14 | 3 | 42 |
| Master | 15 | 3 | 45 |
| Wizard | 12 | 3 | 36 |
| **Total** | **58** | — | **157** |

**Placement rules (authored into the generator):**
- Fragments are **specific** — each chest gives a named fragment ("Ra fragment"), not a generic pool
- No two fragments of the same hieroglyph in the same pyramid site
- No two fragments of the same hieroglyph in the same journey (exploration)
- Fragments can appear on deep floors, not just surface level
- Tier-appropriate distribution: starter fragments in starter/junior content, wizard fragments in master/wizard content (with overlap to reward revisits)

**Collection screen:** 58 slots, 4 categories. Incomplete hieroglyphs show a silhouette with fragment progress (Ra: 1/2). Completing a hieroglyph is a visible moment — the silhouette fills in.

**Tomb rooms:** a tableau room requiring an incomplete hieroglyph shows as locked (unknown symbol silhouette). The fragment hunt and the tomb puzzle gate each other — you explore pyramids to complete hieroglyphs, you complete hieroglyphs to progress the tomb.

---

## 4. Mosaic tiles

298 total slices, grouped into displayable pieces. Mosaic tiles fill any branch endpoint that doesn't have a more specific reward.

**Placement rules:**
- The critical path through every pyramid always ends in a mosaic tile bundle (guaranteed)
- Optional branch endpoints without a hieroglyph fragment chest or seal key get mosaic tiles
- Bundle sizes vary by depth: a deep floor branch might give 3–4 tiles; a short surface branch gives 1–2

Every branch explored is worth something. Mosaic tiles are the "never empty-handed" guarantee.

---

## 5. The tomb structure

### Multiple tombs per tier

At higher difficulties, one monolithic tomb is replaced by multiple smaller, more focused tombs. Each tomb has 4–6 treasures (a completable session length) and its own theme and hieroglyph pool.

| Tier | Tombs | Treasures per tomb | Total treasures | Tomb names (placeholder) |
|---|---|---|---|---|
| Starter | 1 | 4 | 4 | Merchant's Vault |
| Junior | 1 | 6 | 6 | Book of Professions |
| Expert | 2 | 4 each | 8 | Temple Outer / Temple Inner |
| Master | 2 | 5 each | 10 | Hall of Ma'at / Hall of Osiris |
| Wizard | 3 | 4 each | 12 | Pyramid A / B / C |
| **Total** | **9** | — | **40** | — |

### Unlocking tombs

**First tomb of each tier** — unlocked by collecting map pieces from that tier's surface-level pyramids (the traditional way). `piecesRequired` is authored per tomb.

**Second and third tombs** — unlocked by a *location key* treasure found in the previous tomb. The location key is one specific treasure (typically the deepest/last one) that reveals the new tomb exists. No map pieces required for entry — completing the previous tomb is the gate.

```
explore tier pyramids (surface)
  → collect 4 map pieces → unlock Tomb A
      → complete Tomb A → location key treasure → Tomb B revealed
          → explore pyramid deep floors (opened by Tomb A's ward keys)
              → collect map pieces for Tomb B (found on those floors)
                  → unlock Tomb B → complete Tomb B → location key → Tomb C (wizard)
```

### Map piece distribution rules

**One map piece per pyramid journey, on the surface floor.** Every pyramid journey contributes exactly one map piece for the first tomb of its tier. This gives 4 map pieces per first-tomb (4 journeys per tier × 1 piece each).

**Extra-tomb pieces are always gated.** Second and third tombs within a tier (expert_b, master_b, wizard_b, wizard_c) require map pieces found on deep floors — floors that are only accessible after collecting the corresponding ward key from the first tomb of that tier. The player must complete expert_a's tomb to unlock the floor that contains expert_b's pieces.

**Main goal is always mosaicPiece in the full design.** The critical path through every pyramid ends in a mosaic tile bundle. Map pieces ride as intermediate chest nodes on the main path (linear sites) or on branch endpoints (branched sites). In the current linear-only phase, there are no branches, so map pieces temporarily occupy the main goal slot — Phase 5 restores mosaicPiece to the main goal when branches are introduced.

### piecesRequired per tomb

| Tomb | piecesRequired | Source | Gated? |
|---|---|---|---|
| starter_a | 4 | starter_1–4 surface, one per journey | No |
| junior_a | 4 | junior_1–4 surface, one per journey | No |
| expert_a | 4 | expert_1–4 surface, one per journey | No |
| expert_b | 2 | expert deep floors (floor 2), via expert_a ward keys | Yes — requires expert_a treasure |
| master_a | 4 | master_1–4 surface, one per journey | No |
| master_b | 3 | master deep floors (floor 2), via master_a ward keys | Yes — requires master_a treasure |
| wizard_a | 4 | wizard_1–4 surface, one per journey | No |
| wizard_b | 3 | wizard deep floors (floor 2), via wizard_a ward keys | Yes — requires wizard_a treasure |
| wizard_c | 2 | wizard deep floors (floor 3), via wizard_b ward keys | Yes — requires wizard_b treasure |

---

## 6. The floor system

### Ward gate → staircase (always)

Every ward gate leads to exactly one stairhead. The stairhead is on the other side. The floor is the reward — each new floor has its own puzzle rooms, branch endpoints, loot, and potentially another ward gate.

### Map pieces on deep floors

Floors don't just contain hieroglyph fragments and mosaic tiles — they can contain map pieces for later tombs in the tier. A pyramid in the expert tier might have:

```
Surface floor:   puzzle → puzzle → [treasure: map piece for expert_a] → exit
Floor 2 (via ward gate from expert_a treasure):
                 puzzle → [treasure: map piece for expert_b] + hieroglyph fragments
```

This creates layered revisit motivation: the first visit finds expert_a's piece; after unlocking the floor with expert_a's treasure, returning finds expert_b's piece.

### Mixed difficulty floors

Floors are not tied to the pyramid's tier. Ward keys from any tomb can unlock floors in any pyramid. Authored in `WARD_MIX`:

| Treasure tier | Target pyramid tiers | Distribution |
|---|---|---|
| Starter (4 ward keys) | Starter ×3, Junior ×1 | — |
| Junior (6 ward keys) | Starter ×2, Junior ×3, Expert ×1 | — |
| Expert (7 ward keys) | Junior ×2, Expert ×4, Master ×1 | — |
| Master (9 ward keys) | Expert ×3, Master ×5, Wizard ×1 | — |
| Wizard (10 ward keys) | Master ×5, Wizard ×4, Junior ×1 | wild placement |

36 ward keys total (40 treasures − 4 location keys).

### Ward gate visibility

Always visible once the corridor is revealed. Shows the treasure category immediately; shows the specific treasure name when the player is within one difficulty tier of that tomb.

---

## 7. Per-tier pyramid interior template

The pyramid exterior (cross-sum puzzle) is unchanged. The interior is entered after solving it.

### Starter (T1) — linear, no branches

```
Entrance ── puzzle ── puzzle ── [treasure: mosaic or fragment] ── exit
```
- 1 floor, no forks, no gates
- 2–3 puzzle nodes
- No ward gates (introduced at junior)

### Junior (T2) — first fork, first ward gates

```
Entrance ── puzzle ── [fork] ── puzzle ── [treasure: mosaic] ── exit
                        └── [treasure: fragment OR gate: ward → stairhead]
```
- 1 floor (some have floor 2 via starter ward key)
- One fork, one optional branch
- Ward gates debut here

### Expert (T3) — seals + 2 floors

```
Floor 1:
Entrance ── puzzle ── [fork] ── puzzle ── [gate: ward → stairhead floor 2]
                        ├── puzzle ── [treasure: fragment]
                        └── [gate: seal] ── puzzle ── [treasure: mosaic]

Floor 2:
── puzzle ── puzzle ── [treasure: fragment, higher tier] + [treasure: map piece for expert_b]
```
- Seal gates debut
- Floor 2 may carry a map piece for the tier's second tomb

### Master (T4) — multiple forks, dormant content

```
Floor 1:
Entrance ── puzzle ── [fork] ── puzzle ── [fork] ── puzzle ── exit
                        ├── [treasure: mosaic]
                        ├── [gate: ward → stairhead floor 2]
                        └── [gate: seal] ── [treasure: fragment]

Floor 2:
── puzzle ── [treasure: fragment + map piece for master_b]
          └── [gate: ward → stairhead floor 3]

Floor 3:
── puzzle ── [treasure: mosaic bundle]
```

### Wizard (T5) — full complexity

All mechanics active. Up to 3 floors. Floor 2 carries map pieces for wizard_b; floor 3 carries map pieces for wizard_c. Multiple ward gates at different floors means multiple distinct reasons to revisit.

---

## 8. Tomb interior design

### Structure

Each tomb has **sections**, one per treasure. Each section:
- 1–3 tableau puzzle rooms (formula puzzles using discovered hieroglyphs from the pool)
- 1 treasure room at the end

**Early sections:** open on entry  
**Later sections:** sealed — key found in an earlier section  
**Last section:** may require a ward key (a treasure from an earlier section within the same tomb)

### The location key treasure

The final treasure in each multi-tomb tier's earlier tomb is the *location key* — a special treasure that reveals the next tomb's existence. Mechanically it can also be a ward key for a pyramid floor (no reason it can't do both). Its reward text announces the discovery.

### Tableau puzzle model

- Tomb map (layout) is **permanent** — the player remembers it across visits
- Tableau formulas **regenerate each visit** — fresh numbers, same hieroglyph set
- Treasure rooms show "collected" on revisit — no re-collecting, but the path stays navigable

### Hieroglyph symbol pool

Each tomb has a small authored pool of 3–6 symbols, sourced from `TOMB_SYMBOLS` in `tableaus.ts`. The generator reads this — no separate field in the tomb template. A tableau room is locked if any of its symbols are not yet completed by the player.

---

## 9. World generation architecture

### Fixed seed, generated at dev time

The game world is generated once during development, validated, then shipped as static data. Players all share the same world.

```
scripts/generateWorld.ts
  → reads authored rules (TIER_TEMPLATES, FRAGMENT_SPREAD, WARD_MIX, TOMB_TEMPLATES)
  → generates layouts + fragment placement + ward assignments + map piece placement
  → runs reachability solver
  → writes src/data/generatedWorld.ts
  → commit that file
```

### Authored rule categories

**1. Tier site templates** (`TIER_TEMPLATES`) — spine ratio, fork count range, branch depth range, allowed gate types, max additional floors per tier.

**2. Fragment spread rules** (`FRAGMENT_SPREAD`) — fragments per hieroglyph by tier, which pyramid tiers can hold them, max per journey, max per site.

**3. Ward mix budget** (`WARD_MIX`) — how many ward keys from each treasure tier go to each pyramid tier. Authorable counts, not probabilities.

**4. Tomb templates** (`TOMB_TEMPLATES`) — section count, tableau count per section, gating type per section, `piecesRequired`. Hieroglyph pool comes from `TOMB_SYMBOLS` — not duplicated here.

**5. Solver constraints** (code, not data) — no circular unlock chains, all fragments reachable before completing their hieroglyph, all tomb map pieces reachable before that tomb's circular dependencies, no dead-end game states.

### Generator state by phase

| Phase | Map pieces placed | Fragment slots | Gated deep pieces |
|---|---|---|---|
| 4 (linear, current) | 20 surface (main goal, no branches) | 47 / 157 | 0 — deferred |
| 5a (branches) | 20 surface (branch endpoints); main goal → mosaicPiece | ~100 / 157 | 0 — deferred |
| 5c (floors) | 20 surface + 10 gated deep floors | ~140 / 157 | 10 (expert_b ×2, master_b ×3, wizard_b ×3, wizard_c ×2) |
| 6+ (full world) | 30 total | 157 / 157 | all placed |

**Note on linear-phase compromise:** Phase 4 configs are linear (no branches), so map pieces temporarily sit at the main goal (replacing mosaicPiece). `yarn generate-world` will warn about unplaced fragments — this is expected until Phase 5 adds branch endpoints.

### Tuning workflow

1. Adjust an authored rule
2. `yarn generate-world`
3. Generator warns about unplaced fragments (expected for current phase)
4. Inspect output, iterate on rules if needed
5. Commit `generatedWorld.ts`

CI runs `yarn validate-world` to catch rule changes that weren't regenerated.

---

## 10. The numbers at a glance

| | Count | Notes |
|---|---|---|
| Pyramid sites | 129 | Across 20 journeys |
| Tomb sites | 9 | 1+1+2+2+3 across the 5 tiers |
| Total hieroglyphs | 58 | Permanent once completed |
| Hieroglyph fragments | 157 | 2 per starter/junior hieroglyph, 3 per expert/master/wizard |
| Total treasures | 40 | 36 ward keys + 4 location keys |
| Pyramid floors unlocked | 36 | One per ward key treasure |
| Map pieces in the world | 30 | Distributed surface + deep floors; per tomb: 4+4+4+2+4+3+4+3+2 |
| Mosaic tiles | 298 | Fill remaining branch endpoints |

---

## 11. Open questions

1. **Wizard 38-node count** — intentional endgame depth, or drift? Decide and note in `journeys.ts`.

2. **Two-pass site config authoring** — Phase 4 configs need to flag which sites gain branches in Phase 5, or defer those sites until Phase 5a ships.

3. **Tomb "disabled" condition** — definition: disabled only when all reachable nodes are solved and no unspent ward keys could open further branches.

4. **`higherLootChance` / `mapFragmentChance` fate** — vestigial after redesign. Remove or replace with redesign-compatible effects before Phase 6.

5. **Mosaic two-layer model** — 20-piece image (one section per journey) vs 298-slice reveal mechanism. Confirm both layers are intentional and won't collide.

6. **`inventoryLootLogic.ts` migration** — becomes vestigial once fragments replace probabilistic drops. Remove in Phase 6.

7. **TOMB_SYMBOLS pool sizes** — currently 7–15 per tomb; should be reduced to 3–6 to fit the permanent-discovery/fragment model. Authoring work in `tableaus.ts`.

8. **Treasure passive effects** — effects should be themed per tomb (e.g. merchant tomb effects relate to loot/fragments; priestly tomb effects relate to tableau solving). Design needed before Phase 6.

9. **Location key presentation** — the treasure that reveals a new tomb needs a distinct visual/text treatment to signal it's special. Design needed before Phase 6 UI work.

10. **Ward gate count recalculation** — with 4 location key treasures, only 36 treasures act as ward keys. The WARD_MIX totals should sum to 36, not 40. Verify when authoring final WARD_MIX values.
