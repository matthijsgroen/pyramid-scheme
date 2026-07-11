# Design-Doc Fidelity

## The core rule

**When a design doc exists for what you're building, the implementation must match its stated mechanism, not just its outcome.** An implementation that produces the right output through a different mechanism than the doc describes is not "done" — it's an undisclosed divergence, not a completed feature.

---

## Trace before building, not after

Before writing code against a design doc (`docs/game-design/*.md`), walk the doc's own stated algorithm step by step and map the planned implementation onto it. Any step where the plan deviates — reusing an old heuristic, skipping a case, simplifying for a first slice — is a decision for the user to make, not one to make silently and let them discover later by reading the code.

This applies doubly when executing a delegated or summarized task description: if that description itself contains a simplification ("reproduce the old system's behavior" is a common shape), verify it against the design doc before treating it as settled. A shortcut embedded in your own instructions is still a shortcut — it needs the same scrutiny as one invented mid-implementation.

---

## Doc-fidelity is its own review dimension

The standard review split (correctness / architecture-layering / simplicity-DRY) does not check whether an implementation matches an existing design doc — a wrong-mechanism implementation can pass all three and still diverge from what was agreed. When a design doc exists for the thing under review, add a fourth pass: does this match the doc's own stated algorithm, not just produce a correct-looking result?

---

## Escalate on the second occurrence

If the same kind of architectural gap gets fixed twice — same underlying concept, different file (e.g. "mod-owned logic living in core" showing up once as a priority value, again as a currency's placement rule) — stop before fixing a third instance. Name the pattern explicitly and ask whether there's a shared root cause to address, instead of continuing to patch individual instances one at a time.

---

## State completeness in the same breath as the fix

When reporting a fix as done, state explicitly what it does *not* yet fix or wire — in the same message, not as a separate discovery later. "This makes the structure correct" and "this makes the underlying mechanism correct" are different claims; don't let the first stand in for the second.
