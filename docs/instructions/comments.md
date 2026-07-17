# Comments

## Function-level: describe role, not mechanism

A function/component worth commenting gets one short comment describing its **role in the system** — what it's responsible for, why it exists. Not how it works internally (deducible from the body). Not what it replaced or used to be (git blame's job, PR description's job).

```ts
// Bad — narrates the how, restates what the code already shows
// Loops over cells and checks if roomType is gate, then checks requiredKeyId...
const findGates = (grid: FloorGrid) => { ... }

// Bad — historical, rots as the codebase moves further from this point
// Replaces the old trapRegistry.ts + puzzleRegistry.ts split
const registerFamily = (plugin: FamilyPlugin) => { ... }

// Good — one line, states the role
// Resolves a room's family id to its registered plugin.
const getFamilyPlugin = (id: string) => { ... }
```

## Short and to the point

One line beats three. If a comment needs a paragraph, the code is probably the wrong place for that explanation — trim to the one sentence that matters, or move the rest to the PR description.

## Inline: only for non-obvious WHY

Beyond the function-level role comment, only add an inline comment when the WHY is genuinely non-obvious — a hidden constraint, a subtle invariant, a workaround for a specific bug. If removing the comment wouldn't confuse a future reader, don't write it.

## Never

- What the code used to do, what it replaced, or why a change was made — belongs in the commit message and PR description.
- A restatement of what the next line does in English.
- Narration of the current task, fix, or caller ("used by X", "added for the Y flow").
- Multi-sentence comments where one clause would do.
