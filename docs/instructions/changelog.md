# Changelog Maintenance

Apply this instruction whenever you add, change, or remove anything a player would notice.

## File location

`CHANGELOG.md` at the repo root, [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

## What belongs in `[Unreleased]`

Log an entry when the change is **visible to the player**:

| Category | Examples |
|---|---|
| **Added** | New screen, new mechanic, new item, new reward type |
| **Changed** | Altered UI text, reworked flow, rebalanced drop rates |
| **Removed** | Feature or content removed from the game |
| **Fixed** | Bug that was present in a previous release (see below) |
| **Deprecated** | Feature that will be removed in a future release |

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

## Format reminder

```markdown
## [Unreleased]

### Added
- Short present-tense sentence describing what the player gains.

### Fixed
- Short description of the broken behaviour and what it affected.
```

- One sentence per entry. Start with a verb ("Add", "Fix", "Remove").
- No internal identifiers (no PR numbers, no commit hashes, no file paths).
- On release: rename `[Unreleased]` to `[x.y.z] — YYYY-MM-DD` and add a fresh empty `[Unreleased]` section above it.
