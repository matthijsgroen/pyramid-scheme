# TRAP_FAMILIES.md

Status: design draft  
Companion to: `PUZZLE_FAMILIES.md` (puzzle nodes), `docs/pyramid-interior-design.md §11` (trap system design)

This document defines the **trap families** the game can serve inside trapped corridors, how each scales, and which difficulty tier each is appropriate for. Tiers are referenced as **T1–T5**, matching the tier naming in `PUZZLE_FAMILIES.md`.

---

## 1. Purpose & scope

A trapped corridor (see `docs/pyramid-interior-design.md §2`) triggers a **trap encounter** when the player moves through it. This is distinct from a puzzle node encounter in three fundamental ways:

1. **Time-gated** — the player has a fixed number of seconds to answer. No answer = fail.
2. **Fail = damage** — a wrong answer or timeout costs 1 full heart (2 half-hearts). The player must hold at least 1 full heart to attempt a trap corridor at all.
3. **Reflex, not session** — trap questions are short single-item challenges, not full puzzle sessions. Duration is measured in seconds, not minutes.

Trap families are a **first-class plugin type**, registered separately from puzzle families. A trap family plugin exposes: a question generator, a UI renderer, and difficulty knobs. The trap system picks a family from the authored knob set on the corridor and generates a fresh question each attempt.

---

## 2. Design principles

**T1 — Single-answer only.** Trap questions produce one value or one selection. No multi-step construction, no grid fills. The player must be able to answer in the time available.

**T2 — Language-agnostic by construction.** Consistent with `PUZZLE_FAMILIES.md` P2: output is taps or value selection. No typed text. Instruction text is translatable with numeric/glyph slots only.

**T3 — Fail must be unambiguous.** There is exactly one correct answer, deterministically generated. No family with multiple valid solutions may be used as a trap family.

**T4 — Themed to the hazard, not the site.** Trap type is an attribute of the corridor (authored in the site template), not of the pyramid tier. A memory trap in an expert pyramid and a memory trap in a wizard pyramid are the same *family* — the difficulty knobs differ.

**T5 — A family debuts at the bottom of its own scale.** A family first appearing at T3 enters as its simplest instance at T3. Difficulty knobs scale it upward from there.

---

## 3. Time limits

Time limits are **authored constants per tier**, not generated values. Permanent upgrades (tomb treasures) add to the base limit.

```ts
// ponytail: all trap timing lives here — tweak before playtesting
export const TRAP_TIME_LIMITS_SECONDS: Record<Tier, number> = {
  starter:  0,   // no traps at starter
  junior:   0,   // no traps at junior
  expert:  12,
  master:   9,
  wizard:   6,
};

export const TRAP_TIME_EXTENSION_PER_UPGRADE_SECONDS = 1;  // resolved: IMPLEMENTATION_PLAN Phase 12 (was 3)
```

Trap insight upgrades from tomb treasures add `TRAP_TIME_EXTENSION_PER_UPGRADE_SECONDS` to the player's effective time limit on every trap attempt, regardless of family or tier.

---

## 4. Difficulty gating

| Tier | Traps | Notes |
|---|---|---|
| Starter (T1) | None | — |
| Junior (T2) | None | — |
| Expert (T3) | 1 trap per branchy pyramid | Trap families: arithmetic reflex only |
| Master (T4) | 1–2 traps per pyramid | Adds pattern recognition |
| Wizard (T5) | 2–3 traps per pyramid | All families available |

---

## 5. The trap families

### 5.1 Arithmetic reflex — *(implement first)*

- **Thematic fit:** triggered mechanism — solve the formula to disable it.
- **Skill:** rapid mental arithmetic; multiplication table recall; basic arithmetic under pressure.
- **Operates:** a single arithmetic expression is displayed. The player selects the correct answer from a small set of options (3–4 choices). No free text entry.
- **Knobs:** `operation` (add / subtract / multiply / divide) · `operandRange` ([1–10], [1–20], [2–12]) · `distractorStrategy` (close neighbours, plausible wrong ops).
- **Scaling:** excellent — workhorse trap family. Addition at T3 entry level; mixed operations with larger ranges at T5.
- **Generation:** trivial, unique-by-construction. Generate operands within range, compute answer, generate plausible distractors.
- **UI:** low cost — expression displayed prominently, 3–4 tap targets, countdown bar.
- **Tiers:** T3–T5.
- **Status:** first implementation target.

---

### 5.2 Pattern recognition

- **Thematic fit:** deciphering an encoded sequence — the trap's mechanism follows a rule.
- **Skill:** numeric pattern completion; identifying arithmetic or geometric progressions.
- **Operates:** a short sequence of numbers (4–6 values) with the last one hidden. Player selects the missing value from options.
- **Knobs:** `sequenceType` (arithmetic / geometric / alternating / Fibonacci-like) · `length` (4–6 values) · `valueRange`.
- **Scaling:** good — arithmetic sequences are T3-accessible; geometric and mixed sequences are T4–T5 material.
- **Generation:** medium — generate sequence by rule, verify the missing value is unique, generate plausible distractors (adjacent values in the sequence, off-by-one).
- **UI:** low cost — sequence of number glyphs, tap targets below.
- **Tiers:** T4–T5.
- **Status:** planned; implement after arithmetic reflex is live.

---

### 5.3 Memory

- **Thematic fit:** the trap tests whether the explorer paid attention — hieroglyphs shown, then hidden.
- **Skill:** short-term visual memory; symbol recall.
- **Operates:** a set of hieroglyph symbols is displayed for a fixed duration (e.g. 2 seconds), then hidden. The player is asked which symbol was (or was not) in the set.
- **Knobs:** `setSize` (3–6 symbols) · `displayDuration` (in seconds, separate from the answer time limit) · `questionType` (which was shown / which was NOT shown) · `distractorPool` (how visually similar the distractors are to shown symbols).
- **Scaling:** good — small sets of distinct symbols at T4; larger sets with visually similar symbols at T5.
- **Generation:** trivial — pick symbols from the pool, randomise order, pick one as the answer target.
- **UI:** medium cost — flash display phase + answer phase require distinct UI states; countdown bar covers both phases.
- **Tiers:** T4–T5.
- **Status:** planned.

---

### 5.4 Spatial / visual (Egyptian instruments)

- **Thematic fit:** reading an Egyptian measuring instrument — scale, eye of Horus, water level.
- **Skill:** reading a visual quantity from an analog display; fraction sense; comparison.
- **Operates:** an Egyptian-themed instrument is shown at a specific reading (e.g. a balance scale slightly tipped, a water clock at a marked level, an Eye of Horus with specific parts highlighted). The player selects the value it represents.
- **Knobs:** `instrument` (balance / water clock / eye of Horus / obelisk shadow) · `precision` · `distractorProximity`.
- **Scaling:** moderate ceiling — complexity comes from precision and proximity of distractors, not from fundamentally harder reasoning. Best used sparingly at T5 for thematic variety.
- **Generation:** trivial, unique-by-construction (reuses generation logic from the corresponding puzzle families where they exist).
- **UI:** high cost — each instrument variant requires its own renderer; can share assets with the puzzle family implementations (§4.3, §4.4, §4.6 of `PUZZLE_FAMILIES.md`).
- **Tiers:** T5.
- **Status:** planned; UI cost means implement last. Reuse puzzle family renderers where possible.

---

## 6. Interaction with permanent upgrades

Tomb treasures grant permanent effects that directly modify trap encounters. Exact values are authored constants — see `docs/pyramid-interior-design.md §1` for categories.

| Upgrade | Effect on traps |
|---|---|
| Max health +½ ♥ | More total health to risk on trap attempts (6 upgrades available; max 6 hearts) |
| Armor | Reduces trap damage by 1 half-heart per stack; 2 stacks available; minimum damage is 1 half-heart (cannot negate entirely) |
| Trap insight | Adds `TRAP_TIME_EXTENSION_PER_UPGRADE_SECONDS` (1s) per stack; 2 stacks available (+2s total max) |
| Compass / Detection / Scribe's Eye | No direct effect on traps |

---

## 7. Open questions

1. ~~**Armor negation floor**~~ — **Resolved.** Minimum damage is 1 half-heart; armor cannot fully negate. 2 stacks max.
2. **Memory display duration** — the `displayDuration` in §5.3 is a second timer before the answer timer starts. Does it count against the tier time limit, or is the tier time limit only for the answer phase? Recommendation: keep timers separate — display phase is fixed, answer phase is the authored time limit.
3. **Multiple trap insight stacks** — if the player holds 3 trap insight treasures, do all three add time? Recommendation: yes, they stack additively.
4. **Trap tool interaction** — a trap tool permanently disables a specific corridor's trap; the corridor becomes freely traversable. No interaction with trap families needed — the tool bypasses the encounter entirely before a family is invoked.
