# Testing Guidelines

## The core rule

**A feature is not done until its behavior has tests.** Tests ship in the same commit as the code — they are not follow-up tasks.

---

## What counts as "behavior"

Behavior is anything with a decision in it: a conditional, a state transition, a computed result, a structural invariant. Things that don't count: prop-forwarding wrappers, pure JSX with no branching, static data with no helper functions.

When in doubt: if a bug in this code could go unnoticed by the type checker and by Storybook, it needs a test.

---

## Test toolkit

- **Vitest** — all unit and integration tests
- **`@testing-library/react`** — `render` and `renderHook` for React code; preferred over pure function extraction when testing hooks, because it runs closer to real execution
- **Storybook** — visual verification only (how a component looks); not a substitute for behavior tests

---

## Layer-by-layer rules

### `src/worldGen/` — highest bar

Every exported function with non-trivial logic needs a test. This is the highest-stakes layer: a silent bug here breaks the entire generated world without a visible error.

### `src/game/` and `src/data/`

Every exported function with non-trivial logic needs a test.

For `src/data/` files specifically, also assert **structural invariants** on the data: cross-references hold, generation doesn't throw, required fields are present. See `inventory.spec.ts` and `journeys.spec.ts` for examples.

### `src/support/`

Every function — including small utilities — needs its own unit test. Implicit coverage by callers is not sufficient.

### `src/app/state/` hooks

Test non-trivial hook behavior via `renderHook` (or by testing an extracted pure factory, if one already exists — e.g. `createJourneysV3Api`). Cover state transitions, guards, and derived values.

### `src/app/` logic files (`*Logic.ts`, `*Calc.ts`, and any other exported non-trivial function)

Every exported non-trivial function needs a test, regardless of filename.

### `src/app/` screens

Screens do **not** need dedicated tests unless they contain non-trivial local logic (e.g. a multi-step state machine, a flow with guards). The individual hooks and logic functions they compose are tested separately.

### `src/ui/` components

- **Storybook** covers visual appearance — required for all components (see `docs/instructions/storybook.md`)
- **Render tests** are required for any component with branching logic: conditional rendering, state changes on interaction, computed output from props

A component that just renders its props needs no render test. A component that hides itself when a count is zero, or shows different UI based on a flag, does.

---

## Never assert a wall-clock duration

**Count whether the expensive work ran; do not time it.** A machine cannot answer "was this cheap" — a
shared CI runner in jsdom least of all — so a millisecond bound is a lottery whose stakes are a red build,
and it passes for the wrong reason on a fast machine.

The invariant is almost always "did this work happen at all", which is exact:

```ts
// ✗ — a lottery. This exact bound failed CI at 83ms.
const started = performance.now()
act(() => cell.click())
expect(performance.now() - started).toBeLessThan(80)

// ✓ — mock the expensive function around the real one and count the calls
vi.mock("./eclipseHint", async importOriginal => {
  const actual = await importOriginal<typeof import("./eclipseHint")>()
  return { ...actual, buildEclipseHint: vi.fn(actual.buildEclipseHint) }
})
// ...
act(() => cell.click())
expect(vi.mocked(buildEclipseHint)).not.toHaveBeenCalled()
act(() => hintButton.click())
expect(vi.mocked(buildEclipseHint)).toHaveBeenCalled()
```

Keep the measurement that made the code lazy — lightbeam's "185ms a tap eagerly against 19ms lazily" — as a
**comment**. It is why the code has its shape; it is not an assertion.

---

## File placement

Spec files live **next to the source file**, in the same directory. No `__tests__/` directories.

```
src/game/siteAssembler.ts
src/game/siteAssembler.spec.ts   ✓

src/game/__tests__/siteAssembler.spec.ts   ✗
```

---

## `.verify.ts` — sweeps too expensive to be tests

A `.verify.ts` file is a vitest file `yarn test` never runs; `yarn verify-content` does.

**The bar is WHAT THE CHECK NEEDS TO GET HOLD OF, not how long it takes.** A claim about a board — its
answer solves it, its route is unique, it is not solved by following the light — needs only a board, and a
stored one serves as well as a fresh one: that stays a test and runs in milliseconds, reading its board
from the family's `boards.fixture.json` (`yarn generate-boards`). A claim about a GENERATOR, a seed list
or the world spec has to run the thing that searches, and a search has no runtime worth asserting: eight
such files racing for the same cores is what made the build red or green according to machine load.

**`verify-content` is the pass you make AFTER AUTHORING** — after changing a generator, a seed list or the
world spec. It is deliberately not a CI job: a generator is worth re-checking when somebody changes one,
not on every pull request.

Today that is every family's `generate*.verify.ts`, `lightbeamConfig.verify.ts`, `puzzleSeeds.verify.ts`
and `src/app/SiteMap/worldBoards.verify.ts`. A fixture-backed spec pairs with a `.verify.ts` that rebuilds
the fixture and compares it with `toStrictEqual` — without that the split is a lie, since a stored board
that has drifted lets the whole spec pass while every board the game deals is broken.

---

## Test description style

Descriptions must state the **observable behavior** and the **invariant behind it** — not the implementation.

```ts
// ✓ — states what happens and why it matters
it("preserves exploredSections so exploration is intact on revisit", ...)
it("blocked at 1 half-heart — floor that must be preserved", ...)
it("deduplicates: calling twice does not double-store", ...)

// ✗ — describes implementation, not behavior
it("sets position to null", ...)
it("returns false", ...)
it("calls setState", ...)
```

The description should be a sentence a non-author can read and understand what contract is being protected.
