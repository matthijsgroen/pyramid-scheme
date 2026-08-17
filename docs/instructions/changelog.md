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

## Size: a whole feature is ONE entry

The commonest mistake, and the one to check for first. **A new mechanic, screen or puzzle family gets a
single bullet naming it — not an inventory of everything inside it.** The reader wants to know the feature
exists; they will find out how it works by using it.

**Too much** — one puzzle family logged as eight facts:

```markdown
- A light puzzle: bend the sunlight from the disc to the shrine, past stone that swallows it.
- Tap a mirror to turn it, or a sliding piece to move it.
- The beam is drawn wherever it currently goes and marked where it ends.
- A sliding piece shows a faint ghost of itself on the spots it can move to.
- Hints explain the next step in words.
- Light puzzles turn up in pyramids and tombs from the first tier, growing from 7×7 up to 9×9.
- Pieces you can tap are never placed side by side.
- Every light puzzle is built around one or two goals drawn for it.
```

**Right**:

```markdown
- A light puzzle: bend the sunlight from the disc to the shrine.
```

Everything cut there is real and worth writing down — it belongs in the commit message, the PR and the
family's design doc, which is where someone looking for it will go. The changelog is not the place it
lives.

The test: **would the player have called these separate changes?** They met one new puzzle, not eight
features. Controls, feedback, hints, difficulty range and generation are how a feature is built, not
things the player gained one by one.

This cuts the other way from "split compound changes" below, and the two are settled by the same question.
Three unrelated changes that arrived together are three entries. One feature described from three angles
is one entry.

## Length: quick bullets, not prose

A changelog is scanned, not read. **One fact per bullet, one line, roughly 20 words.** If a bullet needs
a second sentence, it is usually two bullets.

- **Split compound changes.** "The mosaic is five scenes… and each scene belongs to a difficulty… and you
  place them yourself" is three entries — three separate things the player gained. Not to be confused with
  one feature restated from several angles, which is one entry (see above).
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
