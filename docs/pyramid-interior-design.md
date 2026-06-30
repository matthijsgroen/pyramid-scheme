# Pyramid Interior Design

Status: design doc · updated 2026-06-30 with trap system  
Companion to: `docs/game-loop.md`, `EXPEDITION_REDESIGN.md`, `IMPLEMENTATION_PLAN.md`

---

## 1. The two-world model

The game has two distinct site types. Their loot is strictly separated — nothing crosses over.

### Pyramids — the exploration space

| Loot type | Quantity in game | Placement rule |
|---|---|---|
| Map piece | 1 per tomb per journey (on the right floor) | Authored per tomb; surface for first tomb, deep floors for later tombs |
| Mosaic tiles | 298 (fixed) | Main path chests — guaranteed filler; never empty-handed |
| Hieroglyph fragment | 308 total (matrix by tier × section) | Side path end rewards first; main path chests as overflow |
| Seal key | Local only | One chest per pyramid; opens one sealed gate within that same site |
| Ward gate | 36 total | Branch endpoint; leads to stairhead → new floor |
| Consumable | ~147 total | Normal chests; used to heal or bypass traps |

**Loot priority order:**
1. Side path end rewards → hieroglyph fragments (primary delivery)
2. Trap-gated side path end rewards → mosaic tiles or deep map pieces (see §11)
3. Main path chests → mosaic tiles (filler; count floats with world geometry)
4. Main path chests → consumables (mummy bandages, healing oils, trap tools)
5. Main path chests → fragment overflow (if too many authored side paths claim fragments)

World builder warns when side paths exceed available fragment slots.

Ward gates always lead to a staircase. The staircase is the reward — a new floor below.

### Tombs — the key factory

| Loot type | Quantity | Notes |
|---|---|---|
| Treasure (ward key) | 36 total | Opens one specific pyramid floor; also grants a permanent passive effect |
| Treasure (location key) | 4 total | Reveals the next tomb in the same tier; also grants a permanent passive effect |

40 treasures total. Every treasure grants a **permanent passive effect** in addition to its key function. Effects are themed to the tomb and accumulate across the whole game — the player grows stronger as they explore deeper.

**Permanent effect categories:**

| Effect | Description |
|---|---|
| Max health increase | Raise the health ceiling (more tolerance for failed traps) |
| Armor / protection | Reduce damage taken from failed traps (floors the damage) |
| Trap insight | More time to answer trap questions |
| Fragment sense | Reveal which journeys still hold a specific hieroglyph's fragments |

Higher-tier tombs grant stronger effects. Early tombs (starter, junior) primarily give max health increases — straightforward power. Later tombs give armor and insight effects — more situational, more interesting.

---

## 2. Pyramid interior node types

The interior is a node graph (from `EXPEDITION_REDESIGN.md` §3). Every room is one of:

| Node type | Role | Loot / effect |
|---|---|---|
| `puzzle` | Math puzzle | Opens the next corridor on solve |
| `fork` | Free branch point | Reveals branch corridors ahead |
| `treasure` | Chest room | Gives hieroglyph fragment, mosaic tiles, map piece, seal key, or consumable |
| `gate (seal)` | Locked door (local) | Opens when the seal key from this site is collected |
| `gate (ward)` | Locked door (cross-site) | Opens when player holds the specific tomb treasure |
| `stairhead` | Floor transition | Descends to the next floor |
| `exit` | Leave the pyramid | Ends the interior visit |
| `warning` | Trap alert (expert+) | Free node before a trapped corridor; player may turn back |

**Trapped corridors** are an attribute on edges, not a node type. The corridor between a `warning` node and its branch endpoint is trapped — moving through it triggers a timed math question.

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

**Fragment counts per hieroglyph — scaled by tier and first-blocking section:**

Fragment count depends on (a) which tier the hieroglyph belongs to and (b) which tomb section it first appears in on run 1. Later sections mean the player already has more playing surface when they need that hieroglyph. Hieroglyphs only needed on tomb revisits (run 2+) get the revisit count — placed as collectibles now, tuned when the revisit mechanic ships.

| | Sec 1 | Sec 2 | Sec 3 | Sec 4 | Sec 5 | Sec 6 | Revisit |
|---|---|---|---|---|---|---|---|
| Starter | 2 | 3 | — | — | — | — | 3 |
| Junior | 3 | 4 | 4 | — | — | — | 4 |
| Expert | 4 | 5 | 5 | 6 | — | — | 5 |
| Master | 5 | 6 | 6 | 6 | 7 | — | 6 |
| Wizard | 6 | 7 | 7 | 7 | 8 | 8 | 8 |

**Per-tier totals (hieroglyphs × fragments):**

| Tier | Hieroglyphs | Total fragments |
|---|---|---|
| Starter | 7 | 19 |
| Junior | 10 | 39 |
| Expert | 14 | 69 |
| Master | 15 | 88 |
| Wizard | 12 | 93 |
| **Total** | **58** | **308** |

The starter tomb section 1 requires 4 hieroglyphs × 2 fragments = 8 finds — achievable in 17 starter pyramids. Revisit hieroglyphs are those not needed in run 1 at all; they exist as collectibles and for the deferred multi-run tomb mechanic.

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
| 4 (linear, current) | 20 surface (main goal, no branches) | ~47 / 308 | 0 — deferred |
| 5a (branches) | 20 surface (branch endpoints); main goal → mosaicPiece | ~150 / 308 | 0 — deferred |
| 5c (floors) | 20 surface + 10 gated deep floors | ~250 / 308 | 10 (expert_b ×2, master_b ×3, wizard_b ×3, wizard_c ×2) |
| 6+ (full world) | 30 total | 308 / 308 | all placed |

**Note on linear-phase compromise:** Phase 4 configs are linear (no branches), so map pieces temporarily sit at the main goal (replacing mosaicPiece). `yarn generate-world` will warn about unplaced fragments — this is expected until Phase 5 adds branch endpoints.

### Tuning workflow

1. Adjust an authored rule
2. `yarn generate-world`
3. Generator warns about unplaced fragments (expected for current phase)
4. Inspect output, iterate on rules if needed
5. Commit `generatedWorld.ts`

CI runs `yarn validate-world` to catch rule changes that weren't regenerated.

---

## 10. Loot economy at a glance

### Reward slot supply (full world)

| Slot type | Surface | Ward floors (36) | Total |
|---|---|---|---|
| Side path endpoints | 244 | 108 | **352** |
| Main path chests | 259 | 72 | **331** |
| Main end rewards | 104 | 36 | **140** |
| **Total** | **607** | **216** | **823** |

Surface side path breakdown: 20 journeys × 2 special pyramids (3+6 branches) + 64 simple pyramids × 1 branch = 244. Ward floor estimate: ~3 side paths + 2 chests + 1 main end per floor.

### Loot demand

| Loot type | Count | Slot type |
|---|---|---|
| Hieroglyph fragments | 308 | Side path endpoints (primary), chests (overflow) |
| Mosaic tiles | 298 | Chests + main end rewards |
| Map pieces | 30 | Side path endpoints (20 surface + 10 deep floors) |
| Seal / floor keys | ~40 | Chest slots (local mechanic, 1 per branchy pyramid) |
| Consumables | ~147 | Chests — mummy bandages, healing oils, trap tools |
| **Total assigned** | **823** | |

All 823 slots assigned. Consumables (trap system, §11) absorb the previously unassigned 147 slots.

## 11. Trap system

### Overview

Traps appear on specific **authored side branches** at expert difficulty and above. They are a corridor attribute — not a room type. The main spine is always trap-free; the player can always backtrack to the exit even at zero health.

```
[fork] ── [warning] ══(trapped)══ [treasure: mosaic / deep map piece]
                ↑
          player may turn back here
```

### Encounter flow

When the player moves through a trapped corridor, a timed math question appears:

- **Pass:** corridor opens; player reaches the endpoint treasure
- **Fail:** take health damage; corridor stays closed (retry is possible)
- **Health = 0 on attempt:** entry is blocked entirely — the warning node shows the corridor as inaccessible until health is restored

The question's difficulty and time limit scale with the pyramid tier.

### Health

Players start with **3 hearts**. Tomb treasures can increase the maximum (e.g. to 4, 5, or 6 hearts over the course of the game). Trap damage and armor values are open — see §13 Q12.

Health is a **session-persistent resource** — it carries across pyramid visits and does not reset on entry or exit. This is what makes the cross-pyramid backtracking loop meaningful: running low in pyramid B sends you back to pyramid A (or any accessible site) to find consumables before returning.

The main spine being trap-free guarantees the player can always reach the exit, even at zero health.

Health persistence between sessions (save/quit and resume) is an open question — see §13.

### Loot behind traps

Trap endpoints hold only high-value optional loot:

| Loot type | Notes |
|---|---|
| Mosaic tiles | Most common trap reward — desirable but never blocking |
| Deep tomb map pieces | A subset; some later-tomb map pieces require taking a risk |

Trap endpoints **never** hold hieroglyph fragments, seal keys, or ward gates — those must stay accessible without health cost.

### Mitigating traps

Two layers of mitigation: **consumables** (tactical, found in chests) and **permanent upgrades** (strategic, from tomb treasures):

**Consumables** — found in normal pyramid chests:

| Item | Effect |
|---|---|
| Mummy bandage | Restore a small amount of health |
| Healing oil | Restore more health (rarer find) |
| Trap tool | Bypass a trapped corridor without answering the question |

**Permanent upgrades** — granted by tomb treasures (see §1):

| Effect | Impact on traps |
|---|---|
| Max health increase | More total health to risk on traps |
| Armor / protection | Failed traps deal less damage |
| Trap insight | More time to answer trap questions |

Consumables fill the 147 previously unassigned reward slots (see §10). Permanent upgrades come from tomb treasures — no extra slots needed.

### Difficulty gating

| Tier | Traps |
|---|---|
| Starter | None |
| Junior | None |
| Expert | 1 trap per branchy pyramid |
| Master | 1–2 traps per pyramid |
| Wizard | 2–3 traps per pyramid |

---

## 12. Key counts at a glance

| | Count | Notes |
|---|---|---|
| Pyramid sites | ~104 | 20 journeys, capped at 6 levels each; exact count pending journey trim decision |
| Tomb sites | 9 | 1+1+2+2+3 across the 5 tiers |
| Total hieroglyphs | 58 | Permanent once completed |
| Hieroglyph fragments | 308 | Scaled by tier × first-blocking section (see §3 matrix) |
| Total treasures | 40 | 36 ward keys + 4 location keys |
| Pyramid floors unlocked | 36 | One per ward key treasure |
| Map pieces in the world | 30 | Distributed surface + deep floors; per tomb: 4+4+4+2+4+3+4+3+2 |
| Consumables | ~147 | Mummy bandages, healing oils, trap tools — in normal chests |
| Mosaic tiles | 298 (fixed) | Main path chest filler |

---

## 13. Open questions

1. **Wizard 38-node count** — intentional endgame depth, or drift? Decide and note in `journeys.ts`.

2. **Two-pass site config authoring** — Phase 4 configs need to flag which sites gain branches in Phase 5, or defer those sites until Phase 5a ships.

3. **Tomb "disabled" condition** — definition: disabled only when all reachable nodes are solved and no unspent ward keys could open further branches.

4. **`higherLootChance` / `mapFragmentChance` fate** — vestigial after redesign. Remove or replace with redesign-compatible effects before Phase 6.

5. **Mosaic two-layer model** — 20-piece image (one section per journey) vs 298-slice reveal mechanism. Confirm both layers are intentional and won't collide.

6. **`inventoryLootLogic.ts` migration** — becomes vestigial once fragments replace probabilistic drops. Remove in Phase 6.

7. **TOMB_SYMBOLS pool sizes** — currently 7–15 per tomb; should be reduced to 3–6 to fit the permanent-discovery/fragment model. Authoring work in `tableaus.ts`.

8. **Treasure passive effect values** — categories are settled (see §1 tomb loot table). Exact numerical values (how much health, damage reduction percentage, time bonus) need playtesting once traps are implemented.

9. **Location key presentation** — the treasure that reveals a new tomb needs a distinct visual/text treatment to signal it's special. Design needed before Phase 6 UI work.

10. **Ward gate count recalculation** — with 4 location key treasures, only 36 treasures act as ward keys. The WARD_MIX totals should sum to 36, not 40. Verify when authoring final WARD_MIX values.

11. **Health persistence across sessions** — health is session-persistent within a play session. Decide whether health saves to disk (carries across quit/resume) or resets to full on each session start. Resetting on session start is simpler and forgiving; persisting rewards careful play across sittings but may frustrate returning players with zero health.

12. **Trap damage value** — starting health is **3 hearts**. Max health upgrades from tomb treasures extend this (e.g. 4→5→6 hearts over the game). Decide how much a failed trap costs: 1 full heart (simple, 3 attempts before blocked) or ½ heart (more forgiving, but requires half-heart display). Needs playtesting once traps are implemented.

13. **Consumable distribution density** — 147 consumable slots across 823 total is ~18%. Should distribution be flat (same density everywhere) or concentrated near trap-heavy tiers (expert+)? Tunable via authored rules in `TIER_TEMPLATES`.
