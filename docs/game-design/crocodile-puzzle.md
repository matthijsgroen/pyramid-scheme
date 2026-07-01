# Crocodile Puzzle

The crocodile puzzle is the lock mechanic guarding Treasure Tombs. It is themed around **Sobek**, the Egyptian crocodile god of the Nile.

## Player Experience

1. **Comparison phase** — The player is shown a series of pairs of math formulas and must tap the one with the **largest result** for the crocodile to eat. The crocodile faces the chosen side and snaps its mouth shut to confirm each answer.
2. **Lock phase** — After all comparisons are resolved, the player is asked: *"What digit did the crocodile always/never eat?"* They must identify a single digit (0–9) that consistently appeared (or never appeared) in the results the crocodile chose.
3. **Reward** — A correct digit opens the chest and awards a random uncollected treasure from that tomb's loot table.

If the player doesn't remember, an "I don't know" button resets the comparison phase so they can replay it with fresh attention.

## Puzzle Generation

Each run through a tomb generates a deterministic puzzle from `levelSeed = randomSeed + runNumber * 3210`.

`generateCompareLevel` (`src/game/generateCompareLevel.ts`) produces a `CompareLevel`:

```ts
type Requirements = {
  digit: number      // 0–9, randomly chosen
  largest: "always" | "never"
}

type CompareLevel = {
  requirements: Requirements
  comparisons: { left: Formula; right: Formula }[]
}
```

For each comparison, `createCompare` regenerates formula pairs until the constraint is satisfied:
- `largest: "always"` — the digit appears in the **larger** result but not the smaller
- `largest: "never"` — the digit appears in the **smaller** result but not the larger

The number of comparisons is set by `journey.levelSettings.compareAmount`. If generation exceeds 50 iterations, `numberOfSymbols` is incrementally increased to make the constraint easier to satisfy. Failure after 200 iterations throws.

## Validation

On lock submission (`handleLockSubmit` in `useComparePuzzleControls.ts`), the entered digit is compared against `levelData.requirements.digit`. A mismatch resets both the lock state and all comparison answers so the player must redo the full puzzle.

## Loot Selection

The treasure awarded is selected deterministically from `randomSeed + 12345` at the start of the hook — before the puzzle is shown. Only treasures not already in the player's inventory are eligible.

## Key Files

| File | Purpose |
|------|---------|
| `src/app/TombLevel/ComparePuzzle.tsx` | UI: comparison cards, crocodile animation, lock input |
| `src/app/TombLevel/useComparePuzzleControls.ts` | All puzzle state, answer handling, lock validation, loot award |
| `src/game/generateCompareLevel.ts` | Deterministic level generation from seed + requirements |
| `src/assets/crocodile-250.png` | Crocodile with open mouth |
| `src/assets/crocodile-closed-250.png` | Crocodile with closed mouth (after eating) |
| `public/locales/en/common.json` | UI strings under `tomb.crocodile*` |

## Journey Configuration

The following fields on a `TreasureTombJourney.levelSettings` control puzzle difficulty:

| Field | Effect |
|-------|--------|
| `compareAmount` | Number of comparison pairs shown |
| `numberRange` | Min/max values used in formula numbers |
| `operators` | Operators used by the pyramid tableau formula generator for this tomb |
| `compareOperators` | Operators used in the crocodile comparison formulas — overrides `operators` when set |
| `maxMultiplyOperandResult` | Maximum value either operand of a `*` may evaluate to; prevents unmanageable products |

`operators` and `compareOperators` are intentionally separate because the pyramid tableau generator and the compare puzzle have different complexity needs. For example, the master and wizard tombs include `/` in `operators` so their tableau formulas can be generated, but set `compareOperators: ["+", "-", "*"]` to keep the mental arithmetic in the comparison phase tractable.

### Current settings per tier

| Tomb | `compareOperators` | `maxMultiplyOperandResult` | `compareAmount` | `numberRange` |
|------|--------------------|---------------------------|-----------------|---------------|
| Starter | `["+"]` | — | 0 (no puzzle) | 1–5 |
| Junior | `["+", "-"]` | — | 2 | 1–10 |
| Expert | `["+", "-", "*"]` | 5 | 3 | 1–10 |
| Master | `["+", "-", "*"]` | 10 | 4 | 1–10 |
| Wizard | `["+", "-", "*"]` | 12 | 5 | 1–15 |

Division is excluded from all compare puzzles. The `maxMultiplyOperandResult` limits ensure that multiplication stays mentally manageable for the target age group (8–11): Expert keeps both sides of `*` ≤ 5 (e.g. `(2+3) * 4`), Master ≤ 10, and Wizard ≤ 12.

A matching tableau entry (keyed by `tombJourneyId` + `runNumber` in `src/data/tableaus.ts`) can override `symbolCount` to control how many numbers appear per formula side.
