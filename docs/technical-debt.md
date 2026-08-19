# Technical Debt — Judgment Ledger

> This is a judgment ledger, not an inventory — run a fresh grep/lint for current
> counts; do not hand-maintain file lists here. What follows is the relative
> prioritization and the rulings a raw scan can't produce.

Audited against `AGENTS.md` (§8–9), `docs/instructions/architecture.md`,
`docs/instructions/testing.md`, `docs/instructions/storybook.md`, and
`docs/instructions/state-models.md`.

---

## What's load-bearing

The DDD state-model gap is the highest-signal remaining debt. Priority order and why:

**D3 `useJourneys` > D4 `useProgression` > D5 `useInventory` > D6 `TombPuzzle` annotations.**

- **D3 and D4 are the load-bearing ones.** They are the largest and most-mutated
  state modules — journey progress and the progression state machine — each with many
  distinct mutation kinds done as inline spread chains and no backing
  `src/game/*State.ts` domain module. A regression here corrupts saved player state.
- **D5 (inventory)** is a smaller Record with add/remove/batch mutations: the same class
  of violation, lower blast radius.
- **D6 (annotations)** is lowest priority — a Record but only one mutation kind. Fold it
  into the existing Tableau domain module or document it as an accepted exception.

The puzzle/trap families (Sumplete, Crocodile, Tableau) are already compliant — they wire
to their `src/game/*State.ts` modules. Detector state, wholesale-replaced values, and flat
primitives are exempt per state-models.md's "single primitive / whole-value replacement"
carve-out — not debt.

---

## Rulings a scan would misfire on

- **`src/ui/` hooks inside stories** — storybook.md explicitly allows local `useState` in
  stories, so architecture.md's "stateless `ui/`" rule does not apply to `*.stories.tsx`.
  Scans flagging these are false positives.
- **Type-only React imports in `src/game/`** (`import type { FC }` on plugin component
  fields) — a literal rule violation but no runtime dependency. Lowest severity, not urgent.
- **`src/app/` raw `className=`** — architecture.md has an explicit carve-out for
  pre-existing usage: fix-when-touched, not an action item. Do not treat a grep count here
  as a backlog.
- **Storybook coverage is complete.** The one item worth watching is
  `TombTableau.stories.tsx`'s local `fillPositions` helper — a synthetic stand-in for
  game-derived fill state, a candidate for extraction if the game ever computes a real
  position-fill ratio. Not a current violation.

---

## Design debt: two tiers owe a clock

`PUZZLE_FAMILIES.md` §3.2 caps a board at 6 minutes with a 3-minute target, and the
ladder tables predate the cap:

- **Futoshiki wizard is over it, measured** — a 7×7 with the full technique ladder is
  ~45 minutes by hand. Retune, and the dial is the grid rather than the cap (family doc
  §5 says why, and what the honest answer might be).
- **Sumplete has never been timed** — 7×7 at master and wizard is the most bookkeeping
  of any built family. Time it before authoring more of it into the world.

Balance scale and lightbeam are in budget and are the calibration to retune against.

---

## Highest-stakes test gaps

Prioritize by blast radius, not by count:

- **`src/worldGen/serializer.ts` is the top concern** — it code-gens the entire world; a
  silent bug there corrupts `generatedWorld.ts` with no visible error.
- **`src/support/`** is testing.md's strictest layer (every function, no implicit
  coverage) — untested utilities there are genuine gaps.
- Everything else (borderline registry wrappers, test-fixture factories, pure data
  modules) is lower priority. Judge against testing.md's "non-trivial logic" bar rather
  than chasing a raw file count.

---

## Resolved

The `src/data/use*Translations.ts` layer violation, the `src/game/` ↔ `formulas.ts`
dependency cycle, the `random.ts` test gap, and the D1/D2 state migrations (ComparePuzzle,
pyramid block answers) are done — git has the history.
