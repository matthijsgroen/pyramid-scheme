# Changelog Maintenance

Apply this instruction whenever you add, change, or remove anything a player would notice.

## File location

`CHANGELOG.md` at the repo root, [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

## What belongs in `[Unreleased]`

Log an entry when the change is **visible to the player**:

| Category       | Examples                                               |
| -------------- | ------------------------------------------------------ |
| **Added**      | New screen, new mechanic, new item, new reward type    |
| **Changed**    | Altered UI text, reworked flow, rebalanced drop rates  |
| **Removed**    | Feature or content removed from the game               |
| **Fixed**      | Bug that was present in a previous release (see below) |
| **Deprecated** | Feature that will be removed in a future release       |

## What does NOT belong

- Internal refactors, test additions, type fixes, architecture changes — invisible to the player.
- Bug fixes for bugs introduced **in the current unreleased work**. If the feature was never shipped, the bug was never experienced; don't log it.

## The bug-fix rule in plain terms

> A fix only gets a `Fixed` entry if the broken behaviour appeared in a version listed below `[Unreleased]` in the changelog.

When in doubt: check whether `package.json` version changed since the bug was introduced. If yes → log it. If no → skip it.

## Language

Write for the player, not the developer. Entries must be readable by someone who has never seen the code.

- **No technical terms**: no component names, hook names, file paths, refactors, DSL, or architecture jargon.
- **Describe the experience**: what does the player see, feel, or do differently? Write that.
- **Bad**: "Add `useDetector` hook with compass and consumable modes to `DetectorPanel`."
- **Good**: "A compass tool shows which pyramid levels still contain pieces of a hieroglyph you are looking for."

## Length: quick bullets, not prose

A changelog is scanned, not read. **One fact per bullet, one line, roughly 20 words.** If a bullet needs
a second sentence, it is usually two bullets.

- **Split compound changes.** "The mosaic is five scenes… and each scene belongs to a difficulty… and you
  place them yourself" is three entries.
- **State the change, not the reasoning.** Why it was done, how it works, and what it is like under the
  hood belong in the commit message and the PR — never here.
- **Only contrast with the old behaviour when the change is otherwise unreadable**, and then in a clause,
  not a sentence: "…instead of dropping you into the first one."
- **Cut the flourish.** No "so that it reads as", no "which means", no scene-setting.

**Too long**: "You place the pieces yourself. A piece you find is carried until you set it in: the mosaic
screen shows a 'Place 4 pieces' button, and tapping it drops them into the window one at a time, lowest
scene first, each one flaring as it lands. So a scene finishing is the end of something you did."

**Right**: "You place pieces yourself: a 'Place 4 pieces' button drops them in one at a time, lowest scene
first."

## Format reminder

```markdown
## [Unreleased]

### Added

- Short present-tense sentence describing what the player gains.

### Fixed

- Short description of the broken behaviour and what it affected.
```

- One line per entry, one fact per entry.
- No internal identifiers (no PR numbers, no commit hashes, no file paths).
- On release: rename `[Unreleased]` to `[x.y.z] — YYYY-MM-DD` and add a fresh empty `[Unreleased]` section above it.
