# Documentation Placement

## Root files

Only files that tooling, platforms, or agent conventions require at the root:

| File        | Purpose                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------- |
| `README.md` | Project overview for humans and GitHub                                                            |
| `CLAUDE.md` | Single pointer: tells Claude to read `AGENTS.md`. No substantive content here.                    |
| `AGENTS.md` | Authoritative agent guide — architecture, conventions, workflows, key files, instruction pointers |

Everything else goes in `docs/`.

---

## What goes in a doc

Do not hand-maintain file lists, path tables, or violation counts in Markdown — code and git are the source of truth; generate such lists on demand. Docs hold intent, rules, rationale, and decisions only.

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

Process documents that tell contributors (human or AI) _how_ to work in a specific area. Applied when working in that area, not read as reference.

Each file covers one topic. The entry point for all instruction files is the table in `AGENTS.md` under "Agent Instructions" — every instruction file must be registered there with a "when to apply" note.

**Belongs here:**

- Layer boundary rules (what goes in which folder)
- Storybook guidelines (what belongs in a story vs core)
- Coding conventions that need more space than AGENTS.md allows

**Does not belong here:**

- Feature design or mechanic descriptions → `docs/`
- UX analysis → `docs/ux/`

---

## docs/ux/ — UX research and analysis

Flow maps, friction reviews, onboarding findings. These describe the _current observed state_ of the UX, not design decisions. They feed into design docs and the implementation plan, then go stale.

**Belongs here:**

- Flow maps of current screens
- Friction findings from playtesting or review
- Onboarding analysis

---

## Handover documents

Transient briefs for the next agent or session — what to build, what's already done, what decisions are resolved. Named `handover-<topic>.md` and placed in `docs/`.

**Lifecycle:** create when handing off mid-feature; delete in the completion commit. The permanent record is the design doc and git history.

---

## Implementation plan documents

A mechanic's _design_ and its _build plan_ are two different documents with two different lifecycles — never conflate them in one file.

- **Design doc** (`docs/game-design/<topic>.md`) — durable, survives the mechanic's full lifetime. Holds intent, rules, data model, decisions: how it works and why.
- **Implementation plan** (`docs/<topic>-implementation-plan.md`) — transient, scoped to getting the mechanic built. Holds phase breakdown, done-vs-pending status, rollout-specific dated decisions, PR/branch references.

**Lifecycle: delete the implementation plan once the mechanic ships.** Before deleting, extract anything durable (a fact about how the mechanic actually works) into the design doc — don't let it disappear with the plan. Everything else (phase status, "locked as of DATE" notes, bug-fixes-in-passing) belongs nowhere once the mechanic is live; git history and the PR description already own that. A design doc that still reads like a build plan (phase numbers, stacked-PR references, "not yet playtested") is a sign the split didn't happen — fix it there, don't let the mixed doc stand as the permanent record.

### The split, as a checklist

This applies to **every design doc, wherever it lives** (`docs/game-design/`, `docs/mods/`, …) — not only files named `*-implementation-plan.md`, and when **editing** a doc, not just creating one. A design doc says how a mechanic works and why. **Status lives elsewhere:**

- **The PR description** — the net change this branch delivers.
- **git history** — what changed when, in which commit.

The repo keeps no standing status tracker: the remaining implementation plan lives outside the
codebase, so nothing in here has to be kept true as work lands.

**Smell test — a design doc must contain NONE of these** (each belongs in the tracker/PR/git):

- phase / stage / slice numbers used as progress; `[x]` / `[ ]` / `[~]` checkboxes
- "DONE / landed / as-built / shipped / not yet built / byte-identical"
- dated progress notes ("locked as of DATE", "updated DATE with X", "Progress log")
- commit SHAs, PR numbers, or branch references
- a per-phase build plan, kickoff prompt, or handover section

Find one while editing? Move it to the tracker and delete it from the doc — never add another.

---

## Length: a rejected alternative gets one line

A design doc grows by recording the search that produced the design. That is the single biggest
source of length, and it is the least useful part of the file: a reader wants what the thing is and
why it is that way, not which draft it was in last week.

**A rejected alternative earns one line — the idea, and the fact that kills it.** It exists so
nobody rebuilds it, which needs a claim and a reason, not the investigation behind them. Collect
them under one heading rather than giving each its own section.

> - **Four 45° rotation states** — identical reach to retraction at **232×** the enumeration. The
>   two extra angles reverse the beam back through ground it has already crossed.

**If it needs a section, it is not rejected — it is deferred**, and what belongs in the doc is the
same one line plus what it is waiting on.

**Headings named "What X found" are session notes.** The finding belongs in the section it changes,
written as a property of what exists. If a finding changed nothing that ships, it is a rejected
alternative — one line.

**A superseded claim is deleted, not struck through and corrected in place.** A doc that carries
its own corrections has to be read forwards to be understood, so the reader meets the wrong answer
first. Fix the original sentence.

Two things that look like history and are not, so keep them: a **measurement** of what the shipped
thing does (state it in the present, and drop the before-and-after column), and a **pitfall** that
has been walked into (state it as a hazard, not as an incident report).

---

## Summary

| What you have                      | Where it goes                                                                            |
| ---------------------------------- | ---------------------------------------------------------------------------------------- |
| Mechanic design, system decisions  | `docs/game-design/<topic>.md`                                                            |
| Phased build plan for a mechanic   | `docs/<topic>-implementation-plan.md` (delete once shipped, extract durable facts first) |
| "How to work in area X" guidelines | `docs/instructions/<topic>.md`                                                           |
| UX flow maps, friction findings    | `docs/ux/<topic>.md`                                                                     |
| Transient handover brief           | `docs/handover-<topic>.md` (delete on completion)                                        |
| Durable design decisions & backlog | `docs/game-design/design-decisions.md`                                                   |
| Agent entry point                  | `CLAUDE.md` (root, pointer only)                                                         |
| Full agent guide                   | `AGENTS.md` (root)                                                                       |
