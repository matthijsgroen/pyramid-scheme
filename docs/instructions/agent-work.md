# Working with agents

How a Claude session spends its effort on this project. The aim is progress per token.

## The finish line

The lock work is done when every junior and expert floor has a puzzle baked in. Progress is the count of
"Placed ✓" rows in [`docs/game-design/lock-placement.md`](../game-design/lock-placement.md), Part 1. Every
session starts and ends by stating that count. Work that does not move it (new mechanics, notation polish,
refactors) waits until the designer asks for it or a placement is blocked by it.

## A session

- One goal per session, taken from `docs/handover-stonegate.md`. At the end, update the handover and start
  the next session fresh (`/clear`): a long session re-reads all of itself on every turn.
- A new idea that comes up mid-session goes into the handover or the roadmap, not into the running work,
  unless it blocks the goal.

## Plans

- A change that fits in a short brief gets a brief, not a spec and a plan.
- A plan says what to build, which files, and what the tests prove. It does not carry the code: the
  implementer writes it once.
- The world bake, the floor-by-floor proof, the carve-ledger refresh and the clean-worktree gate
  (`yarn verify`, `yarn verify-content`, `yarn build`) run once, in the plan's last task. Earlier tasks run
  their own specs, `yarn check-types` and `yarn lint`.

## Subagents

- Sonnet implements and reviews by default. Opus is for soundness: the lock walk, the carve and lay, saves.
- One review at the end of a plan. A per-task review only where a task touches soundness.
- Small mechanical edits (docs, keyword swaps, fixtures) go to one agent together.
- Every bake, verify or carve probe runs under `timeout` (e.g. `timeout 900 …`): a carve can hang for
  hours. When an agent is quiet for long, check `ps` for long-running node or vitest processes.
