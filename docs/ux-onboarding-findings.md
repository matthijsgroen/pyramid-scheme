# UX Onboarding & Discoverability — Todo List

Findings from playtesting audit + grill session. Prioritised by player impact.
Principle: **Fez for one-time teaching, UI for tracking during play.**

---

## ✅ Done

- **Pyramid intro copy** — rewritten to 3 messages, rule lands at message 2 (`pyramidIntro` in fez.json)

---

## High priority

### 1. Tomb tableau — first-entry onboarding
The core puzzle contract (hieroglyphs as variables, hints validate assignments, number lock = final answer) is never explained. Biggest drop-off risk in the game.

- [ ] Add 3 Fez messages to `tombIntro` that fire only on the player's **very first tomb entry ever** (one-time flag):
  - Message: place hieroglyphs into slots
  - Message: hint formulas show if your assignments are correct
  - Message: when all slots filled, enter the result of the main formula in the lock
- [ ] Add a **?** button to the TombPuzzle header that replays the tombIntro Fez conversation
- [ ] Note: the **?** button may become a reusable UI pattern across pyramid, tomb, crocodile — revisit during a UI consistency pass

### 2. Hieroglyph unlock charges — invisible capability
When a player owns the unlock artifact, blocked blocks become tappable, but there's no signal that this is happening or that they have charges.

- [ ] Confirm blocked blocks have a visible glow when unlock charges are available
- [ ] Glow disappears automatically when all charges for this expedition are spent
- [ ] Add one-time Fez message on **first expedition entry** while owning the unlock artifact: introduces the mechanic
- [ ] In the **HieroglyphUnlockPanel**, show which artifact is being used and list any other available unlock artifacts

### 3. Treasure effects — silent gameplay changes
Owning a treasure changes how the pyramid plays (error highlight, early feedback, hieroglyph unlock), but there's no signal during play that something is different.

- [ ] Add one-time Fez message **per treasure effect**, firing the first time that effect is actually active in an expedition (not just owned — e.g. early feedback only fires on pyramids large enough for it to apply)

---

## Medium priority

### 4. Map pieces — thin link to tomb unlock
Players collect map pieces but don't know where to see progress or what they're building toward.

- [ ] Update `mapPiece` Fez conversation to end with: "Check the journey list to see your progress."
- [ ] Add a **persistent visual nudge** (pulsing indicator or badge) on the journey selection button on the Travel screen whenever map piece progress exists for a difficulty but the tomb isn't yet unlocked. Disappears when the tomb unlocks.
- [ ] Make the "X more pieces" count in the mapPiece Fez message dynamic (currently hardcoded — 4 pieces per difficulty, one per expedition, so currently correct but fragile)

---

## Low priority / Polish

### 5. Pyramid intro pacing *(done — copy already updated)*
Rule was buried at message 4 of 5. Now leads at message 2 with conversational Fez voice.

---

## Removed findings

- **Blocked block Fez message** — "calculate the value and use it from memory" is correct. Blocked blocks never auto-reveal; mental arithmetic is the intended mechanic.
- **Loot rarity label** — visual glow is sufficient for hieroglyphs; not worth adding vocabulary overhead.
- **Map piece popup distinction** — already distinct from hieroglyph popups.
