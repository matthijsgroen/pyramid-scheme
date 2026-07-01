# Documentation Placement

## Root files

Only files that tooling, platforms, or agent conventions require at the root:

| File | Purpose |
|---|---|
| `README.md` | Project overview for humans and GitHub |
| `CLAUDE.md` | Single pointer: tells Claude to read `agents.md`. No substantive content here. |
| `agents.md` | Authoritative agent guide — architecture, conventions, workflows, key files, instruction pointers |
| `IMPLEMENTATION_PLAN.md` | Active build roadmap. Lives at root because it is the current work item, not archived reference. |

Everything else goes in `docs/`.

---

## docs/game-design/ — game design documents

Stable documents describing how a mechanic works, why it was designed that way, and what decisions were made. These survive feature completion and remain useful as long as the mechanic exists.

**Belongs here:**
- Mechanic design: rules, data model, edge cases, design decisions
- System overviews: how two subsystems interact, what invariants they maintain
- Resolved Q&A or decision logs that future contributors need to understand the design

**Does not belong here:**
- Build instructions or agent guidelines → `docs/instructions/`
- UX research or flow analysis → `docs/ux/`
- Transient handover briefs → see below

---

## docs/instructions/ — agent and contributor guidelines

Process documents that tell contributors (human or AI) *how* to work in a specific area. Applied when working in that area, not read as reference.

Each file covers one topic. The entry point for all instruction files is the table in `agents.md` under "Agent Instructions" — every instruction file must be registered there with a "when to apply" note.

**Belongs here:**
- Layer boundary rules (what goes in which folder)
- Storybook guidelines (what belongs in a story vs core)
- Coding conventions that need more space than agents.md allows

**Does not belong here:**
- Feature design or mechanic descriptions → `docs/`
- UX analysis → `docs/ux/`

---

## docs/ux/ — UX research and analysis

Flow maps, friction reviews, onboarding findings. These describe the *current observed state* of the UX, not design decisions. They feed into design docs and the implementation plan, then go stale.

**Belongs here:**
- Flow maps of current screens
- Friction findings from playtesting or review
- Onboarding analysis

---

## Handover documents

Transient briefs for the next agent or session — what to build, what's already done, what decisions are resolved. Named `handover-<topic>.md` and placed in `docs/`.

**Lifecycle:** create when handing off mid-feature; delete in the completion commit. The permanent record is the design doc and git history.

---

## Summary

| What you have | Where it goes |
|---|---|
| Mechanic design, system decisions | `docs/game-design/<topic>.md` |
| "How to work in area X" guidelines | `docs/instructions/<topic>.md` |
| UX flow maps, friction findings | `docs/ux/<topic>.md` |
| Transient handover brief | `docs/handover-<topic>.md` (delete on completion) |
| Active build roadmap | `IMPLEMENTATION_PLAN.md` (root) |
| Agent entry point | `CLAUDE.md` (root, pointer only) |
| Full agent guide | `agents.md` (root) |
