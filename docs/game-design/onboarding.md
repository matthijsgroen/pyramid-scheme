# Onboarding & Introductions

**Principle: Fez for one-time teaching, UI for tracking during play.**

First-encounter explanations for every mechanic that needs one, layered on top
of the core loop rather than woven in. Shipped onboarding lives in Fez
conversations (`public/locales/*/fez.json`) and one-time flags in game storage;
mechanic tutorials use a lightweight modal/banner, not Fez (Fez stays for
narrative moments).

## Not yet built — first-encounter tutorials

One-shot flags in `useProgression` (or a `useTutorials` slice), `seenTutorials:
Set<string>`. Each mechanic checks its flag before showing, sets it on dismiss.

- **Puzzle rules** — first encounter with each family (Sumplete, Tableau, Crocodile); explain win condition, skip on revisit.
- **Traps** — first trap room: timed challenge, health cost on fail, blocked at 1 half-heart.
- **Consumables** — first consumable chest: the consumable bar and carry cap.
- **Detector** — first time `detectionLevel >= 1`: suspicious corners stop the explorer.
- **Hidden passages** — first reveal prompt: what a hidden passage is, that some hold rare loot.
- **Ward keys / gated sections** — first gate: a ward key from a tomb unlocks it.
- **Health and healing** — first health drop: oil and bandages restore hearts.
- **Map pieces** — first map piece: reveals a new tomb on the travel screen.
- **Hieroglyph fragments** — first fragment: the hieroglyph collection mechanic.

The **?**-button replay pattern (shipped on TombExpedition, replays
`tombTutorial`) may generalise across pyramid / tomb / crocodile — revisit
during a UI consistency pass.

## Decisions — rejected findings

Kept as decision records so they don't get re-raised:

- **Blocked-block "reveal" hint** — rejected. "Calculate the value and use it from memory" is correct; blocked blocks never auto-reveal, mental arithmetic is the intended mechanic.
- **Loot rarity label** — rejected. Visual glow is enough for hieroglyphs; not worth the vocabulary overhead.
- **Map-piece popup distinction** — not needed; already distinct from hieroglyph popups.
