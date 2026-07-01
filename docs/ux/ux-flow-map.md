# UX Flow Map — Pyramid Scheme

> **ARCHIVED — pre-redesign baseline.** Describes the system as it existed before the expedition
> redesign (Phases 1–9f). Loot delivery, hieroglyph collection, and interior navigation have all
> changed: see `docs/game-design/EXPEDITION_REDESIGN.md` and `docs/game-design/pyramid-interior-design.md`
> for the current design. Kept as a friction-analysis reference and Phase 16 onboarding input.

> Input document for flow discussion. Focus: Expeditions, Tombs, Hieroglyph collection.
> Describes the current state as-built, not an ideal. Intended as a basis for friction review.

---

## 1. Top-Level Structure

Two screens, horizontally snapped:

```
[ Travel ]  ←→  [ Collection ]
```

- **Travel** — select and start expeditions; companion (Fez) speaks here
- **Collection** — browse collected hieroglyphs and treasures

Launching any expedition replaces both screens with a full-screen expedition view. Returning always lands back on Travel.

---

## 2. Travel Screen

### Entry
- Fez delivers a "welcome" conversation on first visit
- Map shows currently active journey (if any), or prompts to pick one

### Choosing a Journey

Journey selection modal opens when the player clicks the map without an active journey:

- Grid of journey cards (pyramid journeys + treasure tomb journeys)
- **Unlock rules:**
  - First pyramid journey always available
  - Each subsequent pyramid journey unlocks only after the previous is completed (≥1 run)
  - Treasure tomb journeys unlock only when **all** map pieces from the matching difficulty have been collected (scattered across pyramid runs)
  - Tomb journeys become **disabled** once all their treasures have been collected (no more content)
- Each card shows: name, description, difficulty, run count, progress bar (if in progress)
- Tomb cards additionally show: map piece placeholder progress (X / Y pieces collected)

### Starting / Resuming

| State | What happens |
|---|---|
| Fresh journey, no prior run | Starts a new run from level 1 |
| Journey in progress | Resumes from saved level (including partially filled blocks) |
| Journey interrupted (cancelled) | Can resume from where it was cancelled |
| Tomb with no more content | Card is disabled; cannot select |

### Interrupting

- "Interrupt Expedition" button → confirm modal → journey paused, player lands on Travel
- Progress (level number, filled answers) is saved

---

## 3. Pyramid Expedition

### Setup
- "pyramidIntro" conversation plays on entry
- Fez mentions blocked blocks if the level has them

### Level Layout (visual)
Three levels visible simultaneously via horizontal parallax:
- **Current level** — full size, center
- **Next level** — scaled down, visible right (~20%)
- **Future level** — further right, even smaller

Player can manually scroll ahead to preview upcoming levels.

### Level Interaction

Each level is a pyramid of numeric blocks.

**Block types:**
- **Open** — player fills these in
- **Blocked** — hidden until adjacent blocks are correctly filled (auto-reveals)
- **Fixed** — given values, non-interactive

**Rule:** every value above = sum of the two values below it.

**Input:**
- Click block → select it
- Type number → entered as answer (auto-validates)
- Keyboard: arrows navigate between blocks; Enter/Escape confirm/cancel

**Visual feedback:**
- Blue → unanswered
- Orange → answered
- Green → correct
- Red → incorrect

**Treasure effects (if owned):**
- Error highlight: wrong blocks turn red while solving
- Early feedback: N blocks pre-highlighted as hints
- Hieroglyph unlock: player can spend a charge to unlock a blocked block

**Hieroglyph unlock flow:**
1. Click a blocked block → "unlock panel" appears
2. Confirm → block becomes open (spends one charge)
3. Limited to N unlocks (= number of unlock-treasure copies owned)

### Level Completion Sequence

1. All open blocks filled correctly → completion overlay appears (500ms)
2. "levelCompleted" Fez conversation plays (must finish before proceeding)
3. Loot is determined (one item, see §5)
4. If loot exists: loot popup appears (animate in, click to dismiss)
5. Auto-scroll to next level after 2 seconds
6. New level generates; play continues

### Expedition Completion

When last level is cleared:
- Expedition completion overlay with: all items earned this run, count per type
- Announcement if a new journey has unlocked
- "expeditionCompleted" Fez conversation
- "Go Back to Base" button → returns to Travel
- `completionCount` incremented; journey ready to run again

---

## 4. Treasure Tomb Expedition

### Prerequisites
- All map pieces for this difficulty collected (earned from pyramid runs)
- At least one uncollected treasure remaining

### Setup
- "tombIntro" conversation on entry
- Levels are **tableaux** — pre-authored puzzle sets, one per run number

### Tableau Puzzle

Each tableau has:
- A set of **hint formulas** (3–5): left op right = result (result visible)
- A **main formula**: left op right = ? (result hidden)
- Hieroglyph symbols as variables (shared across formulas)

**Interaction — symbol placement:**
1. Player views available hieroglyphs from inventory (bottom panel)
   - Shows X / Y needed for each symbol
2. Click symbol in inventory → auto-fills the next empty slot for that symbol
3. Click a slot directly → toggles symbol assignment
4. When all slots filled → number lock appears

**Validation:**
- Hint formulas show immediately if the chosen symbols make them calculate correctly
- Player uses the hints to deduce the correct symbol assignments
- Main formula's result remains hidden until lock is solved

**Number lock:**
- Player enters 1–4 digit result of the main formula
- States: empty → error (shake, auto-reset after 2s) → open (unlock animation)
- On open: 1500ms delay → loot popup ("tombLoot" conversation) → level complete

**Inventory shortage:**
- If player doesn't own enough hieroglyphs to fill the puzzle → "notEnoughHieroglyphs" conversation
- Puzzle is effectively blocked until more hieroglyphs are collected from pyramid runs

### Final Puzzle (Crocodile)

After all tableaux for a run are exhausted, a "Crocodile Puzzle" plays:

- Series of formula comparisons shown as stacked pairs with a crocodile between them
- Player clicks whichever side is larger (the crocodile "eats" the bigger value)
- Formulas scale down as answered (stack shrinks upward)
- Final step: single-digit number lock
- On completion: treasure awarded → expedition complete → returns to base

---

## 5. Loot System

### When loot is determined
After each pyramid level completes (one item per level).

### Priority order (first match wins)

1. **Map Piece** (rare)
   - Chance: `base + (levelNr / levelCount × ramp)`
   - Bonus chance from map-fragment treasures
   - First piece triggers "mapPiece" Fez conversation
   - Enables tomb journey unlocking for this difficulty when all pieces collected

2. **Hieroglyph** (common)
   - ~40% base chance per level
   - Random symbol from current difficulty pool
   - Duplicates possible; count tracked in inventory
   - Boosted by certain treasures

3. **Expedition Bonus** (epic)
   - Triggered by owning specific bonus-effect treasures
   - Rare drop on level completion

### Loot Popup

- 300ms burst animation → 800ms scale-in
- Shows: symbol, name, rarity glow, description
- Click anywhere to dismiss
- Only first item shown if multiple are awarded simultaneously

---

## 6. Collection Screen

### Structure

Two category groups:

**Hieroglyphs** (4 categories):
- Deities, Professions, Animals, Artifacts

**Treasures** (5 categories, one per difficulty):
- Merchant Cache, Noble Vault, Temple Secrets, Ancient Relics, Mythical Artifacts
- A treasure category only appears after completing the matching tomb

### Item Grid

- Collected items show: symbol icon, difficulty colour, count badge (if > 1)
- Uncollected slots show as empty placeholders (player can see how many remain)
- Items sorted by difficulty

### Detail Panel

Sticky panel at bottom, appears when an item is selected:
- Large symbol, name, difficulty label, description/lore text
- Treasure items additionally show: effect description

---

## 7. Progression Summary

```
Pyramid (starter)
  └─ complete → unlocks Pyramid (junior)
  └─ collect all map pieces → unlocks Tomb (starter)
       └─ complete runs → collect all treasures → tomb disabled

Pyramid (junior)
  └─ complete → unlocks Pyramid (expert)
  └─ collect all map pieces → unlocks Tomb (junior)
       └─ ...

(pattern repeats through expert → master → wizard)
```

Hieroglyphs only come from pyramid expeditions.
Treasures only come from tomb expeditions.
Tomb access requires hieroglyphs (used as puzzle variables).

---

## 8. Companion (Fez) Conversation Map

| Trigger | Context |
|---|---|
| welcome | Enter Travel |
| chooseExpedition | Open journey selection |
| pyramidIntro | Start pyramid expedition |
| pyramidBlockedBlocks | Level has blocked blocks |
| levelCompleted | A level is cleared |
| mapPiece | First map piece awarded |
| tombIntro | Start tomb expedition |
| notEnoughHieroglyphs | Not enough symbols to fill tableau |
| tombLoot | Treasure awarded after lock opens |
| expeditionCompleted | Full expedition finished |
| collectionIntro | First item collected, visiting collection |

---

## 9. State That Persists

| Data | Scope |
|---|---|
| Journey progress (levelNr, completionCount, mapPiece) | Per journey |
| In-progress level answers (block values) | Per level per run |
| Inventory (item counts) | Global |
| Active / interrupted journey | Global (one at a time) |

---

*End of current-state map.*
