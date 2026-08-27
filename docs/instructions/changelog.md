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

## `[Unreleased]` is a draft you EDIT, not a log you append to

The rule that was missing, and the one that let a release grow to twenty-nine bullets about
one puzzle family. Every rule below is about a single entry; this one is about the section.

**Before adding a bullet, read the section.** If a bullet already covers the thing you are
changing, **rewrite that bullet** so it is true of the new state. Do not add a second one.

Nine pull requests tuning one feature leave **one** entry, not nine — and if the seventh
undoes what the third did, the section must not still be carrying both:

**What went wrong** — the same change, logged four times as it was worked out:

```markdown
- Light puzzles get harder sooner. The first two difficulties used to be solved by following the light…
- The first two light puzzles are real puzzles now. Every difficulty puts a piece where the beam never goes…
- Light puzzles ask for real reasoning now. Every board used to be solved by tapping every piece once…
- The second light difficulty has a longer route, and the third a wider board…
```

**What ships**:

```markdown
- Every light puzzle is new, and every difficulty asks for real reasoning: tapping each piece in turn no longer solves one.
```

The reason is the reader: **a player upgrading from the last release never saw the states in
between.** They do not experience "harder, then harder again, then rebalanced" — they open the
new version and find one game. Intermediate states are the feature being written, and the
record of how it was written is the git history, which is already keeping it.

Two consequences:

- **Tuning unreleased work does not earn an entry.** A difficulty retuned twice before it
  ships is one entry describing where it landed. Same rule as the bug-fix one above, for the
  same reason: it was never experienced.
- **A superseded entry is deleted, not left standing.** If a later change makes an entry
  false or half-true, fix the entry. A changelog with a stale line in it is worse than a
  short one.

### Size budget: a release is a screen, not a scroll

A player reads a release note to answer "what is new?" in about thirty seconds.

- **Aim for ten bullets or fewer.** Fifteen is the smell of a log rather than a summary.
- **No feature owns more than about three.** Past that it is an inventory (see below).
- The version that prompted this rule condensed **29 bullets to 11** with nothing the player
  cares about lost — a fair guide to how much of a bloated section is restatement.

### The readthrough before release

`yarn release` is not the moment to discover the section is a log. **Before cutting a release,
read `[Unreleased]` start to finish and ask: if I were writing this from scratch today,
knowing only where the game landed, would I write these bullets?** Rewrite what fails, and
delete the entries that describe the road rather than the destination. It is a five-minute
pass and it is the difference between a release note and a diff.

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

Everything cut there is real and worth writing down — it belongs in the family's design doc, which is
where someone looking for it will go. The changelog is not the place it lives, and neither is a
commit-message body; see [`commit-messages.md`](commit-messages.md).

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
  hood belong in the design doc — never here, and not in a commit-message body either.
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
