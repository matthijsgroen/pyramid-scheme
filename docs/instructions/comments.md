# Comments

## Function-level: describe role, not mechanism

A function/component worth commenting gets one comment describing its **role in the system** — what it's responsible for, why it exists, what depends on it. Not how it works internally; that's deducible from reading the body. Not what it replaced or used to be; that's git blame's job and the PR description's job.

```ts
// Bad — narrates the how, restates what the code already shows
// Loops over cells and checks if roomType is gate, then checks requiredKeyId...
const findGates = (grid: FloorGrid) => { ... }

// Bad — historical, rots as the codebase moves further from this point
// Replaces the old trapRegistry.ts + puzzleRegistry.ts split
const registerFamily = (plugin: FamilyPlugin) => { ... }

// Good — states the role
// The one seam every encounter dispatch goes through — resolves a room's family id
// to its registered plugin so core never special-cases which mechanic a room is.
const getFamilyPlugin = (id: string) => { ... }
```

## Inline: only for non-obvious WHY

Beyond the function-level role comment, only add an inline comment when the WHY is genuinely non-obvious — a hidden constraint, a subtle invariant, a workaround for a specific bug, behavior that would surprise a reader. If removing the comment wouldn't confuse a future reader, don't write it.

## Never

- What the code used to do, what it replaced, or why a change was made — belongs in the commit message and PR description, not the source.
- A restatement of what the next line does in English.
- Narration of the current task, fix, or caller ("used by X", "added for the Y flow") — rots as the codebase evolves past that context.
