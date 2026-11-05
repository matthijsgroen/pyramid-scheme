# Engine and content

Four kinds of rule live in this project. Each has one owner and one place it is enforced.

| Kind                    | What it is                                 | Owner    | Enforced by                                       |
| ----------------------- | ------------------------------------------ | -------- | ------------------------------------------------- |
| Engine                  | What the engine guarantees for any content | Engine   | Bake judges, sweeps, unit tests (made-up content) |
| Engine design thinking  | How the engine is built                    | Engine   | Review, betterer guards                           |
| Content                 | What the designer makes                    | Designer | `yarn lock`, the lock, room and web editors       |
| Content design thinking | What good content looks like               | Designer | The editors' checks, warnings to the author       |

## Engine

The engine places any valid content, and honours what it says exactly; it never judges the quality of a room, a
puzzle or a lock. A lock is valid when every region is walkable and its way leads from `in` to `out`: three regions
joined by plain corridors, with no gate and no lever, is a valid lock.

- A lock's topology is carved as written: its regions, doors, and where each control stands.
- Every floor carves, and every lock floor can be finished (the lock walk).
- Turning a mod off carves the same floor; authoring an encounter changes no structure.
- A seed carves the same floor every time; the starter freeze holds.

## Engine design thinking

- One rule everywhere: no exception per tier, per lock or per case. A case is protected by a guard, not a carve-out.
- The core knows no mod; mechanics are core, their realisations are mods.
- Guards ratchet per file; tests count work, never wall-clock.
- New visual work starts with a spike and a picture.

## Content

Locks (`.lock`), designed rooms (`.room`), the floor and world DSL, puzzles, story and art.

## Content design thinking

- A lesson shows its problem first: the shut door is seen before its control.
- Each mechanic is taught alone before it is combined.
- A room serves one purpose.
- A starter board still asks the player to deduce.
- Wizard is the top difficulty, never magic.

## Between the layers

- **The engine never enforces content design thinking.** A carve that keeps the topology is right, even where the
  content idea behind it does not show.
- Content design thinking is written into content: a lock's topology, a DSL knob, a room file.
- Checking it is content tooling for the author: `yarn lock` and the lock, room and web editors carry quality
  criteria of their own, stricter than the engine's. Never a bake refusal.
- Where content cannot express a wish, the engine gains a generic word for content to use, never a judgement of its
  own. A badly designed lock is fixed in the lock.
