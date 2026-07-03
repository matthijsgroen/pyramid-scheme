# Changelog
All notable user-facing changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased
### Fixed
- Fix corridor corners in pyramid interiors being hard to tap on mobile.
- Fix a completed pyramid's interior showing different corridors explored than when you left it, after revisiting it.

## 0.24.2 - 2026-07-03
### Fixed
- Fix corridor corners in pyramid interiors being hard to tap on mobile.
- Fix a completed pyramid's interior showing different corridors explored than when you left it, after revisiting it.

## 0.24.1 - 2026-07-03
### Fixed
- Fix the back button, floor indicator, and health display inside pyramids and tombs being hidden behind the notch or home indicator on installed devices.
- Fix the interior map opening in the top-left corner instead of centered on screen.
- Fix the level-completion animation replaying over the interior map when returning to a pyramid you were already exploring.
- Fix fully completed pyramids always opening on the "Expedition Completed" screen, blocking revisits to their interiors.
- Fix chests with a consumable item becoming permanently unavailable when your pack was full; they can now be revisited once you have room, and you're told your pack is full instead of silently missing the item. An unlooted chest is now marked differently on the map so it stands out from ones you've fully cleared.
- Fix the fragment-count badge staying on a hieroglyph in the collection screen after it's fully completed.

## 0.24.0 - 2026-07-03
### Added
- **Pyramid interiors** — after solving a pyramid level you now enter the pyramid itself: navigate room by room on a map, open chests along the way, and find your way to the exit.
- **Explorer dot** — a glowing dot shows your movement as you travel through the pyramid interior.
- **Hidden passages** — some corridors and side rooms are concealed behind walls; step close enough to reveal them.
- **Multi-floor pyramids** — deeper pyramids have multiple floors connected by staircases; descend to find richer rewards.
- **Revisit any level** — tap a completed level on the journey path to go back inside and explore it again.
- **Chest rewards** — chests are scattered throughout pyramid interiors; open them for items and fragments.
- **Hieroglyph fragments** — rare items hidden inside pyramids; collect enough pieces of a hieroglyph to complete it.
- **Health system** — you have health points that can be lost to traps; your health carries between rooms.
- **Trap rooms** — some rooms contain traps marked with a skull; you need enough health to enter and must solve a quick arithmetic challenge to escape.
- **Consumable items** — find bandages, oil flasks, and trap tools in chests; use them to restore health, light dark passages, or disarm traps.
- **Consumable detector** — a compass-like tool that shows where you left chests unopened because your inventory was full.
- **Hieroglyph compass** — a tool that pinpoints which pyramid levels still contain pieces of a specific hieroglyph you are chasing.
- **Tomb treasure perks** — completing a treasure tomb run unlocks a permanent power-up that carries into future runs.
- **Ward key gates** — locked gates inside tombs that open when you have completed enough of the tomb to earn the matching key.
- **Color-coded floor-key gates** — keys and the sealed doors they open share the same color so you can match them at a glance.
- **Tomb interiors as explorable maps** — treasure tomb floors are now navigated as full site maps, just like pyramids.
- **Mosaic unlock** — the world mosaic fills in piece by piece as you play through pyramid levels; each completed level reveals more of the picture.
- **Stained-glass mosaic artwork** — the mosaic uses a layered stained-glass visual that reveals from the outside in.
- **Iris transition** — a circular wipe animation plays when you complete a level and when you exit an interior.
- **Puzzle completion animation** — a brief overlay celebrates solving a puzzle before the game moves on.

### Changed
- The pyramid map now scrolls to keep the explorer dot centered as you move, so you can always see what is ahead without manually scrolling.
- Completed rooms and corridors are now tappable again, letting you move back to any room you have already visited.
- Expeditions no longer award inventory items directly on completion; items are found inside the pyramid during exploration instead.
- The alpha notice banner has been updated to explain this is a full redesign of the game being tested from scratch.

## 0.23.6 - 2025-01-01
