# Commit Messages

Apply this instruction whenever you write a commit message or a PR description.

## The default is a subject line and nothing else

```
fix: every room gets a puzzle no other room has
```

Most commits need no body. The diff shows what changed; the subject says which change it is.

## Subject line

`type: what changed`, imperative, lower case, **≤ 72 characters**. Types: `feat`, `fix`, `docs`,
`refactor`, `test`, `chore`. One line. No trailing period.

## Body: only for a WHY the diff cannot show

Add a body only when a reader of the diff would ask "why?" and find no answer in it — a
constraint that forced the approach, a non-obvious trade-off, a rejected alternative that
looks better than it is.

**Then keep it to three sentences, ~60 words, one paragraph.** If it needs more, the
explanation is durable and belongs in the design doc, where the next reader will actually
look. Write it there and let the commit say `see docs/game-design/x.md`.

## Never in a commit message

- **The story of the work.** What you tried first, what the measurement found, what the
  earlier draft did, which review round changed it. Nobody reads a commit to learn how it
  was written.
- **A restatement of the diff.** Bullet lists of files, functions, or renamed symbols.
- **Numbers the code already carries.** Durations, thresholds, sizes — they are in the
  source, and here they go stale.
- **The changelog entry, the design-doc section, or the code comment**, repeated. Say a
  thing in exactly one place.
- **Rhetoric.** No "Three changes, all the same lesson", no "That is why", no scene-setting.

## Why this rule exists

Commit messages in this repo have reached **11,000 words** — longer than most of the design
docs they describe. They grew because the other instructions push prose out of their own files
and used to name the commit message as the destination ([`comments.md`](comments.md),
[`changelog.md`](changelog.md)). "Not here" is not "there": a rationale worth keeping goes in a
design doc, and a rationale not worth keeping goes nowhere.

## PR descriptions

Same budget, one level up: a sentence on what changed and why, and a link to the design doc
for anything longer. A PR that squash-merges inherits its description as the commit message,
and a PR merged with its commits keeps every one of their bodies — so a long PR body and six
long commit bodies land in the history together.

## The test before committing

> Would a developer six months from now, reading `git log`, be worse off without this
> sentence?

If no, cut it. Cut the whole body if that empties it.
