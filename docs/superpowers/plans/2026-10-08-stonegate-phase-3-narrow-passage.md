# stoneGate Phase 3: The Narrow Passage — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a gate that only empty hands open is drawn as a wall with a crack in one corridor cell, the explorer
squeezes through it by a prompt ("Go through the crack"), a carrying walk stops beside it with the one blocked line,
and the walk, the solver and play agree everywhere a stone meets a passage or a zipline.

**Architecture:** the gate stays core's (a gate the stones' record opens in every arrangement without `+ hand`); a
new realisation registry beside the one-way's dresses it. A lock compiles a gate whose only owner is `unladen`
into an edge gate carrying `passage: <realisation id>`; after the carve the assembler stamps that gate's door cell
with `RoomCell.passage`, which play reads: the door is never ground (`openWaysOut` leaves it), a tap on it walks the
explorer to the side he can reach and offers the crossing, and the crossing is a two-leg squeeze through the wall's
cell drawn with the `explorer-squeeze-*` frames. A one-way may carry empty hands too (`-[unladen]- >>`): the gate
folds into the drop (`OneWayObstacle.unladen`), the walk takes such a drop only with empty hands, and a stone floor
binding a both-hands realisation (the zipline) to a drop its lock lets a stone ride is refused.

**Tech Stack:** TypeScript, React 19, Vitest + Testing Library, Storybook (`@storybook/react-vite`), i18next.

**Spec:** `docs/superpowers/specs/2026-10-04-stones-acceptance.md` (§3 Carve and bake: the `unladen` passage binds
to a realisation, a zipline or narrow passage where a stone could pass is refused; §4 Play: a carrying walk stops on
the near side and says why). **Roadmap:** `docs/superpowers/plans/2026-10-06-stonegate-roadmap.md` (phase 3 row,
"Open per phase" Phase 3 bullet, "Open after phase 2"). **Art:** phase 5 plan task 5
(`docs/superpowers/plans/2026-10-06-stonegate-phase-5-art.md`).

**Written against `6dc4a7a9`** (branch `topology/mechanics`, phases 1 and 2 done and pushed). Every path, symbol and
signature cited below was checked at that commit. The two untracked files at the repository root
(`circle.lock`, `stoneGate.lock`) are the designer's scratch: never stage them. Other agents may commit art files
on this branch while the plan runs: stage strictly by path, never `git add -A` or `git add .`.

## Rulings made without the designer

The designer reviews these in the morning. Each is applied by the tasks below as written.

- **Ruling: the carry gap is closed by the lock, not by a new walk rule keyed on the realisation. A one-way can
  carry empty hands (`out -[unladen]- >> in` compiles: the gate folds into the drop as `OneWayObstacle.unladen`,
  and the walk, both the tool's and the engine's, takes such a drop only with empty hands); a floor whose locks hold
  stones and that binds a one-way realisation declaring `handsFull` to a drop the lock lets a stone ride is refused
  (`oneWayRealisationRefused`, `why: "stonePasses"`).** — Why: this is the spec's own model (§3: "binding a zipline
  … where the lock lets a stone through (no `unladen` on that passage) is refused"; the lock notation already says
  `in -[unladen]- hall  only with empty hands: a zipline, a narrow passage`), it keeps masonsRamp's chute (a stone
  rides it) legal, and a walk rule that read `handsFull` would make the carve depend on a mod's declaration, so
  turning the topology mod off could move walls. — Cost if wrong: if the designer wants every zipline to refuse a
  stone with nothing written in the lock, the tool walk cannot know it (it never sees a binding); the change would be
  a refusal that turns every stone floor's zipline into "write `-[unladen]-`", one line in `siteAssembler.ts`.
- **Ruling: the narrow passage realises a gate whose only owner is `unladen`, standing alone on its connection.
  `-[p+unladen]-`, `-[p|unladen]-` and a region gate naming `unladen` stay what they are today (a door, shut while
  carrying, its face showing the hands where it has one).** — Why: only there is the gate open exactly while the hands
  are empty, which is what a wall with a crack means; under `any` a stone can pass, which a crack must not allow.
  — Cost if wrong: a designer who wants `-[p+unladen]-` drawn as a crack gets a door; widening `isUnladenGate` and the
  passage's open test is a small change.
- **Ruling: the binding key is `unladen` and the realisation id is `narrowPassage` (topology mod), resolved through a
  new registry (`PassageRealisationMeta`, `resolvePassageRealisation`) beside the one-way's; `unladen` is a core kind
  with no control (`effectOnly`, like `one-way`), so a lock with a passage and no `unladen` in its binding is refused
  `unboundRole`.** — Why: mirrors the one-way and the region barrier; the realisation rides on the gate obstacle
  (`passage`), so no new `FloorConfig` field and no serializer field beyond the gate's. — Cost if wrong: renaming is
  a find-and-replace across the binding, the playground choices and the meta.
- **Ruling: a passage is never ground. `openWaysOut` leaves its door a door even while it stands open; a tap ON the
  wall is the offer: the explorer walks to the side he can reach and the prompt hangs there. It is the one offer whose
  cell the explorer never stands on.** — Why: the designer decided he stands on either side and never inside; a tap on
  the side cell cannot be the ask, because that cell is a corridor connector walked through all the time and offering
  there on every stop would nag. — Cost if wrong: the movement invariant ("taking an offer moves the explorer onto
  it", `movementInvariant.spec.ts`) has this one documented exception; its fixtures hold no passage, so it stays green.
- **Ruling: a passage realisation no registered mod declares leaves the gate a plain door (shut while carrying),
  not open ground.** — Why: the stones are still realised and still shut it while carrying, so the door agrees with
  the walk; with the topology mod off the stones are bare and the gate is open ground already (`degradeUnrealised`),
  which is the acceptance gate. — Cost if wrong: one condition in the assembler's stamping step.
- **Ruling: `narrowAlong` is drawn only for a passage whose ways run east-west; one running north-south and every
  corner draw `narrowAcross`, the wall's face.** — Why: a gate room is a node, and the path turns at nodes, so a
  passage can be a corner; the face reads at any turn and there is no corner art. — Cost if wrong: a corner variant
  needs art and one branch in `passageTile`.
- **Ruling: the squeeze is two legs, near cell to the wall's cell and the wall's cell to the far cell, 350 ms each,
  the facing taken per leg (north reuses `explorer-squeeze-s`, west mirrors `explorer-squeeze-e`), the sprite drawn at
  half its own pixel size bottom-centred on the foot line, in the rider's layer (over the wall). Reduced motion, or no
  squeezing tile for the heading, crosses at once.** — Why: two legs pass through the crack on a corner as on a
  straight; half the pixel size is the designer's "width/2 x height/2 units" without hard-coding the tile's
  dimensions. — Cost if wrong: tuning numbers in `useSqueeze.ts` and the story.
- **Ruling: the wall fades (`fadeAt`) for its own cell and the cell north of it.** — Why: those are the cells its
  sprite covers (it rises one wall band above its cell); the explorer is never on its own cell, so in practice it fades
  while he waits on the north side. — Cost if wrong: one array.
- **Ruling: where both sides of a passage are walkable (a gate loop, phase 4), the crossing starts from the first
  side in the cell's own `dirs` order.** — Why: no floor bakes a gate loop yet. — Cost if wrong: on a phase 4 floor a
  tap may squeeze the explorer away from the nearer side; phase 4 can pick the nearer side by path length.
- **Ruling: no `CHANGELOG.md` entry and no save change.** — Why: stones play only on the dev journey and in Storybook
  until phase 6; a crossing writes the explorer's position on the far side, an ordinary cell address, and the wall's
  cell is never a position. — Cost if wrong: a one-line changelog edit.
- **Ruling: `notBuildable` drops "unladen passage".** — Why: both shapes of `unladen` are built here. masonsRamp then
  reports no unbuilt item but still cannot bake: its chute is a drop a stone rides, and the one one-way realisation
  needs both hands, so its zipline binding is refused `stonePasses` (recorded under "Open after phase 3"). — Cost if
  wrong: one list entry.
- **Ruling: the Storybook looks are taken with `npx playwright screenshot` (the Playwright MCP is down) and recorded in
  the task report and the playtest backlog for the designer's morning verdict; nothing stops for a verdict tonight.**

## Decided by the designer (2026-10-07, roadmap "Open per phase", Phase 3)

1. The narrow passage is a **door room**: a wall standing in one corridor cell with a crack the explorer squeezes
   through. He stands on the cells either side, never inside the wall.
2. The crossing plays **like the zipline ride**: the explorer is hidden and a sideways-squeezing sprite slides through
   the crack.
3. The prompt reads en **"Go through the crack"**, nl **"Wurm je door de muur"** (sentence case).
4. It declares **`handsFull`**, so a carrying walk stops before it with the one blocked line, "Cannot pass with a
   stone" / "Niet te passeren met een steen" (`ui.blocked.carrying`, built in phase 2).
5. The crack is painted black; the wall is one solid sprite.
6. Like a gate, the wall fades to **`OCCLUDER_FADE`** while the explorer stands behind it (`fadeAt`).
7. The squeeze frames are `src/assets/tiles/default/explorer-squeeze-e.png` (109x114, imported with `--tight=18.3`,
   drawn at width/2 x height/2 units bottom-centred on the foot line, not the 40x70 explorer box) and
   `explorer-squeeze-s.png` (80x140). North reuses `s`; west mirrors `e`.
8. The carry gap: play refuses carrying across a `handsFull` one-way, the walk and solver did not; phase 3 adds that
   rule to the walk or a lock check (settled by the first ruling above).
9. The passage's art: `src/assets/tiles/default/narrowAcross.png` (the wall across a north-south corridor, 56x84
   units, prop slot) and `narrowAlong.png` (the sideways wall, for east-west corridors). Mechanic art is shared:
   the same tiles at every rank.

## Global Constraints

- **The stone rules live in `stoneArrangements` (`src/game/mechanics/weights.ts`).** Play derives what it shows from
  the compiled record; nothing re-implements a lift, a set-down or a gate's fold.
- **Arriving never acts, standing offers** (`node-actions.md`, spec §4). A crossing is taken through its prompt.
- **A realisation may not change what the walk sees** (`mechanic-contract.md`, "Three layers"). The passage is a
  gate to every walk; the realisation only draws it and offers its crossing.
- **Mod off = same carve, bare nodes, open corridors.** With the topology mod off, an `unladen` gate is open ground
  (its owner, the stones, is unrealised) and no wall moves.
- **Mechanic art is shared:** `narrowAcross`, `narrowAlong` and `explorer-squeeze-{e,s}` come from
  `src/assets/tiles/default/` through `sharedTileUrl` / `sharedTileFrames`, the same at every rank.
- **No tests on authored content.** Tests use small made-up locks written inline (`src/game/testSupport/stoneFixtures.ts`).
  `yarn lock` checks `src/game/locks/*.lock`. Never assert what a catalogue lock contains.
- **Stable world:** a plain `yarn generate-world` leaves `src/data/generatedWorld.ts` byte-identical. This plan edits
  files in the carve fingerprint (`src/game/siteAssembler.ts` and its imports), so `src/data/carveLedger.json`
  changes in its `"hash"` lines only; that refresh is committed at the end (task 6).
- **Saves:** no save field changes. If a task finds it must change one, it double-writes and backfills (never a
  reset) and says so in its report.
- **Comments state the current rule and why**, never history ("replaces", "used to", "now").
- **Count work, never wall-clock**, in tests: fake timers and call counts, no duration assertions.
- **Rendering is verified by looking:** every task that changes drawing ends in a Storybook screenshot taken with
  `npx playwright screenshot`, read back and described in the report. Tests pin which sprite and which tile, never how
  it looks.
- **i18n:** every new string in `public/locales/en/common.json` and `public/locales/nl/common.json` together.
- **Commits:** one short line, then the trailer lines exactly:
  ```
  git commit -m "<type(scope)>: <what changed>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
  ```
- **Shell:** commands run in zsh; an unmatched glob is an error, so quote globs passed to tools.
- **Known failures, not yours:** `src/mods/puzzleSeeds.verify.ts` fails 3 tests ("the switch's three shapes…",
  "owes the switch a board…", "names the floor and the shape…"). Leave them.
- **Changelog:** no entry (rulings).

## Review Focus

1. **The way back.** After squeezing through, a tap on the same wall from the far side must take the explorer back,
   not leave him stranded on the side he landed. Test in task 3 ("from the far side, a tap on the wall brings him
   back").
2. **A tap while the squeeze plays** must move nobody: the crossing is under way until the traversal settles. Test in
   task 3 ("moves nobody on a tap until the crossing is over").
3. **A reload after crossing** must put him on the far side, not back where he started. Test in task 3 ("a reload
   keeps him on the far side").
4. **A passage on a corner cell** must still cross through the crack: both legs pass the wall's cell and the facing
   turns with them. Tests in task 2 (`passageSides` of a corner) and task 4 (the rider's second leg on a corner).
5. **The crack's prompt in either language.** A prompt key a realisation declares reaches `t` as a variable, so the
   literal-key sweep cannot see it; a missing key would render as `ui.prompt.squeeze`. Test in task 3 (`keys.spec.ts`,
   "covers the prompt every crossing names for itself").

---

### Task 1: A drop that takes empty hands, and a zipline a stone could ride is refused

The carry gap. A lock can write `-[unladen]- >>`; the gate folds into the drop; every walk takes such a drop only
with empty hands; a stone floor binding a both-hands realisation to a drop its lock lets a stone ride is refused.

**Files:**
- Modify: `src/game/lockAuthoring.ts` (`isUnladenGate`)
- Modify: `src/game/lockCompile.ts` (`absorbUnladen`; `lockFaults` lets empty hands share a drop's connection;
  `translate` folds them into the drop)
- Modify: `src/game/obstacles.ts` (`OneWayObstacle.unladen`)
- Modify: `src/game/siteTypes.ts` (`CorridorCell.obstacle.unladen`)
- Modify: `src/game/oneWayRealisation.ts` (`OneWayRefusal` gains `"stonePasses"`)
- Modify: `src/game/siteAssembler.ts` (the drop's cells carry `unladen`; the `stonePasses` refusal)
- Modify: `src/game/gridNavigation.ts` (`oneWayRuns` reads `unladen` back)
- Modify: `src/game/floorLock.ts` (`oneWaysOf` hands it to the walk)
- Modify: `src/game/lockWalk.ts` (`LockSpec.oneWays[].unladen`; `movesFrom`)
- Modify: `src/app/SiteMap/useSiteNavigation.ts` (a carrying walk is turned away at an `unladen` launch)
- Modify: `src/worldGen/serializer.ts` (a drop's `unladen` survives the bake)
- Create: `src/game/unladenDrop.spec.ts`
- Test: `src/game/lockCompile.spec.ts`, `src/game/lockWalk.spec.ts`, `src/worldGen/serializer.spec.ts`,
  `src/app/SiteMap/stoneWalk.spec.tsx`

**Interfaces:**
- Consumes: `stoneFloor(text, more)` from `@/game/testSupport/stoneFixtures`; `carveLockFloor(lock, binding, seeds)`
  from `@/game/testSupport/lockFixtures`; `parseLock` from `@/game/lockNotation`.
- Produces: `isUnladenGate(gate: LockGate): boolean` in `@/game/lockAuthoring` (task 2 reuses it);
  `OneWayObstacle.unladen?: true`; `CorridorCell.obstacle: { dir; kind; unladen?: true }`;
  `oneWayRuns(grid)[n].unladen?: true`; `LockSpec.oneWays?: { from; to; unladen?: true }[]`;
  `OneWayRefusal = "unbound" | "noPrompt" | "stonePasses"`.

- [ ] **Step 1: Write the failing tests**

Create `src/game/unladenDrop.spec.ts`:

```ts
import { describe, expect, it } from "vitest"
import { floorLock } from "./floorLock"
import { oneWayRuns } from "./gridNavigation"
import type { RealisationBinding } from "./lockCompile"
import { parseLock } from "./lockNotation"
import type { ResolveOneWayRealisation } from "./oneWayRealisation"
import { assembleFloor } from "./siteAssembler"
import type { AssemblerReason } from "./siteTypes"
import { carveLockFloor } from "./testSupport/lockFixtures"
import { stoneFloor } from "./testSupport/stoneFixtures"

// A yard with a stone, joined to the way out, and a drop from the way out back to the way in.
const UNLADEN_DROP = "in -- yard\nyard -- out\nout -[unladen]- >> in\nshelf plate @yard stone\nin ?\nyard ?\nout ?"
const STONE_DROP = "in -- yard\nyard -- out\nout >> in\nshelf plate @yard stone\nin ?\nyard ?\nout ?"
const ZIPLINE: RealisationBinding = { weights: "stonePlate", "one-way": "zipline" }
const SEEDS = Array.from({ length: 60 }, (_, n) => n)

const refusalsOf = (text: string, resolveOneWay?: ResolveOneWayRealisation): AssemblerReason[] => {
  const result = assembleFloor(
    "test",
    stoneFloor(text, { realisations: ZIPLINE }),
    1,
    undefined,
    resolveOneWay ? { resolveOneWay } : {}
  )
  return result.success ? [] : result.reasons.filter(reason => reason.type === "oneWayRealisationRefused")
}

describe("a drop that takes empty hands", () => {
  it("carries empty hands onto the drop's cells, and the walk reads them back", () => {
    const grid = carveLockFloor(parseLock(UNLADEN_DROP, "stones").lock, ZIPLINE, SEEDS)
    expect(oneWayRuns(grid).map(run => run.unladen)).toEqual([true])
    expect(floorLock(grid)?.oneWays).toEqual([expect.objectContaining({ unladen: true })])
  })

  it("is bound to the zipline on a stone floor", () => {
    expect(refusalsOf(UNLADEN_DROP)).toEqual([])
  })
})

describe("a zipline a stone could ride", () => {
  it("is refused on a stone floor, naming the drop", () => {
    expect(refusalsOf(STONE_DROP)).toEqual([
      { type: "oneWayRealisationRefused", from: "stones.out", to: "stones.in", realisation: "zipline", why: "stonePasses" },
    ])
  })

  it("binds a realisation that leaves the hands free", () => {
    const loose: ResolveOneWayRealisation = id => ({ id: id ?? "rope", ownerMod: "test", prompt: "rope.invitation" })
    expect(refusalsOf(STONE_DROP, loose)).toEqual([])
  })

  it("is bound as before on a floor with no stones", () => {
    const plain = parseLock("in -- yard\nyard -- out\nout >> in\nin ?\nyard ?\nout ?", "plain").lock
    expect(() => carveLockFloor(plain, { "one-way": "zipline" }, SEEDS)).not.toThrow()
  })
})
```

Append to `src/game/lockCompile.spec.ts` (it already imports `checkLock`, `compileLock` and has `fragmentOf`; add
`import { parseLock } from "./lockNotation"` to its imports):

```ts
describe("a drop that takes empty hands", () => {
  const lock = () =>
    parseLock("in -- yard\nyard -- out\nout -[unladen]- >> in\nshelf plate @yard stone", "drop").lock

  it("is checked whole: empty hands beside a drop are the drop's own condition", () => {
    expect(checkLock(lock())).toEqual([])
  })

  it("compiles empty hands into the drop, never into a door of its own", () => {
    const fragment = fragmentOf(lock(), { weights: "stonePlate", "one-way": "zipline" })
    expect(fragment.obstacles).toEqual([
      { id: "out>in", kind: "oneWay", at: { on: "connection", between: ["out", "in"] }, unladen: true },
    ])
    expect(fragment.controls).toContainEqual(expect.objectContaining({ control: "weights", terms: {} }))
  })

  it("still refuses a drop beside a door anything else owns", () => {
    const shared = parseLock(
      "in -- yard\nyard -- out\nout -[p+unladen]- >> in\np plate @yard\nshelf plate @yard stone",
      "drop"
    ).lock
    expect(checkLock(shared)).toContainEqual(expect.objectContaining({ type: "oneWaySharesConnection" }))
  })
})
```

If `parseLock` names the gate on `out -[unladen]- >> in` other than `out-in`, or the drop other than `out>in`
(`unique(\`${from}-${to}\`)` and `unique(\`${from}>${to}\`)` in `src/game/lockNotation.ts`), use the ids it gives and
keep the assertions.

Append to `src/game/lockWalk.spec.ts` (add `type LockSpec` to its `./lockWalk` import if it is not there):

```ts
describe("a drop that takes empty hands", () => {
  const spec = (unladen: boolean): LockSpec => ({
    regions: ["a", "b"],
    gates: {},
    mechanisms: {
      stone: {
        states: ["shelf", "+ hand"],
        initial: "shelf",
        opens: { shelf: [], "+ hand": [] },
        transitions: [
          { from: "shelf", to: "+ hand", at: "a" },
          { from: "+ hand", to: "shelf", at: "a" },
        ],
      },
    },
    oneWays: [{ from: "a", to: "b", ...(unladen ? { unladen: true as const } : {}) }],
    in: "a",
    out: "b",
    leaveWith: [{ mechanism: "stone", notIn: ["+ hand"] }],
  })
  const handsAt = (found: ReturnType<typeof reachableStates>, region: string) => {
    if (found === "tooLarge") throw new Error("expected a walkable lock")
    return found.order.filter(state => state.region === region).map(state => state.config.stone).sort()
  }

  it("is taken only with empty hands", () => {
    expect(handsAt(reachableStates(spec(true)), "b")).toEqual(["shelf"])
  })

  it("is taken carrying where the lock says nothing of hands", () => {
    expect(handsAt(reachableStates(spec(false)), "b")).toEqual(["+ hand", "shelf"])
  })
})
```

Append to `src/worldGen/serializer.spec.ts`, inside the `describe("generateFile — a gate on a connection survives the bake", …)` block:

```ts
  it("keeps a drop's empty hands", () => {
    const floor = {
      pathPuzzles: 0,
      difficulty: "starter" as const,
      end: "treasure" as const,
      exitOrStaircase: "exit" as const,
      sideSections: [],
      obstacles: [
        {
          id: "chute",
          kind: "oneWay" as const,
          at: { on: "connection" as const, between: ["a", "b"] as const },
          unladen: true as const,
        },
      ],
    }
    expect(generateFile({ testJourney: [[floor]] })).toContain(
      'obstacles: [{ id: "chute", kind: "oneWay", at: { on: "connection", between: ["a", "b"] }, unladen: true }]'
    )
  })
```

In `src/app/SiteMap/stoneWalk.spec.tsx`, the test "is turned away at a zipline's launch, which needs both hands": its
lock line `out >> in` becomes `out -[unladen]- >> in`, so the floor is one the bake accepts:

```ts
    const config = stoneFloor(
      "in -- yard\nyard -- out\nout -[unladen]- >> in\nshelf plate @yard stone\nin ?\nyard ?\nout ?",
      { realisations: { weights: "stonePlate", "one-way": "zipline" } }
    )
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/unladenDrop.spec.ts src/game/lockCompile.spec.ts src/game/lockWalk.spec.ts src/worldGen/serializer.spec.ts src/app/SiteMap/stoneWalk.spec.tsx`
Expected: FAIL. `checkLock` reports `oneWaySharesConnection` for the empty-hands drop; the drop's cells carry no
`unladen`; `STONE_DROP` carves with no refusal; the walk takes the `unladen` drop carrying; the serializer drops the
field; `stoneWalk` fails to carve.

- [ ] **Step 3: Empty hands alone, in the shared lock**

At the end of `src/game/lockAuthoring.ts`:

```ts
/** A gate that empty hands alone open: on its own connection a narrow passage, beside a drop the drop's own
 * condition. A gate any plate or mechanic also owns is a door. */
export const isUnladenGate = (gate: LockGate): boolean =>
  !isRegionGate(gate) &&
  gate.owners.length > 0 &&
  gate.owners.every(owner => (CARRY_TERMS as readonly string[]).includes(owner))
```

- [ ] **Step 4: The compiler folds empty hands into the drop**

In `src/game/lockCompile.ts`, add `isUnladenGate` to the `./lockAuthoring` value import. Below `kindsUsed`, add:

```ts
/**
 * A DROP THAT TAKES EMPTY HANDS: a gate only empty hands open, standing on a connection a one-way stands on, is that
 * drop's own condition and never a door of its own. Returns the lock without those gates (and without their names
 * on their connections), and the drops that carry them.
 */
const absorbUnladen = (lock: Lock): { lock: Lock; unladen: ReadonlySet<string> } => {
  const oneWays = lock.oneWays ?? {}
  const absorbed = new Set<string>()
  const unladen = new Set<string>()
  for (const connection of lock.connections) {
    const barriers = barriersOf(connection)
    const drop = barriers.find(barrier => barrier in oneWays)
    if (drop === undefined) continue
    for (const barrier of barriers)
      if (barrier in lock.gates && isUnladenGate(lock.gates[barrier])) {
        absorbed.add(barrier)
        unladen.add(drop)
      }
  }
  if (absorbed.size === 0) return { lock, unladen }
  return {
    lock: {
      ...lock,
      gates: Object.fromEntries(Object.entries(lock.gates).filter(([id]) => !absorbed.has(id))),
      connections: lock.connections.map(connection =>
        "between" in connection && connection.barriers
          ? { ...connection, barriers: connection.barriers.filter(barrier => !absorbed.has(barrier)) }
          : connection
      ),
    },
    unladen,
  }
}
```

In `lockFaults`, the line

```ts
    const standing = barriers.filter(barrier => barrier in lock.gates || barrier in oneWays)
```

becomes

```ts
    // Empty hands beside a drop are the drop's own condition (`absorbUnladen`), not a second barrier on it.
    const standing = barriers.filter(
      barrier =>
        barrier in oneWays ||
        (barrier in lock.gates && !(barriers.some(b => b in oneWays) && isUnladenGate(lock.gates[barrier])))
    )
```

In `translate`, rename the parameter `lock` to `authored` and make the first lines of the body:

```ts
  const { lock, unladen } = absorbUnladen(authored)
```

so every later line reads the lock without the folded gates. In the one-way loop, the pushed obstacle gains the flag:

```ts
  for (const [id, oneWay] of Object.entries(oneWays))
    obstacles.push({
      id: name(id),
      kind: "oneWay",
      at: { on: "connection", between: [name(oneWay.from), name(oneWay.to)] },
      ...(unladen.has(id) ? { unladen: true as const } : {}),
    })
```

(`oneWays` in `translate` is `lock.oneWays ?? {}`, read after the rename from the absorbed lock, which keeps every
one-way.)

In `src/game/obstacles.ts`, `OneWayObstacle` gains:

```ts
  /** Taken only with empty hands: the lock wrote `-[unladen]-` beside it, so no stone rides it (`absorbUnladen`). */
  unladen?: true
```

- [ ] **Step 5: The drop's cells carry it, and the walk reads it**

In `src/game/siteTypes.ts`, `CorridorCell.obstacle` becomes:

```ts
  obstacle?: { dir: Direction; kind: ObstacleKind; unladen?: true }
```

and its doc comment gains the sentence: "`unladen` says the drop is taken only with empty hands."

In `src/game/siteAssembler.ts`, just above `for (const edge of oneWayEdges) {` (the "WRITE THE CHOSEN DROPS" loop), add

```ts
    // A drop the lock takes with empty hands says so on every cell of its span, which is where the walk reads it.
    const unladenDrops = new Set(
      (authoredConfig.obstacles ?? []).flatMap(o => (o.kind === "oneWay" && o.unladen ? [o.id] : []))
    )
```

and the span write becomes

```ts
        if (cell.type === "corridor")
          cells2D[r][c] = {
            ...cell,
            obstacle: {
              dir: edge.dir,
              kind: edge.realisation,
              ...(edge.obstacleId !== undefined && unladenDrops.has(edge.obstacleId) ? { unladen: true as const } : {}),
            },
          }
```

In `src/game/gridNavigation.ts`, `oneWayRuns`'s return type gains `unladen?: true`, and the loop reads it:

```ts
      const { dir, kind, unladen } = first.obstacle
```

```ts
      runs.push({ launch: [r - dr, c - dc], cells, landing: [lr + dr, lc + dc], dir, kind, ...(unladen ? { unladen } : {}) })
```

In `src/game/floorLock.ts`, `oneWaysOf`:

```ts
const oneWaysOf = (grid: FloorGrid, of: Map<string, RegionId>): NonNullable<LockSpec["oneWays"]> => {
  const found: NonNullable<LockSpec["oneWays"]> = []
  for (const run of oneWayRuns(grid)) {
    const from = of.get(posKey(run.launch[0], run.launch[1]))
    const to = of.get(posKey(run.landing[0], run.landing[1]))
    if (from && to && from !== to) found.push({ from, to, ...(run.unladen ? { unladen: true as const } : {}) })
  }
  return found
}
```

(`LockSpec` is already imported in `floorLock.ts`; if not, add `import type { LockSpec } from "./lockWalk"`.)

In `src/game/lockWalk.ts`, `LockSpec.oneWays` becomes:

```ts
  /** Directed, region to region: a drop the player takes one way. `unladen`: only with hands that may leave the
   * floor, so no stone rides it. */
  oneWays?: { from: RegionId; to: RegionId; unladen?: true }[]
```

and in `movesFrom` the one-way line becomes:

```ts
  for (const oneWay of spec.oneWays ?? [])
    if (oneWay.from === region && (!oneWay.unladen || mayLeave(spec, config))) moves.push({ region: oneWay.to, config })
```

- [ ] **Step 6: A both-hands zipline a stone could ride is refused**

In `src/game/oneWayRealisation.ts`, `OneWayRefusal` becomes:

```ts
/** Why a one-way cannot be bound: it names no realisation, or one with no prompt, or one that needs both hands on a
 * stone floor whose lock lets a stone ride the drop (play would turn back a walk the solver takes). */
export type OneWayRefusal = "unbound" | "noPrompt" | "stonePasses"
```

In `src/game/siteAssembler.ts`, replace the `realisationRefusals` block (it starts at
`const realisationRefusals = [` under the comment "A ONE-WAY IS CROSSED THROUGH A REALISATION THAT OFFERS ITS
PROMPT") with:

```ts
  // A STONE FLOOR'S DROP IS CROSSED WITH THE HANDS ITS LOCK ALLOWS: a realisation that needs both hands on a drop the
  // lock lets a stone ride would turn back in play a walk the solver takes, so it is refused by name. The lock says
  // empty hands with `-[unladen]- >>`, which the drop then carries (`OneWayObstacle.unladen`).
  const holdsStones = (authoredConfig.controls ?? []).some(isWeights)
  const realisationRefusals = [
    ...(authoredConfig.oneWays ?? []).map(({ from, to }) => ({ from, to, unladen: false })),
    ...(authoredConfig.obstacles ?? []).flatMap(o =>
      o.kind === "oneWay" ? [{ from: o.at.between[0], to: o.at.between[1], unladen: o.unladen === true }] : []
    ),
  ].flatMap(({ from, to, unladen }) => {
    const named = authoredConfig.oneWayRealisation
    const bound = resolveOneWay(named)
    const why: OneWayRefusal | undefined = bound
      ? !bound.prompt
        ? "noPrompt"
        : holdsStones && bound.handsFull && !unladen
          ? "stonePasses"
          : undefined
      : named === undefined
        ? "unbound"
        : undefined
    return why ? [{ type: "oneWayRealisationRefused" as const, from, to, realisation: named ?? null, why }] : []
  })
```

- [ ] **Step 7: Play turns a carrying walk away at an `unladen` launch**

In `src/app/SiteMap/useSiteNavigation.ts`, the launch guard becomes:

```ts
        if (carrying && (span.unladen || resolveOneWay(span.kind)?.handsFull)) return turnAway(row, col)
```

- [ ] **Step 8: The bake keeps it**

In `src/worldGen/serializer.ts`, `serializeObstacle` ends:

```ts
  // A drop the lock takes with empty hands keeps saying so.
  const unladen = o.kind === "oneWay" && o.unladen ? ", unladen: true" : ""
  return `{ id: ${JSON.stringify(o.id)}, kind: ${JSON.stringify(o.kind)}, at: { on: ${JSON.stringify(o.at.on)}, ${at} }${terms}${unladen} }`
```

- [ ] **Step 9: Run the tests**

Run: `yarn vitest run src/game/unladenDrop.spec.ts src/game/lockCompile.spec.ts src/game/lockWalk.spec.ts src/worldGen/serializer.spec.ts src/app/SiteMap/stoneWalk.spec.tsx src/game/floorLock.spec.ts src/game/siteAssembler.spec.ts src/app/SiteMap/oneWayPrompt.spec.tsx`
Expected: PASS.

Run: `yarn check-types && yarn lint`
Expected: clean.

- [ ] **Step 10: Commit**

```bash
git add src/game/lockAuthoring.ts src/game/lockCompile.ts src/game/obstacles.ts src/game/siteTypes.ts src/game/oneWayRealisation.ts src/game/siteAssembler.ts src/game/gridNavigation.ts src/game/floorLock.ts src/game/lockWalk.ts src/app/SiteMap/useSiteNavigation.ts src/worldGen/serializer.ts src/game/unladenDrop.spec.ts src/game/lockCompile.spec.ts src/game/lockWalk.spec.ts src/worldGen/serializer.spec.ts src/app/SiteMap/stoneWalk.spec.tsx
git commit -m "feat(stones): a drop can take empty hands, and a zipline a stone could ride is refused" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 2: The narrow passage, bound and stood on the carve

A gate only empty hands open, alone on its connection, compiles to an edge gate naming its passage; the carve stamps
its door; the topology mod declares `narrowPassage`; with the mod off the gate is open ground.

**Files:**
- Create: `src/game/passageRealisation.ts`
- Create: `src/game/mechanics/unladen.ts`
- Modify: `src/game/mechanics/index.ts` (`CORE_MECHANICS` gains `UNLADEN`)
- Modify: `src/game/lockCompile.ts` (`kindsUsed` counts passages; `translate` names the passage)
- Modify: `src/game/obstacles.ts` (`GateTerms.passage`)
- Modify: `src/worldGen/serializer.ts` (`GATE_TERMS.passage`)
- Modify: `src/game/siteTypes.ts` (`RoomCell.passage`)
- Create: `src/game/passages.ts` (`withPassages`, `passageSides`, `headingOf`, `passageCrossing`)
- Modify: `src/game/encounterFallback.ts` (`defaultResolvePassageRealisation`)
- Modify: `src/game/siteAssembler.ts` (`resolvePassage` option; stamp after `degradeUnrealised`)
- Modify: `src/mods/modDescriptor.ts`, `src/mods/registeredMods.ts`
- Create: `src/mods/allPassageRealisations.ts`
- Create: `src/mods/topology/game/narrowPassage/meta.ts`; Modify: `src/mods/topology/index.ts`
- Modify: `src/game/testSupport/modOff.ts` (`TOPOLOGY_OFF.resolvePassage`; `mechanicsLeft` names a passage)
- Modify: `src/game/testSupport/stoneFixtures.ts` (`CRACK`, `PASSAGE_BINDING`, `passageAt`)
- Modify: `src/game/lockWalkSpec.ts` (`notBuildable` drops "unladen passage")
- Modify: `src/app/SiteMap/useAssembledFloor.ts` (`assemblePlayedFloor` passes the registry's resolver)
- Modify: `src/app/SiteMap/playgroundCarve.testing.ts` (`REALISATION_CHOICES.unladen`)
- Create: `src/game/passages.spec.ts`, `src/game/passageRealisation.spec.ts`
- Test: `src/game/lockCompile.spec.ts`, `src/game/lockWalkSpec.spec.ts`, `src/worldGen/serializer.spec.ts`

**Interfaces:**
- Consumes: `isUnladenGate` (task 1).
- Produces:
  - `PASSAGE_KIND = "unladen"`, `PassageRealisationMeta = { id: string; ownerMod: string; prompt: string; handsFull?: boolean; art?: { across: string; along: string } }`, `ResolvePassageRealisation = (id: string | undefined) => PassageRealisationMeta | undefined` in `@/game/passageRealisation`.
  - `RoomCell.passage?: { realisation: string }`; `GateTerms.passage?: string`.
  - In `@/game/passages`: `type Place = readonly [number, number]`; `withPassages(grid: FloorGrid, passages: ReadonlyMap<string, string>): FloorGrid`; `passageSides(grid: FloorGrid, row: number, col: number): readonly [Place, Place] | undefined`; `headingOf(from: Place, to: Place): Direction`; `type PassageCrossing = { near: Place; via: Place; far: Place; realisation: string }`; `passageCrossing(grid: FloorGrid, row: number, col: number, canStand: (row: number, col: number) => boolean): PassageCrossing | undefined`.
  - `resolvePassageRealisation` and `MOD_PASSAGE_REALISATIONS` in `@/mods/registeredMods` (re-exported by `@/mods/allPassageRealisations`); `NARROW_PASSAGE_META`.
  - `AssembleFloorKeyRequirements.resolvePassage?: ResolvePassageRealisation`; `TOPOLOGY_OFF.resolvePassage`.
  - In `@/game/testSupport/stoneFixtures`: `CRACK: string`, `PASSAGE_BINDING: RealisationBinding`, `passageAt(grid: FloorGrid): readonly [number, number]`.

- [ ] **Step 1: Write the failing tests**

Create `src/game/passages.spec.ts`:

```ts
import { describe, expect, it } from "vitest"
import { headingOf, passageCrossing, passageSides, withPassages } from "./passages"
import type { CorridorCell, Direction, FloorGrid, GridCell, RoomCell } from "./siteTypes"

const KEY = "obstacle:spec#0#0:crack"
const ground = (dirs: Direction[]): CorridorCell => ({ type: "corridor", dirs: new Set(dirs), state: "reachable" })
const door = (dirs: Direction[], more: Partial<RoomCell> = {}): RoomCell => ({
  type: "room",
  roomType: "encounter",
  dirs: new Set(dirs),
  state: "reachable",
  tags: ["gate"],
  requiredKeyId: KEY,
  ...more,
})
const gridOf = (cells: GridCell[][]): FloorGrid => ({
  cells,
  rows: cells.length,
  cols: cells[0].length,
  entrancePos: [0, 0],
  exitPos: [cells.length - 1, cells[0].length - 1],
  siteId: "spec",
  staircases: {},
})
const CRACK_AT = { passage: { realisation: "narrowPassage" } }
const bare = gridOf([[ground(["e"]), door(["w", "e"]), ground(["w"])]])
const straight = gridOf([[ground(["e"]), door(["w", "e"], CRACK_AT), ground(["w"])]])
const corner = gridOf([
  [door(["e", "s"], CRACK_AT), ground(["w"])],
  [ground(["n"]), { type: "empty" }],
])

describe("withPassages", () => {
  it("dresses the door whose key it names, and moves nothing else", () => {
    const dressed = withPassages(bare, new Map([[KEY, "narrowPassage"]]))
    expect(dressed.cells[0][1]).toEqual({ ...bare.cells[0][1], passage: { realisation: "narrowPassage" } })
    expect(dressed.cells[0][0]).toBe(bare.cells[0][0])
    expect(dressed.cells[0][2]).toBe(bare.cells[0][2])
  })

  it("hands back the very grid when it names no door on it", () => {
    expect(withPassages(bare, new Map([["obstacle:spec#0#0:other", "narrowPassage"]]))).toBe(bare)
    expect(withPassages(bare, new Map())).toBe(bare)
  })
})

describe("passageSides", () => {
  it("reads the two cells a straight passage joins off its own ways", () => {
    expect(passageSides(straight, 0, 1)).toEqual([
      [0, 0],
      [0, 2],
    ])
  })

  it("reads them at a corner too", () => {
    expect(passageSides(corner, 0, 0)).toEqual([
      [0, 1],
      [1, 0],
    ])
  })

  it("says nothing of a cell that is no passage", () => {
    expect(passageSides(bare, 0, 1)).toBeUndefined()
    expect(passageSides(straight, 0, 0)).toBeUndefined()
  })
})

describe("passageCrossing", () => {
  it("starts on the side the explorer can stand on, through the wall's cell, to the other", () => {
    expect(passageCrossing(straight, 0, 1, (r, c) => r === 0 && c === 2)).toEqual({
      near: [0, 2],
      via: [0, 1],
      far: [0, 0],
      realisation: "narrowPassage",
    })
  })

  it("starts on the first side where he can stand on both", () => {
    expect(passageCrossing(straight, 0, 1, () => true)?.near).toEqual([0, 0])
  })

  it("is no crossing where he can stand on neither side", () => {
    expect(passageCrossing(straight, 0, 1, () => false)).toBeUndefined()
  })
})

describe("headingOf", () => {
  it.each([
    [[1, 1], [0, 1], "n"],
    [[1, 1], [2, 1], "s"],
    [[1, 1], [1, 2], "e"],
    [[1, 1], [1, 0], "w"],
  ] as const)("goes from %j to %j heading %s", (from, to, dir) => {
    expect(headingOf(from, to)).toBe(dir)
  })
})
```

Create `src/game/passageRealisation.spec.ts`:

```ts
import { describe, expect, it } from "vitest"
import { resolvePassageRealisation } from "@/mods/allPassageRealisations"
import { compileLock } from "./lockCompile"
import { parseLock } from "./lockNotation"
import { assembleFloor } from "./siteAssembler"
import type { FloorGrid, RoomCell } from "./siteTypes"
import { carveLockFloor } from "./testSupport/lockFixtures"
import { dirsOf, gateKeysOwned, mechanicsLeft, TOPOLOGY_OFF, TOPOLOGY_ON } from "./testSupport/modOff"
import { CRACK, PASSAGE_BINDING, stoneFloor } from "./testSupport/stoneFixtures"

const SEEDS = Array.from({ length: 60 }, (_, n) => n)
const passages = (grid: FloorGrid): RoomCell[] =>
  grid.cells.flat().flatMap(cell => (cell.type === "room" && cell.passage ? [cell] : []))
const crackFloor = () => stoneFloor(CRACK, { realisations: PASSAGE_BINDING })

describe("a gate empty hands alone open", () => {
  it("is refused when the binding names no passage for it, like any kind the lock uses", () => {
    expect(compileLock(parseLock(CRACK, "stones").lock, { weights: "stonePlate" })).toEqual({
      ok: false,
      faults: [{ type: "unboundRole", kind: "unladen", mechanics: ["in-out"] }],
    })
  })

  it("names the passage it is bound to on its gate", () => {
    const result = compileLock(parseLock(CRACK, "stones").lock, PASSAGE_BINDING)
    if (!result.ok) throw new Error(JSON.stringify(result.faults))
    expect(result.fragment.obstacles).toContainEqual(
      expect.objectContaining({ id: "in-out", kind: "gate", passage: "narrowPassage" })
    )
  })

  it.each([
    ["every owner", "in -[p+unladen]- out"],
    ["any owner", "in -[p|unladen]- out"],
  ])("leaves a door that also waits on a plate (%s) a door", (_, line) => {
    const lock = parseLock(`${line}\np plate @in\nshelf plate @in stone`, "stones").lock
    const result = compileLock(lock, { weights: "stonePlate" })
    if (!result.ok) throw new Error(JSON.stringify(result.faults))
    expect(result.fragment.obstacles.filter(o => o.kind === "gate" && o.passage !== undefined)).toEqual([])
  })
})

describe("the narrow passage on a carved floor", () => {
  it("stands in the gate's own door, which stays a door", () => {
    const grid = carveLockFloor(parseLock(CRACK, "stones").lock, PASSAGE_BINDING, SEEDS)
    const [door, ...more] = passages(grid)
    expect(more).toEqual([])
    expect(door.passage).toEqual({ realisation: "narrowPassage" })
    expect(door.tags).toContain("gate")
    expect(door.requiredKeyId).toMatch(/stones\.in-out$/)
  })

  it("leaves a plain door where no registered mod declares the passage", () => {
    for (const seed of SEEDS) {
      const result = assembleFloor("test", crackFloor(), seed, undefined, { resolvePassage: () => undefined })
      if (!result.success) continue
      expect(passages(result.grid)).toEqual([])
      expect(
        result.grid.cells
          .flat()
          .some(cell => cell.type === "room" && cell.tags?.includes("gate") && cell.requiredKeyId?.endsWith("stones.in-out"))
      ).toBe(true)
      return
    }
    throw new Error("no seed carved the floor")
  })

  it("carves the walls the mod on carves with the topology mod off, the passage open ground", () => {
    let compared = 0
    for (const seed of SEEDS) {
      const on = assembleFloor("test", crackFloor(), seed, TOPOLOGY_ON.resolveEncounter, {
        resolvePassage: resolvePassageRealisation,
      })
      if (!on.success) continue
      const off = assembleFloor("test", crackFloor(), seed, TOPOLOGY_OFF.resolveEncounter, {
        resolveOneWay: TOPOLOGY_OFF.resolveOneWay,
        resolvePassage: TOPOLOGY_OFF.resolvePassage,
      })
      expect(off.success, `seed ${seed}`).toBe(true)
      if (!off.success) continue
      expect(passages(on.grid)).toHaveLength(1)
      expect(dirsOf(off.grid)).toBe(dirsOf(on.grid))
      expect(mechanicsLeft(off.grid, gateKeysOwned(on.grid))).toEqual([])
      if (++compared >= 5) break
    }
    expect(compared).toBeGreaterThan(0)
  })

  it("is declared by the topology mod, with its prompt, its art and both hands", () => {
    expect(resolvePassageRealisation("narrowPassage")).toEqual({
      id: "narrowPassage",
      ownerMod: "topology",
      prompt: "ui.prompt.squeeze",
      handsFull: true,
      art: { across: "narrowAcross", along: "narrowAlong" },
    })
  })
})
```

In `src/game/lockCompile.spec.ts`, the test "carries no mod: the kinds are the same with every mod removed from the
build" expects the list with `"unladen"` appended after `"weights"`.

In `src/game/lockWalkSpec.spec.ts`, the last line of "names what the engine cannot build yet" becomes:

```ts
    expect(notBuildable(parseLock("in -[unladen]- out\nshelf plate @in stone").lock)).toEqual([])
```

Append to the same serializer `describe` block as task 1:

```ts
  it("keeps the passage a gate is bound to", () => {
    const floor = {
      pathPuzzles: 0,
      difficulty: "starter" as const,
      end: "treasure" as const,
      exitOrStaircase: "exit" as const,
      sideSections: [],
      obstacles: [
        {
          id: "crack",
          kind: "gate" as const,
          at: { on: "connection" as const, between: ["a", "b"] as const },
          passage: "narrowPassage",
        },
      ],
    }
    expect(generateFile({ testJourney: [[floor]] })).toContain(
      'obstacles: [{ id: "crack", kind: "gate", at: { on: "connection", between: ["a", "b"] }, passage: "narrowPassage" }]'
    )
  })
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/passages.spec.ts src/game/passageRealisation.spec.ts src/game/lockCompile.spec.ts src/game/lockWalkSpec.spec.ts src/worldGen/serializer.spec.ts`
Expected: FAIL, `./passages`, `@/mods/allPassageRealisations` and `CRACK` do not exist.

- [ ] **Step 3: The realisation contract and the core kind**

Create `src/game/passageRealisation.ts`:

```ts
/** The realisation kind a gate empty hands alone open is bound under in a `RealisationBinding`. */
export const PASSAGE_KIND = "unladen"

/**
 * How a mod dresses a gate that only empty hands open: a narrow passage. The gate is core's and the walk sees it as
 * a gate whatever is bound; the realisation is what the player is shown and how the crossing is offered.
 */
export type PassageRealisationMeta = {
  id: string
  ownerMod: string
  /** Locale key of the crossing's prompt. */
  prompt: string
  /** The crossing needs both hands: a carrying walk is turned away beside it with the one blocked line
   * (`ui.blocked.carrying`). */
  handsFull?: boolean
  /** The shared tiles (`tiles/default/<key>.png`) the passage is drawn with: the wall across a way running north-south,
   * and along one running east-west. Unset: the passage is drawn as a shut gate. */
  art?: { across: string; along: string }
}

/** Resolves the realisation a passage names; answers nothing for one no registered mod declares, which leaves the
 * gate a plain door. */
export type ResolvePassageRealisation = (id: string | undefined) => PassageRealisationMeta | undefined
```

Create `src/game/mechanics/unladen.ts`:

```ts
import { PASSAGE_KIND } from "../passageRealisation"
import type { MechanicKind } from "./mechanicKind"

/** An effect with no control: a gate empty hands alone open, alone on its connection, dressed as the passage its
 * binding names. Beside a drop it is the drop's own condition and needs no binding. */
export const UNLADEN: MechanicKind = { control: PASSAGE_KIND, built: true, gates: "opens", effectOnly: true }
```

In `src/game/mechanics/index.ts`, import `UNLADEN` from `./unladen` and append it to `CORE_MECHANICS`:

```ts
export const CORE_MECHANICS: readonly MechanicKind[] = [TOGGLE, ACTIVATOR, SEQUENCE, FORK_SWITCH, ONE_WAY, WEIGHTS, UNLADEN]
```

- [ ] **Step 4: The compiler names the passage**

In `src/game/obstacles.ts`, `GateTerms` gains (after `floorKeys`):

```ts
  /** THE PASSAGE THIS GATE IS DRESSED AS: the realisation a gate empty hands alone open was bound to (`unladen` in a
   * binding). Only an edge gate takes one. */
  passage?: string
```

In `src/worldGen/serializer.ts`, `GATE_TERMS` gains `passage: v => JSON.stringify(v),`.

In `src/game/lockCompile.ts`, import `PASSAGE_KIND` from `./passageRealisation`. In `kindsUsed`, before
`return used`:

```ts
  // A gate empty hands alone open is a passage to be dressed, unless it stands beside a drop that carries it.
  for (const [id, gate] of Object.entries(absorbUnladen(lock).lock.gates))
    if (isUnladenGate(gate)) add(PASSAGE_KIND, id)
```

(`absorbUnladen` is a `const` declared below `kindsUsed`; `kindsUsed` only runs after the module has loaded, so the
order is fine. If lint's `no-use-before-define` objects, move `absorbUnladen` above `kindsUsed`.)

In `translate`, the gate loop's `terms` become:

```ts
    const passage = isUnladenGate(gate) ? binding[PASSAGE_KIND] : undefined
    const terms = {
      ...(gate.mode === "any" ? { mode: "any" as const } : {}),
      ...(forkOwners.length > 0 ? { owners: forkOwners } : {}),
      ...(passage !== undefined ? { passage } : {}),
    }
```

- [ ] **Step 5: The passage on the carve**

In `src/game/siteTypes.ts`, `RoomCell` gains (after `regionBarrier`):

```ts
  /** THIS DOOR IS A NARROW PASSAGE (src/game/passages.ts): a gate empty hands alone open, dressed as the realisation
   * it was bound to. Nobody stands in it: the explorer waits on either side and is taken through by its prompt. */
  passage?: { realisation: string }
```

Create `src/game/passages.ts`:

```ts
import type { Direction, FloorGrid, GridCell } from "./siteTypes"

// A NARROW PASSAGE: a gate empty hands alone open, a wall with a crack in one cell. It is a gate to every walk; play
// never lets anyone stand in it, and takes the explorer through by its prompt (useSiteNavigation).

export type Place = readonly [number, number]

const STEP: Record<Direction, Place> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

/** Each door whose key `passages` names gains the passage it was bound to. Only those cells change: no wall, `dirs`
 * or slot moves, so the carve the checks read is the carve the player walks. */
export const withPassages = (grid: FloorGrid, passages: ReadonlyMap<string, string>): FloorGrid => {
  if (passages.size === 0) return grid
  let changed = false
  const cells = grid.cells.map(row =>
    row.map((cell): GridCell => {
      if (cell.type !== "room" || !cell.tags?.includes("gate") || cell.requiredKeyId === undefined) return cell
      const realisation = passages.get(cell.requiredKeyId)
      if (realisation === undefined) return cell
      changed = true
      return { ...cell, passage: { realisation } }
    })
  )
  return changed ? { ...grid, cells } : grid
}

/** The two cells a passage joins, read off its own ways in the order its `dirs` hold them; undefined for a cell that
 * is no passage, or one with other than two ways. */
export const passageSides = (grid: FloorGrid, row: number, col: number): readonly [Place, Place] | undefined => {
  const cell = grid.cells[row]?.[col]
  if (cell?.type !== "room" || !cell.passage || cell.dirs.size !== 2) return undefined
  const [a, b] = [...cell.dirs].map((dir): Place => [row + STEP[dir][0], col + STEP[dir][1]])
  return [a, b]
}

/** The way from a cell to its neighbour. */
export const headingOf = (from: Place, to: Place): Direction =>
  to[0] < from[0] ? "n" : to[0] > from[0] ? "s" : to[1] > from[1] ? "e" : "w"

export type PassageCrossing = { near: Place; via: Place; far: Place; realisation: string }

/** The crossing of the passage at (row, col) from the first of its sides the explorer can stand on, through the wall's
 * own cell, to the other; undefined where he can stand on neither. Both are standable only where a gate closes a
 * loop; he starts from the first. */
export const passageCrossing = (
  grid: FloorGrid,
  row: number,
  col: number,
  canStand: (row: number, col: number) => boolean
): PassageCrossing | undefined => {
  const cell = grid.cells[row]?.[col]
  const sides = passageSides(grid, row, col)
  if (!sides || cell?.type !== "room" || !cell.passage) return undefined
  const near = sides.find(([r, c]) => canStand(r, c))
  if (!near) return undefined
  return { near, via: [row, col], far: near === sides[0] ? sides[1] : sides[0], realisation: cell.passage.realisation }
}
```

In `src/game/encounterFallback.ts`, import `type ResolvePassageRealisation` from `./passageRealisation` and add at the
end:

```ts
// A caller with no registry accepts any passage a gate names, as it answers every encounter, and offers it with the
// one prompt this catalogue knows. An unnamed one is no passage.
export const defaultResolvePassageRealisation: ResolvePassageRealisation = id =>
  id === undefined ? undefined : { id, ownerMod: REGISTRY_LESS, prompt: "ui.prompt.squeeze", handsFull: true }
```

In `src/game/siteAssembler.ts`:
- add `defaultResolvePassageRealisation` to the `./encounterFallback` import, `import type { ResolvePassageRealisation } from "./passageRealisation"`, and `import { withPassages } from "./passages"`;
- `AssembleFloorKeyRequirements` gains, after `resolveRegionBarrier`:

```ts
  /** Says which passage a gate empty hands alone open is dressed as. Production passes the registry's; absent
   * (stories, specs, the builder) the fallback accepts any named one. One no registered mod declares leaves a door. */
  resolvePassage?: ResolvePassageRealisation
```

- in `assembleExpandedFloor`'s destructuring add `resolvePassage = defaultResolvePassageRealisation,`;
- right after `const gateKeyOf = (id: string) => …` add:

```ts
  // THE PASSAGES THIS FLOOR'S GATES WERE BOUND TO, by the key their doors ask for: only those a registered mod
  // declares, so a passage whose mod is absent stays the door its owners make it.
  const passageKeys = new Map(
    (authoredConfig.obstacles ?? [])
      .filter(isEdgeGate)
      .flatMap(o =>
        o.passage !== undefined && resolvePassage(o.passage) !== undefined ? [[gateKeyOf(o.id), o.passage] as const] : []
      )
  )
```

- after `const bare = degradeUnrealised(…)` add

```ts
    // A GATE EMPTY HANDS ALONE OPEN IS DRESSED AS ITS PASSAGE once the carve is final: only the door cell gains a
    // field. A door the degrade made ground is no door, so it gains nothing.
    const passed = withPassages(bare, passageKeys)
```

  and in the `faced` expression replace both uses of `bare` with `passed`.

- [ ] **Step 6: The registry, and the topology mod's narrow passage**

In `src/mods/modDescriptor.ts`, import `type PassageRealisationMeta` from `@/game/passageRealisation` and add after
`regionBarrierRealisations`:

```ts
  // The passage realisations this mod offers (a narrow passage), each with the prompt its crossing is offered through.
  // A passage bound to one that drops with the mod is a plain door.
  passageRealisations?: PassageRealisationMeta[]
```

In `src/mods/registeredMods.ts`, import `type PassageRealisationMeta, type ResolvePassageRealisation` from
`@/game/passageRealisation` and add after `resolveRegionBarrierRealisation`:

```ts
// Every passage realisation a registered mod declares. One that drops with its mod leaves its gate a plain door.
export const MOD_PASSAGE_REALISATIONS: PassageRealisationMeta[] = REGISTERED_MODS.flatMap(
  m => m.passageRealisations ?? []
)

export const resolvePassageRealisation: ResolvePassageRealisation = id =>
  id === undefined ? undefined : MOD_PASSAGE_REALISATIONS.find(realisation => realisation.id === id)
```

Create `src/mods/allPassageRealisations.ts`:

```ts
export { resolvePassageRealisation } from "./registeredMods"
```

Create `src/mods/topology/game/narrowPassage/meta.ts`:

```ts
import type { PassageRealisationMeta } from "@/game/passageRealisation"

// A NARROW PASSAGE IS A WALL WITH A CRACK in one corridor cell: a person squeezes through sideways, a stone does not.
// The crossing takes both hands, so a carrying walk stops beside it and says why.
export const NARROW_PASSAGE_META: PassageRealisationMeta = {
  id: "narrowPassage",
  ownerMod: "topology",
  prompt: "ui.prompt.squeeze",
  handsFull: true,
  art: { across: "narrowAcross", along: "narrowAlong" },
}
```

In `src/mods/topology/index.ts`, import it and add `passageRealisations: [NARROW_PASSAGE_META],` after
`regionBarrierRealisations`; in the descriptor's comment, after "water and sand a region barrier," add "the narrow
passage a gate empty hands alone open,".

In `src/game/testSupport/modOff.ts`, import `MOD_PASSAGE_REALISATIONS` beside the other registry imports and
`type ResolvePassageRealisation` from `@/game/passageRealisation`; add

```ts
const passageWithout: ResolvePassageRealisation = id =>
  id === undefined ? undefined : MOD_PASSAGE_REALISATIONS.find(r => r.id === id && r.ownerMod !== MOD)
```

and `resolvePassage: passageWithout,` to `TOPOLOGY_OFF`; in `mechanicsLeft` add
`if (cell.passage) found.push(\`${at} passage\`)` after the `regionBarrier` line.

In `src/game/testSupport/stoneFixtures.ts`, add `import type { RealisationBinding } from "@/game/lockCompile"` and:

```ts
/** A stone on a shelf by the way in, and a narrow passage on to the way out: only empty hands go through. */
export const CRACK = "in -[unladen]- out\nshelf plate @in stone\nin ?\nout ?"

/** The stones as stone plates, a gate empty hands alone open as a narrow passage. */
export const PASSAGE_BINDING: RealisationBinding = { weights: "stonePlate", unladen: "narrowPassage" }

/** Where the floor's one narrow passage stands. */
export const passageAt = (grid: FloorGrid): readonly [number, number] => {
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type === "room" && cell.passage) return [r, c]
    }
  throw new Error("no narrow passage on this floor")
}
```

- [ ] **Step 7: The tool, play's carve and the playground know it**

In `src/game/lockWalkSpec.ts`, `notBuildable` loses its first entry:

```ts
export const notBuildable = (lock: Lock): string[] => [
  ...(Object.values(lock.mechanics).some(m => m.control === "sequence") ? ["sequence"] : []),
  ...(Object.values(lock.gates).some(isRegionGate) ? ["region gate"] : []),
  ...(hasGateLoop(lock) ? ["gate loop"] : []),
]
```

and `CARRY_TERMS` leaves its `./lockAuthoring` import if `grep -n CARRY_TERMS src/game/lockWalkSpec.ts` shows no other
use.

In `src/app/SiteMap/useAssembledFloor.ts`, import `resolvePassageRealisation` from `@/mods/allPassageRealisations` and
add `resolvePassage: resolvePassageRealisation,` after `resolveRegionBarrier: resolveRegionBarrierRealisation,` in
`assemblePlayedFloor`.

In `src/app/SiteMap/playgroundCarve.testing.ts`, `REALISATION_CHOICES` gains `unladen: ["narrowPassage"],` after
`weights`.

- [ ] **Step 8: Run the tests**

Run: `yarn vitest run src/game/passages.spec.ts src/game/passageRealisation.spec.ts src/game/lockCompile.spec.ts src/game/lockWalkSpec.spec.ts src/worldGen/serializer.spec.ts src/game/mechanics src/mods/topology/toggleOff.spec.ts src/app/SiteMap/lockPlayground.spec.tsx`
Expected: PASS.

Run: `yarn check-types && yarn lint && yarn lock stoneGate && yarn lock masonsRamp`
Expected: types and lint clean; `yarn lock` no longer lists "unladen passage" under what is not buildable.

- [ ] **Step 9: Commit**

```bash
git add src/game/passageRealisation.ts src/game/mechanics/unladen.ts src/game/mechanics/index.ts src/game/lockCompile.ts src/game/obstacles.ts src/worldGen/serializer.ts src/game/siteTypes.ts src/game/passages.ts src/game/encounterFallback.ts src/game/siteAssembler.ts src/mods/modDescriptor.ts src/mods/registeredMods.ts src/mods/allPassageRealisations.ts src/mods/topology/game/narrowPassage/meta.ts src/mods/topology/index.ts src/game/testSupport/modOff.ts src/game/testSupport/stoneFixtures.ts src/game/lockWalkSpec.ts src/app/SiteMap/useAssembledFloor.ts src/app/SiteMap/playgroundCarve.testing.ts src/game/passages.spec.ts src/game/passageRealisation.spec.ts src/game/lockCompile.spec.ts src/game/lockWalkSpec.spec.ts src/worldGen/serializer.spec.ts
git commit -m "feat(stones): a gate only empty hands open is bound as a narrow passage" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 3: Go through the crack

Play. The passage is never ground; a tap on its wall walks the explorer to his side and offers the crossing there,
or says why not while carrying; taking it lands him on the far side.

**Files:**
- Modify: `src/game/mechanismDoors.ts` (`openWaysOut` leaves a passage a door)
- Modify: `src/app/SiteMap/obstacleTraversal.ts` (`Traversal.via`)
- Modify: `src/app/SiteMap/clickTargets.ts` (a passage is offered as itself)
- Modify: `src/app/SiteMap/useSiteNavigation.ts` (the crossing)
- Modify: `public/locales/en/common.json`, `public/locales/nl/common.json` (`ui.prompt.squeeze`)
- Create: `src/app/SiteMap/narrowPassage.spec.tsx`
- Test: `src/game/passages.spec.ts` (openWaysOut), `src/i18n/keys.spec.ts`

**Interfaces:**
- Consumes: `passageCrossing`, `passageSides`, `headingOf` (`@/game/passages`); `resolvePassageRealisation`
  (`@/mods/allPassageRealisations`); `CRACK`, `PASSAGE_BINDING`, `passageAt`, `stoneFloor`, `plateNamed`
  (`@/game/testSupport/stoneFixtures`); `carvePlayground`, `PLAYGROUND_JOURNEY` (`./playgroundCarve.testing`);
  `sequenceHarness` (`./sequenceHarness.testing`).
- Produces: `Traversal.via?: readonly [number, number]` (a crossing through that cell; task 4 plays it as a squeeze);
  `NavigationArgs.resolvePassage?: ResolvePassageRealisation`; an `obstacle` prompt with
  `obstacleKind: "narrowPassage"`, `invitation: "ui.prompt.squeeze"` at the near side.

- [ ] **Step 1: Write the failing tests**

Append to `src/game/passages.spec.ts` (add `import { openWaysOut } from "./mechanismDoors"`):

```ts
describe("an open passage", () => {
  it("stays a door, so no walk ever stands in it", () => {
    const opened = openWaysOut(straight, new Set([KEY]))
    expect(opened.cells[0][1]).toEqual(straight.cells[0][1])
  })
})
```

Append to `src/i18n/keys.spec.ts`'s `describe` (add `import { MOD_ONE_WAY_REALISATIONS, MOD_PASSAGE_REALISATIONS } from "@/mods/registeredMods"`):

```ts
  /** **And so is the prompt a crossing names for itself**: a realisation's prompt reaches `t` as a variable too. */
  it("covers the prompt every crossing names for itself", () => {
    const en = shippedKeys("en")
    const nl = shippedKeys("nl")
    const prompts = [...MOD_ONE_WAY_REALISATIONS, ...MOD_PASSAGE_REALISATIONS].flatMap(meta =>
      meta.prompt ? [meta.prompt] : []
    )
    expect(prompts).not.toEqual([])
    expect(prompts.filter(key => !en.has(key))).toEqual([])
    expect(prompts.filter(key => !nl.has(key))).toEqual([])
  })
```

Create `src/app/SiteMap/narrowPassage.spec.tsx`:

```tsx
// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { findPath, revealAll, walkableFrom } from "@/game/gridNavigation"
import { passageSides } from "@/game/passages"
import type { FloorGrid } from "@/game/siteTypes"
import { CRACK, PASSAGE_BINDING, passageAt, plateNamed, stoneFloor } from "@/game/testSupport/stoneFixtures"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { buildRoomClaims } from "./roomClaims"
import { offeredTargets } from "./clickTargets"
import { PLAYGROUND_JOURNEY, carvePlayground } from "./playgroundCarve.testing"
import { sequenceHarness } from "./sequenceHarness.testing"
import { useSiteNavigation } from "./useSiteNavigation"
import "@/mods/registerModApps"

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const config = () => stoneFloor(CRACK, { realisations: PASSAGE_BINDING })

const carved = () => {
  const found = carvePlayground(config())
  if (!found.found) throw new Error(JSON.stringify(found.reasons))
  return found
}

/** The passage, the side reached from the way in, and the side beyond it. */
const sidesOf = (grid: FloorGrid) => {
  const at = passageAt(grid)
  const [a, b] = passageSides(grid, at[0], at[1])!
  const near = findPath(revealAll(grid), grid.entrancePos, a).length > 0 ? a : b
  return { at, near, far: near === a ? b : a }
}

const play = () => {
  const { seed, grid } = carved()
  return { ...sequenceHarness(seed, config()), grid, ...sidesOf(grid) }
}

const cross = async (h: ReturnType<typeof play>) => {
  h.walkTo(h.near)
  h.tap(h.at[0], h.at[1])
  await act(async () => h.current().prompt!.take())
  h.settle()
}

describe("a narrow passage", () => {
  it("is offered as itself while a side of it is ground the explorer can walk to", () => {
    const h = play()
    h.walkTo(h.near)
    const { grid, explorerPos } = h.current()
    expect(offeredTargets(grid!, buildRoomClaims(grid!), explorerPos).get(`${h.at[0]},${h.at[1]}`)).toEqual(h.at)
  })

  it("is never ground: open with empty hands, it is still a door no walk enters", () => {
    const h = play()
    h.walkTo(h.near)
    const { grid, explorerPos, openGateKeys } = h.current()
    const door = grid!.cells[h.at[0]][h.at[1]]
    expect(door.type === "room" && door.passage).toEqual({ realisation: "narrowPassage" })
    expect(door.type === "room" && door.requiredKeyId !== undefined && openGateKeys.has(door.requiredKeyId)).toBe(true)
    const walkable = walkableFrom(grid!, explorerPos)
    expect(walkable.has(`${h.at[0]},${h.at[1]}`)).toBe(false)
    expect(walkable.has(`${h.far[0]},${h.far[1]}`)).toBe(false)
  })

  it("a tap on the wall walks the explorer to his side of it and offers the crossing there", () => {
    const h = play()
    h.walkTo(h.near)
    h.tap(h.at[0], h.at[1])
    expect(h.current().explorerPos).toEqual(h.near)
    expect(h.current().prompt).toMatchObject({
      kind: "obstacle",
      at: h.near,
      obstacleKind: "narrowPassage",
      invitation: "ui.prompt.squeeze",
    })
  })

  it("taking the crossing lands him on the far side", async () => {
    const h = play()
    await cross(h)
    expect(h.current().explorerPos).toEqual(h.far)
  })

  it("from the far side, a tap on the wall brings him back", async () => {
    const h = play()
    await cross(h)
    h.tap(h.at[0], h.at[1])
    expect(h.current().prompt).toMatchObject({ kind: "obstacle", at: h.far })
    await act(async () => h.current().prompt!.take())
    h.settle()
    expect(h.current().explorerPos).toEqual(h.near)
  })

  it("a reload keeps him on the far side", async () => {
    const h = play()
    await cross(h)
    h.remount()
    expect(h.current().explorerPos).toEqual(h.far)
  })

  it("stops a carrying walk beside the wall, with the line that says why", () => {
    const h = play()
    h.walkTo(plateNamed(h.grid, "shelf"))
    act(() => h.current().prompt!.take())
    h.settle()
    h.tap(h.at[0], h.at[1])
    expect(h.current().explorerPos).toEqual(h.near)
    expect(h.current().prompt).toBeNull()
    expect(h.current().notice).toEqual({ at: h.near })
  })
})

describe("a crossing under way", () => {
  it("moves nobody on a tap until the crossing is over", async () => {
    const { seed, grid: base } = carved()
    const grid = revealAll(base)
    const { at, near } = sidesOf(grid)
    const journeys = {
      markCellExplored: vi.fn(),
      updatePosition: vi.fn(),
      getPurchasedShopSlots: () => new Set<string>(),
      getSkippedConsumables: () => new Set<string>(),
      getMechanismStates: vi.fn(() => new Map<string, string>()),
      setMechanismState: vi.fn(),
    } as unknown as JourneyAPI
    const playTraversal = vi.fn(() => new Promise<void>(() => {}))
    const hook = renderHook(() =>
      useSiteNavigation({
        journeys,
        journeyId: PLAYGROUND_JOURNEY,
        siteConfig: [config()],
        seed,
        currentFloor: 0,
        grid,
        explorerPos: near,
        onEncounter: () => {},
        onSkippedConsumable: () => {},
        onExitReached: () => {},
        playTraversal,
      })
    )
    act(() => hook.result.current.onCellClick(at[0], at[1]))
    act(() => void vi.advanceTimersByTime(5000))
    await act(async () => hook.result.current.prompt!.take())
    expect(playTraversal).toHaveBeenCalledWith(expect.objectContaining({ via: at }))
    vi.mocked(journeys.updatePosition).mockClear()
    act(() => hook.result.current.onCellClick(near[0], near[1]))
    act(() => void vi.advanceTimersByTime(5000))
    expect(journeys.updatePosition).not.toHaveBeenCalled()
    expect(hook.result.current.explorerHidden).toBe(true)
  })
})
```

`h.walkTo(h.near)` stops where no offer gets nearer; the tap on the wall then walks him the rest of the way, which is
what the assertions after it read. If `walkTo` never reaches a cell from which the wall is offered (the first test),
print `h.current().explorerPos` and the offers, and walk to the corridor cell before `h.near` instead; do not change
what is asserted.

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/passages.spec.ts src/i18n/keys.spec.ts src/app/SiteMap/narrowPassage.spec.tsx`
Expected: FAIL. `openWaysOut` turns the open passage into a corridor; `ui.prompt.squeeze` is in no locale file; no tap
on the wall is offered.

- [ ] **Step 3: The passage stays a door**

In `src/game/mechanismDoors.ts`, `openWaysOut`'s map callback gains, after its first guard line:

```ts
      // A NARROW PASSAGE IS NEVER GROUND: open, it is crossed by its prompt, never walked into (useSiteNavigation).
      if (cell.passage) return cell
```

- [ ] **Step 4: The prompt's words**

In `public/locales/en/common.json`, inside `ui.prompt`, after `"setStone": "Set the stone on the plate"` add
`"squeeze": "Go through the crack"` (comma on the line before). In `public/locales/nl/common.json`, after
`"setStone": "Leg de steen op de plaat"` add `"squeeze": "Wurm je door de muur"`.

- [ ] **Step 5: A crossing can pass through a cell**

In `src/app/SiteMap/obstacleTraversal.ts`, `Traversal` gains:

```ts
  /** The cell a crossing passes through on its way, where it is a wall's own (a narrow passage); unset for a span. */
  via?: readonly [number, number]
```

- [ ] **Step 6: The wall is offered as itself**

In `src/app/SiteMap/clickTargets.ts`, import `passageCrossing` from `@/game/passages`. In `clickTargetAt`, just before
the final room `return`, add:

```ts
  // A NARROW PASSAGE IS OFFERED AS ITSELF while a side of it is ground the player can walk to. The tap walks him to
  // that side and offers the crossing there (`useSiteNavigation`); he never stands in it, so this is the one offer
  // whose cell taking it does not put him on.
  if (cell.passage)
    return (cell.state === "reachable" || cell.state === "completed") &&
      passageCrossing(grid, r, c, ctx.canWalkTo) !== undefined
      ? ([r, c] as const)
      : null
```

(`cell` is a room at that point: the `empty`, fogged and corridor cases have returned above it.)

- [ ] **Step 7: The crossing**

In `src/app/SiteMap/useSiteNavigation.ts`:
- imports: add `walkableFrom` to the `@/game/gridNavigation` import; `import { headingOf, passageCrossing } from "@/game/passages"`; `import type { ResolvePassageRealisation } from "@/game/passageRealisation"`; `import { resolvePassageRealisation } from "@/mods/allPassageRealisations"`;
- `NavigationArgs` gains:

```ts
  /** Says what the passage a gate was dressed as declares: its prompt, and whether it takes both hands. */
  resolvePassage?: ResolvePassageRealisation
```

- the hook's destructuring gains `resolvePassage = resolvePassageRealisation,`, and `resolvePassage` joins the
  `onCellClick` dependency array;
- in `onCellClick`, directly after `setNotice(null)`, add:

```ts
      // A NARROW PASSAGE IS NEVER GROUND. A tap on its wall walks the explorer to the side he can reach and offers the
      // crossing there; nothing else takes him through. It stands only on a gate empty hands alone open, so with a
      // stone in hand it is shut, and a passage that takes both hands says why.
      if (cell.type === "room" && cell.passage) {
        const walkable = walkableFrom(grid, explorerPos)
        const crossing = passageCrossing(grid, row, col, (r, c) => walkable.has(`${r},${c}`))
        const near = crossing && getCell(grid, crossing.near[0], crossing.near[1])
        if (!crossing || !near || near.type === "empty") return
        const [nr, nc] = crossing.near
        const nearEdge = encodeEdge(currentFloor, nr, nc)
        const nearAddress = cellAddress(grid, currentFloor, nr, nc) ?? nearEdge
        for (const press of walkPresses(
          grid,
          currentFloor,
          findPath(grid, explorerPos, crossing.near),
          journeys.getMechanismStates(journeyId)
        ))
          journeys.setMechanismState(press.address, press.state)
        journeys.markCellExplored(near.sectionHash ?? "", nearEdge, nearAddress)
        journeys.updatePosition(journeyId, nearAddress, nearEdge)
        const passage = resolvePassage(crossing.realisation)
        if (isCarrying(grid, currentFloor, journeys.getMechanismStates(journeyId))) {
          if (passage?.handsFull) turnAway(nr, nc)
          return
        }
        const traversal: Traversal = {
          kind: crossing.realisation,
          from: crossing.near,
          to: crossing.far,
          dir: headingOf(crossing.via, crossing.far),
          via: crossing.via,
        }
        scheduleArrival(walkDelay(nr, nc), () =>
          offer("obstacle", nr, nc, () => void takeSpan(traversal), undefined, crossing.realisation, passage?.prompt)
        )
        return
      }
```

- [ ] **Step 8: Run the tests**

Run: `yarn vitest run src/game/passages.spec.ts src/i18n/keys.spec.ts src/app/SiteMap/narrowPassage.spec.tsx src/app/SiteMap/stoneWalk.spec.tsx src/app/SiteMap/movementInvariant.spec.ts src/app/SiteMap/tapAdmission.spec.ts src/app/SiteMap/clickTargets.spec.tsx src/app/SiteMap/oneWayPrompt.spec.tsx`
Expected: PASS.

Run: `yarn check-types && yarn lint`
Expected: clean.

- [ ] **Step 9: Commit**

```bash
git add src/game/mechanismDoors.ts src/app/SiteMap/obstacleTraversal.ts src/app/SiteMap/clickTargets.ts src/app/SiteMap/useSiteNavigation.ts public/locales/en/common.json public/locales/nl/common.json src/game/passages.spec.ts src/i18n/keys.spec.ts src/app/SiteMap/narrowPassage.spec.tsx
git commit -m "feat(stones): go through the crack, or be told a stone does not fit" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 4: The squeeze

The crossing plays like the zipline ride: the explorer is hidden and the squeezing pose slides through the wall's
cell, in two legs.

**Files:**
- Create: `src/app/SiteMap/useSqueeze.ts`
- Create: `src/app/SiteMap/SqueezeRider.tsx`
- Create: `src/app/SiteMap/useCrossing.ts`
- Modify: `src/app/SiteMap/SiteMapView.tsx` (`squeeze` prop, drawn beside the ride)
- Modify: `src/app/SiteMap/SiteMapScreen.tsx`, `src/app/SiteMap/lockPlayground.testing.tsx` (use `useCrossing`)
- Create: `src/app/SiteMap/useSqueeze.spec.ts`, `src/app/SiteMap/SqueezeRider.spec.tsx`, `src/app/SiteMap/useCrossing.spec.ts`

**Interfaces:**
- Consumes: `Traversal.via` (task 3); `headingOf` (`@/game/passages`); `CRACK`, `PASSAGE_BINDING`, `passageAt`
  (`@/game/testSupport/stoneFixtures`); `carveLockFloor` (`@/game/testSupport/lockFixtures`).
- Produces: `SQUEEZE_MS_PER_LEG = 350`; `type Squeeze = { traversal: Traversal & { via: readonly [number, number] }; msPerLeg: number; end: () => void }`; `squeezeSprite(dir: Direction): { url: string; mirrored: boolean } | undefined`; `useSqueeze(options?: { reducedMotion?: boolean; msPerLeg?: number }): { squeeze: Squeeze | null; playTraversal: PlayTraversal }` in `./useSqueeze`; `squeezeFoot(at: readonly [number, number]): { x: number; y: number }`, `SqueezeFigure: FC<{ dir: Direction }>`, `SqueezeRider: FC<{ squeeze: Squeeze }>` in `./SqueezeRider`; `useCrossing(options?: { reducedMotion?: boolean }): { ride: Ride | null; squeeze: Squeeze | null; playTraversal: PlayTraversal }` in `./useCrossing`; `SiteMapView`'s `squeeze?: Squeeze | null`.

- [ ] **Step 1: Write the failing tests**

Create `src/app/SiteMap/useSqueeze.spec.ts`:

```ts
// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Traversal } from "./obstacleTraversal"

const crack = (over: Partial<Traversal> = {}): Traversal => ({
  kind: "narrowPassage",
  from: [0, 0],
  via: [0, 1],
  to: [0, 2],
  dir: "e",
  ...over,
})

const hookWith = async (frames: Record<string, string[]>) => {
  vi.resetModules()
  vi.doMock("./tileAssets", async original => ({
    ...(await original<typeof import("./tileAssets")>()),
    sharedTileFrames: (prefix: string) => frames[prefix] ?? [],
  }))
  return await import("./useSqueeze")
}

describe("useSqueeze", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.doUnmock("./tileAssets")
  })

  it("holds the crossing until the squeeze ends", async () => {
    const { useSqueeze } = await hookWith({ "explorer-squeeze-e": ["e.png"] })
    const { result } = renderHook(() => useSqueeze())
    let landed = false
    act(() => void result.current.playTraversal(crack()).then(() => (landed = true)))
    expect(result.current.squeeze).toMatchObject({ traversal: { via: [0, 1] }, msPerLeg: 350 })
    await act(async () => result.current.squeeze!.end())
    expect(landed).toBe(true)
    expect(result.current.squeeze).toBeNull()
  })

  it("draws west with the east pose mirrored, and north with the south pose", async () => {
    const { squeezeSprite } = await hookWith({ "explorer-squeeze-e": ["e.png"], "explorer-squeeze-s": ["s.png"] })
    expect(squeezeSprite("w")).toEqual({ url: "e.png", mirrored: true })
    expect(squeezeSprite("n")).toEqual({ url: "s.png", mirrored: false })
    expect(squeezeSprite("s")).toEqual({ url: "s.png", mirrored: false })
  })

  it.each([
    ["a span with no wall to pass", { "explorer-squeeze-e": ["e.png"] }, crack({ via: undefined }), {}],
    ["a heading with no squeezing art", {}, crack(), {}],
    ["reduced motion", { "explorer-squeeze-e": ["e.png"] }, crack(), { reducedMotion: true }],
  ])("crosses at once for %s", async (_, frames, traversal, options) => {
    const { useSqueeze } = await hookWith(frames)
    const { result } = renderHook(() => useSqueeze(options))
    await act(async () => result.current.playTraversal(traversal))
    expect(result.current.squeeze).toBeNull()
  })

  it("ends a squeeze whose slide never reports its end", async () => {
    const { useSqueeze } = await hookWith({ "explorer-squeeze-e": ["e.png"] })
    const { result } = renderHook(() => useSqueeze())
    let landed = false
    act(() => void result.current.playTraversal(crack()).then(() => (landed = true)))
    await act(async () => vi.advanceTimersByTime(350 * 2 + 250))
    expect(landed).toBe(true)
  })

  it("ends a squeeze that is taken off the map mid-slide", async () => {
    const { useSqueeze } = await hookWith({ "explorer-squeeze-e": ["e.png"] })
    const { result, unmount } = renderHook(() => useSqueeze())
    let landed = false
    act(() => void result.current.playTraversal(crack()).then(() => (landed = true)))
    unmount()
    await act(async () => {})
    expect(landed).toBe(true)
  })
})
```

Create `src/app/SiteMap/SqueezeRider.spec.tsx`:

```tsx
// @vitest-environment jsdom
import { act, fireEvent, render } from "@testing-library/react"
import { StrictMode } from "react"
import { describe, expect, it, vi } from "vitest"
import { revealAll } from "@/game/gridNavigation"
import { parseLock } from "@/game/lockNotation"
import { passageSides } from "@/game/passages"
import { carveLockFloor } from "@/game/testSupport/lockFixtures"
import { CRACK, PASSAGE_BINDING, passageAt } from "@/game/testSupport/stoneFixtures"
import { SqueezeRider, squeezeFoot } from "./SqueezeRider"
import { sharedTileFrames } from "./tileAssets"
import type { Squeeze } from "./useSqueeze"

// jsdom has no scrollTo; the map scrolls itself to the explorer on mount.
Element.prototype.scrollTo = Element.prototype.scrollTo ?? (() => {})
const SEEDS = Array.from({ length: 60 }, (_, n) => n)

const squeeze = (over: Partial<Squeeze["traversal"]> = {}): Squeeze => ({
  traversal: { kind: "narrowPassage", from: [1, 0], via: [1, 1], to: [1, 2], dir: "e", ...over },
  msPerLeg: 350,
  end: vi.fn(),
})
const px = (v: string) => Number.parseFloat(v)
const riderOf = (c: HTMLElement) => c.querySelector("[data-squeeze-rider]") as HTMLElement
const spriteOf = (c: HTMLElement) => c.querySelector("[data-squeeze-sprite]") as HTMLElement
const at = (el: HTMLElement) => ({ x: px(el.style.left), y: px(el.style.top) })

describe("SqueezeRider", () => {
  it("starts on the near side's foot line, then moves into the wall's cell", async () => {
    const { container } = render(<SqueezeRider squeeze={squeeze()} />)
    expect(at(riderOf(container))).toEqual(squeezeFoot([1, 0]))
    await act(async () => new Promise(requestAnimationFrame))
    expect(at(riderOf(container))).toEqual(squeezeFoot([1, 1]))
  })

  it("goes on to the far side when the first leg ends, and ends the crossing when the second does", async () => {
    const s = squeeze()
    const { container } = render(<SqueezeRider squeeze={s} />)
    await act(async () => new Promise(requestAnimationFrame))
    fireEvent.transitionEnd(riderOf(container))
    expect(at(riderOf(container))).toEqual(squeezeFoot([1, 2]))
    expect(s.end).not.toHaveBeenCalled()
    fireEvent.transitionEnd(riderOf(container))
    expect(s.end).toHaveBeenCalledTimes(1)
  })

  it("turns with the crack at a corner: the second leg wears its own heading", async () => {
    const s = squeeze({ from: [0, 1], via: [1, 1], to: [1, 2], dir: "e" })
    const { container } = render(<SqueezeRider squeeze={s} />)
    expect(spriteOf(container).dataset.squeezeSprite).toBe("s")
    await act(async () => new Promise(requestAnimationFrame))
    fireEvent.transitionEnd(riderOf(container))
    expect(spriteOf(container).dataset.squeezeSprite).toBe("e")
  })

  it("draws the painting at half its size, bottom-centred, and mirrors it going west", () => {
    const east = render(<SqueezeRider squeeze={squeeze()} />)
    expect(spriteOf(east.container).style.transform).toBe("translateX(-50%) scale(0.5, 0.5)")
    expect(east.container.querySelector("img")!.getAttribute("src")).toBe(sharedTileFrames("explorer-squeeze-e")[0])
    const west = render(<SqueezeRider squeeze={squeeze({ from: [1, 2], to: [1, 0], dir: "w" })} />)
    expect(spriteOf(west.container).style.transform).toBe("translateX(-50%) scale(-0.5, 0.5)")
  })

  it("ignores a transition that bubbles up from inside the rider", () => {
    const s = squeeze()
    const { container } = render(<SqueezeRider squeeze={s} />)
    fireEvent.transitionEnd(container.querySelector("img")!)
    expect(s.end).not.toHaveBeenCalled()
  })

  it("does not end the crossing on StrictMode's simulated unmount", () => {
    const s = squeeze()
    render(
      <StrictMode>
        <SqueezeRider squeeze={s} />
      </StrictMode>
    )
    expect(s.end).not.toHaveBeenCalled()
  })
})

describe("SqueezeRider on the map", () => {
  it("is drawn while a squeeze plays", async () => {
    const { SiteMapView } = await import("./SiteMapView")
    const grid = revealAll(carveLockFloor(parseLock(CRACK, "stones").lock, PASSAGE_BINDING, SEEDS))
    const wall = passageAt(grid)
    const [near, far] = passageSides(grid, wall[0], wall[1])!
    const { container } = render(
      <SiteMapView
        grid={grid}
        explorerPos={near}
        explorerHidden
        squeeze={{
          traversal: { kind: "narrowPassage", from: near, via: wall, to: far, dir: "e" },
          msPerLeg: 350,
          end: () => {},
        }}
      />
    )
    expect(container.querySelector("[data-squeeze-rider]")).not.toBeNull()
  })
})
```

Create `src/app/SiteMap/useCrossing.spec.ts`:

```ts
// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useCrossing } from "./useCrossing"

describe("useCrossing", () => {
  it("plays a crossing through a wall's cell as a squeeze, and a span as a ride", () => {
    const { result } = renderHook(() => useCrossing({ reducedMotion: false }))
    act(() => void result.current.playTraversal({ kind: "narrowPassage", from: [0, 0], via: [0, 1], to: [0, 2], dir: "e" }))
    expect(result.current.squeeze).not.toBeNull()
    expect(result.current.ride).toBeNull()
    act(() => void result.current.playTraversal({ kind: "zipline", from: [2, 0], to: [2, 6], dir: "e" }))
    expect(result.current.ride).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/app/SiteMap/useSqueeze.spec.ts src/app/SiteMap/SqueezeRider.spec.tsx src/app/SiteMap/useCrossing.spec.ts`
Expected: FAIL, the three modules do not exist.

- [ ] **Step 3: The squeeze's state**

Create `src/app/SiteMap/useSqueeze.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from "react"
import type { Direction } from "@/game/siteTypes"
import type { PlayTraversal, Traversal } from "./obstacleTraversal"
import { sharedTileFrames } from "./tileAssets"

/** How long each half of a squeeze takes: into the crack, and out of it on the far side. */
export const SQUEEZE_MS_PER_LEG = 350

export type Squeeze = { traversal: Traversal & { via: readonly [number, number] }; msPerLeg: number; end: () => void }

/** The squeezing pose for a heading: east's mirrored for west, south's for north. Undefined while that pose is not
 * painted. */
export const squeezeSprite = (dir: Direction): { url: string; mirrored: boolean } | undefined => {
  const url = sharedTileFrames(`explorer-squeeze-${dir === "w" ? "e" : dir === "n" ? "s" : dir}`)[0]
  return url ? { url, mirrored: dir === "w" } : undefined
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches

/**
 * A CROSSING THROUGH A WALL'S CELL, PLAYED AS A SQUEEZE: `playTraversal` holds the crossing while `squeeze` is drawn,
 * and `squeeze.end` (the second leg's end, or a fallback timer when the slide never reports one) lands the player.
 * A span with no wall to pass, a heading with no squeezing art, or a player who asked for less motion, is crossed at
 * once.
 */
export const useSqueeze = ({
  reducedMotion: asked,
  msPerLeg = SQUEEZE_MS_PER_LEG,
}: { reducedMotion?: boolean; msPerLeg?: number } = {}) => {
  const [systemReduced] = useState(prefersReducedMotion)
  const reducedMotion = asked ?? systemReduced
  const [squeeze, setSqueeze] = useState<Squeeze | null>(null)
  const ending = useRef<(() => void) | null>(null)
  // A squeeze taken off the map still lands the player. At mount nothing plays, so StrictMode's unmount is a no-op.
  useEffect(() => () => ending.current?.(), [])
  const playTraversal: PlayTraversal = useCallback(
    traversal => {
      const via = traversal.via
      if (!via || !squeezeSprite(traversal.dir) || reducedMotion) return Promise.resolve()
      return new Promise<void>(resolve => {
        const end = () => {
          if (ending.current !== end) return
          ending.current = null
          clearTimeout(fallback)
          setSqueeze(null)
          resolve()
        }
        // A slide that never reports its end (a hidden tab) still lands the player.
        const fallback = setTimeout(end, msPerLeg * 2 + 250)
        ending.current = end
        setSqueeze({ traversal: { ...traversal, via }, msPerLeg, end })
      })
    },
    [reducedMotion, msPerLeg]
  )
  return { squeeze, playTraversal }
}
```

- [ ] **Step 4: The squeeze, drawn**

Create `src/app/SiteMap/SqueezeRider.tsx`:

```tsx
import { useLayoutEffect, useRef, useState } from "react"
import { headingOf } from "@/game/passages"
import type { Direction } from "@/game/siteTypes"
import { FIGURE_LIT, FOOT_LIFT, TorchGlow } from "./ExplorerDot"
import { CELL, cellCenter } from "./mapScale"
import { squeezeSprite, type Squeeze } from "./useSqueeze"

/** Where the explorer's feet are on a cell: its centre, down to the line he stands on. */
export const squeezeFoot = (at: readonly [number, number]) => {
  const { cx, cy } = cellCenter(at[0], at[1])
  return { x: cx, y: cy + CELL / 2 - FOOT_LIFT }
}

/**
 * THE EXPLORER SQUEEZING, one heading, hung from the point his feet stand on. The pose is painted at twice map scale,
 * so it is drawn at half its own size, bottom-centred on the foot line, whatever size it was imported at. The torch's
 * light is his as on every other pose.
 */
export const SqueezeFigure = ({ dir }: { dir: Direction }) => {
  const sprite = squeezeSprite(dir)
  if (!sprite) return null
  return (
    <>
      <div style={{ position: "absolute", left: 0, top: 0, transform: `translateY(${FOOT_LIFT - CELL / 2}px)` }}>
        <TorchGlow />
      </div>
      <div
        data-squeeze-sprite={dir}
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          lineHeight: 0,
          transform: `translateX(-50%) scale(${sprite.mirrored ? -0.5 : 0.5}, 0.5)`,
          transformOrigin: "50% 100%",
          filter: FIGURE_LIT,
        }}
      >
        <img src={sprite.url} alt="" />
      </div>
    </>
  )
}

type Leg = "from" | "via" | "to"

/**
 * THE SQUEEZE: the pose stands on the near side, slides into the wall's cell, then out to the far side, one CSS
 * transition per leg. The second leg's end is the crossing's end. Each leg wears its own heading, so a crack at a
 * corner turns the explorer with it.
 */
export const SqueezeRider = ({ squeeze }: { squeeze: Squeeze }) => {
  const { from, via, to } = squeeze.traversal
  const [leg, setLeg] = useState<Leg>("from")
  const el = useRef<HTMLDivElement>(null)
  // Start on the near side, then move on the next frame so the browser has a start to transition from.
  useLayoutEffect(() => {
    void el.current?.offsetWidth
    const frame = requestAnimationFrame(() => setLeg("via"))
    return () => cancelAnimationFrame(frame)
  }, [squeeze])
  const { x, y } = squeezeFoot(leg === "from" ? from : leg === "via" ? via : to)
  return (
    <div
      ref={el}
      data-squeeze-rider={leg}
      onTransitionEnd={e => {
        if (e.target !== e.currentTarget) return
        if (leg === "via") setLeg("to")
        else if (leg === "to") squeeze.end()
      }}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 0,
        height: 0,
        pointerEvents: "none",
        transition: `left ${squeeze.msPerLeg}ms linear, top ${squeeze.msPerLeg}ms linear`,
      }}
    >
      <SqueezeFigure dir={leg === "to" ? headingOf(via, to) : headingOf(from, via)} />
    </div>
  )
}
```

- [ ] **Step 5: One seam for every crossing**

Create `src/app/SiteMap/useCrossing.ts`:

```ts
import { useCallback } from "react"
import type { PlayTraversal } from "./obstacleTraversal"
import { useSqueeze } from "./useSqueeze"
import { useZiplineRide } from "./useZiplineRide"

/** EVERY CROSSING THE MAP DRAWS, behind the one seam navigation plays through: a crossing through a wall's cell
 * (`via`) is a squeeze, any other span a ride. */
export const useCrossing = (options: { reducedMotion?: boolean } = {}) => {
  const { ride, playTraversal: playRide } = useZiplineRide(options)
  const { squeeze, playTraversal: playSqueeze } = useSqueeze(options)
  const playTraversal: PlayTraversal = useCallback(
    traversal => (traversal.via ? playSqueeze(traversal) : playRide(traversal)),
    [playRide, playSqueeze]
  )
  return { ride, squeeze, playTraversal }
}
```

- [ ] **Step 6: Wire it in**

In `src/app/SiteMap/SiteMapView.tsx`: import `{ SqueezeRider }` from `./SqueezeRider` and `type { Squeeze }` from
`./useSqueeze`; `Props` gains, after `rideFrame`:

```ts
  /** A narrow passage being squeezed through: drawn as two slides beside the explorer, who is hidden meanwhile. */
  squeeze?: Squeeze | null
```

destructure `squeeze` in `SiteMapView`, and directly after the `{ride && (rideFrame ? … : …)}` block add:

```tsx
              {squeeze && <SqueezeRider squeeze={squeeze} />}
```

In `src/app/SiteMap/SiteMapScreen.tsx`: replace `import { useZiplineRide } from "./useZiplineRide"` with
`import { useCrossing } from "./useCrossing"`, `const { ride, playTraversal } = useZiplineRide()` with
`const { ride, squeeze, playTraversal } = useCrossing()`, and pass `squeeze={squeeze}` to `SiteMapView` after
`ride={ride}`. Make the same three edits in `src/app/SiteMap/lockPlayground.testing.tsx`.

- [ ] **Step 7: Run the tests**

Run: `yarn vitest run src/app/SiteMap/useSqueeze.spec.ts src/app/SiteMap/SqueezeRider.spec.tsx src/app/SiteMap/useCrossing.spec.ts src/app/SiteMap/ZiplineRider.spec.tsx src/app/SiteMap/useZiplineRide.spec.ts src/app/SiteMap/SiteMapScreen.spec.tsx src/app/SiteMap/lockPlayground.spec.tsx`
Expected: PASS.

Run: `yarn check-types && yarn lint`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add src/app/SiteMap/useSqueeze.ts src/app/SiteMap/SqueezeRider.tsx src/app/SiteMap/useCrossing.ts src/app/SiteMap/SiteMapView.tsx src/app/SiteMap/SiteMapScreen.tsx src/app/SiteMap/lockPlayground.testing.tsx src/app/SiteMap/useSqueeze.spec.ts src/app/SiteMap/SqueezeRider.spec.tsx src/app/SiteMap/useCrossing.spec.ts
git commit -m "feat(stones): the explorer squeezes through the crack" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 5: The wall on the map, staged and played in Storybook

**Files:**
- Create: `src/app/SiteMap/passageArt.ts` (`passageTile`, `passageArtUrl`)
- Modify: `src/app/SiteMap/SiteMapView.tsx` (`nodeSpritesFor` draws the wall)
- Create: `src/app/SiteMap/NarrowPassage.stories.tsx` (`Topology/NarrowPassage`)
- Modify: `src/app/SiteMap/LockPlayground.stories.tsx` (`SqueezeThrough`)
- Create: `src/app/SiteMap/passageDrawing.spec.tsx`

**Interfaces:**
- Consumes: `RoomCell.passage`, `resolvePassageRealisation` (task 2); `SqueezeFigure` (task 4); `CRACK`,
  `PASSAGE_BINDING`, `passageAt` (task 2).
- Produces: `passageTile(cell: RoomCell, resolve?: ResolvePassageRealisation): string | undefined`,
  `passageArtUrl(cell: RoomCell): string | undefined` in `./passageArt`; a node sprite keyed `passage:<r>,<c>`.

- [ ] **Step 1: Write the failing tests**

Create `src/app/SiteMap/passageDrawing.spec.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { revealAll } from "@/game/gridNavigation"
import { parseLock } from "@/game/lockNotation"
import type { Direction, RoomCell } from "@/game/siteTypes"
import { carveLockFloor } from "@/game/testSupport/lockFixtures"
import { CRACK, PASSAGE_BINDING, passageAt } from "@/game/testSupport/stoneFixtures"
import { passageArtUrl, passageTile } from "./passageArt"
import { buildRoomClaims } from "./roomClaims"
import { nodeSpritesFor } from "./SiteMapView"
import { sharedTileUrl } from "./tileAssets"
import "@/mods/registerModApps"

const SEEDS = Array.from({ length: 60 }, (_, n) => n)

const crack = (dirs: Direction[], realisation = "narrowPassage"): RoomCell => ({
  type: "room",
  roomType: "encounter",
  dirs: new Set(dirs),
  state: "reachable",
  tags: ["gate"],
  requiredKeyId: "obstacle:spec#0#0:crack",
  passage: { realisation },
})

describe("a passage's tile", () => {
  it.each([
    [["n", "s"], "narrowAcross"],
    [["e", "w"], "narrowAlong"],
    [["e", "s"], "narrowAcross"],
    [["n", "w"], "narrowAcross"],
  ] as const)("for ways %j is %s", (dirs, tile) => {
    expect(passageTile(crack([...dirs]))).toBe(tile)
  })

  it("is none for a passage no registered mod declares", () => {
    expect(passageTile(crack(["n", "s"], "lava"))).toBeUndefined()
  })

  it("is the shared painting, the same at every rank", () => {
    expect(passageArtUrl(crack(["n", "s"]))).toBe(sharedTileUrl("narrowAcross"))
  })
})

describe("a passage on the map", () => {
  const grid = revealAll(carveLockFloor(parseLock(CRACK, "stones").lock, PASSAGE_BINDING, SEEDS))
  const [r, c] = passageAt(grid)
  const sprites = nodeSpritesFor(grid, buildRoomClaims(grid), "expert", undefined, new Map(), 0)

  it("is drawn as its wall, in its own cell, and as no gate's leaf", () => {
    const wall = sprites.find(sprite => sprite.key === `passage:${r},${c}`)
    expect(wall?.url).toBe(passageArtUrl(grid.cells[r][c] as RoomCell))
    expect(sprites.filter(sprite => sprite.key === `gate:${r},${c}` || sprite.key === `wall:${r},${c}`)).toEqual([])
  })

  it("fades while the explorer stands behind it", () => {
    expect(sprites.find(sprite => sprite.key === `passage:${r},${c}`)?.fadeAt).toEqual([`${r},${c}`, `${r - 1},${c}`])
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/app/SiteMap/passageDrawing.spec.tsx`
Expected: FAIL, `./passageArt` does not exist.

- [ ] **Step 3: Which painting**

Create `src/app/SiteMap/passageArt.ts`:

```ts
import type { ResolvePassageRealisation } from "@/game/passageRealisation"
import type { RoomCell } from "@/game/siteTypes"
import { resolvePassageRealisation } from "@/mods/allPassageRealisations"
import { sharedTileUrl } from "./tileAssets"

/** The shared tile a passage is drawn with: its realisation's wall across a way running north-south, and along one
 * running east-west. A passage at a corner shows its face, as one across does. Undefined where the realisation
 * declares no art, or no registered mod declares it. */
export const passageTile = (
  cell: RoomCell,
  resolve: ResolvePassageRealisation = resolvePassageRealisation
): string | undefined => {
  const art = cell.passage && resolve(cell.passage.realisation)?.art
  if (!art) return undefined
  return cell.dirs.has("n") || cell.dirs.has("s") ? art.across : art.along
}

/** The passage's painting, shared by every rank. */
export const passageArtUrl = (cell: RoomCell): string | undefined => {
  const name = passageTile(cell)
  return name === undefined ? undefined : sharedTileUrl(name)
}
```

- [ ] **Step 4: The wall in `nodeSpritesFor`**

In `src/app/SiteMap/SiteMapView.tsx`, import `{ passageArtUrl }` from `./passageArt`, and in `nodeSpritesFor` insert
before `} else if (kind === "gate" && cell.regionBarrier) {`:

```tsx
      } else if (kind === "gate" && cell.passage) {
        // A NARROW PASSAGE IS A WALL STANDING IN ITS OWN CELL, a crack in it: drawn in the cell-wide prop frame like a
        // plate, never hung on a seam like a gate's leaf, and the same at every rank. Nobody stands in it; it fades
        // while the explorer waits on the cell behind it. Unpainted, it is drawn as the shut gate it is to the walk.
        const url = passageArtUrl(cell)
        if (url)
          out.push({
            footprint,
            key: `passage:${r},${c}`,
            url,
            x: cx - CELL / 2,
            y: cy + CELL / 2 - PROP_H,
            mirrored: false,
            fadeAt: [`${r},${c}`, `${r - 1},${c}`],
            ...(cell.mark ? { mark: cell.mark } : {}),
          })
        else gateLeaf(r, c, tier, cell.dirs, { open: false, wall: true, mark: cell.mark })
```

- [ ] **Step 5: Run the tests**

Run: `yarn vitest run src/app/SiteMap/passageDrawing.spec.tsx src/app/SiteMap/SiteMapView.spec.tsx src/app/SiteMap/plateDrawing.spec.tsx src/app/SiteMap/openGate.spec.tsx`
Expected: PASS.

- [ ] **Step 6: The staging story**

Create `src/app/SiteMap/NarrowPassage.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite"
import type { FC, ReactNode } from "react"
import type { Direction } from "@/game/siteTypes"
import { ExplorerFigure, FOOT_LIFT } from "./ExplorerDot"
import { OCCLUDER_FADE } from "./htmlLayers"
import { CELL, PROP_H, WALL_H } from "./mapScale"
import { SqueezeFigure } from "./SqueezeRider"
import { ART_IMAGE_RENDERING, sharedTileUrl, tileUrl } from "./tileAssets"
import { tierPalette } from "./tileMaterials"

// The narrow passage is one painting per orientation, shared by every rank (`tiles/default/`): `narrowAcross`, the
// wall's face across a north-south way, and `narrowAlong`, its top across an east-west way. The map draws it in the
// passage's own cell (`nodeSpritesFor`); the explorer waits on the cell either side and squeezes through the crack
// (`SqueezeRider`). Staged on a 3x3 patch of two ranks' floors at map scale, zoomed as a whole: the explorer on both
// sides of each wall (the wall faded while he stands behind it, as the map fades it), then the squeezing poses.

type Explorer = { at: readonly [number, number]; facing: Direction }
const STAGES: { name: string; wall: "narrowAcross" | "narrowAlong"; explorer: Explorer; behind: boolean }[] = [
  { name: "across, explorer north (behind)", wall: "narrowAcross", explorer: { at: [0, 1], facing: "s" }, behind: true },
  { name: "across, explorer south", wall: "narrowAcross", explorer: { at: [2, 1], facing: "n" }, behind: false },
  { name: "along, explorer west", wall: "narrowAlong", explorer: { at: [1, 0], facing: "e" }, behind: false },
  { name: "along, explorer east", wall: "narrowAlong", explorer: { at: [1, 2], facing: "w" }, behind: false },
]

// One cell's centre on the patch: rows a cell apart under a wall band, as the Plate story lays them.
const centre = ([r, c]: readonly [number, number]) => ({ x: CELL * (c + 0.5), y: WALL_H + CELL * (r + 0.5) })

const Patch: FC<{ tier: "starter" | "expert"; zoom: number; children: ReactNode; caption: string }> = ({
  tier,
  zoom,
  children,
  caption,
}) => {
  const floor = tileUrl(tier, "floor")
  return (
    <figure className="m-0 flex flex-col gap-1">
      <div
        className="relative overflow-hidden"
        style={{
          width: CELL * 3 * zoom,
          height: (WALL_H + CELL * 3) * zoom,
          background: floor ? `url(${floor})` : tierPalette[tier].slab,
          backgroundSize: `${CELL * 8 * zoom}px ${CELL * 8 * zoom}px`,
          imageRendering: ART_IMAGE_RENDERING,
        }}
      >
        <div
          className="absolute"
          style={{ left: 0, top: 0, width: CELL * 3, height: WALL_H + CELL * 3, transform: `scale(${zoom})`, transformOrigin: "0 0" }}
        >
          {children}
        </div>
      </div>
      <figcaption className="text-[10px] text-white/70">
        {tier}, {zoom}x: {caption}
      </figcaption>
    </figure>
  )
}

const Wall: FC<{ name: string; faded: boolean }> = ({ name, faded }) => {
  const src = sharedTileUrl(name)
  const { x, y } = centre([1, 1])
  return src ? (
    <img
      src={src}
      alt={name}
      className="absolute"
      style={{ left: x - CELL / 2, top: y + CELL / 2 - PROP_H, width: CELL, height: PROP_H, opacity: faded ? OCCLUDER_FADE : 1 }}
    />
  ) : null
}

const Standing: FC<Explorer> = ({ at, facing }) => {
  const { x, y } = centre(at)
  return (
    <div className="absolute" style={{ left: x, top: y, width: 0, height: 0 }}>
      <ExplorerFigure facing={facing} />
    </div>
  )
}

// Hung from the wall's cell's foot line, as `SqueezeRider` hangs it mid-crossing.
const Squeezing: FC<{ dir: Direction }> = ({ dir }) => {
  const { x, y } = centre([1, 1])
  return (
    <div className="absolute" style={{ left: x, top: y + CELL / 2 - FOOT_LIFT, width: 0, height: 0 }}>
      <SqueezeFigure dir={dir} />
    </div>
  )
}

const PassageSheet: FC<{ zoom: number }> = ({ zoom }) => (
  <div className="flex h-screen flex-col gap-4 overflow-auto bg-neutral-900 p-6">
    {(["starter", "expert"] as const).map(tier => (
      <div key={tier} className="flex flex-col gap-2">
        <h2 className="m-0 text-sm text-white/80">{tier}: the wall, the explorer either side</h2>
        <div className="flex flex-wrap gap-4">
          {STAGES.map(({ name, wall, explorer, behind }) => (
            <Patch key={name} tier={tier} zoom={zoom} caption={name}>
              {behind && <Standing {...explorer} />}
              <Wall name={wall} faded={behind} />
              {!behind && <Standing {...explorer} />}
            </Patch>
          ))}
        </div>
        <h2 className="m-0 text-sm text-white/80">{tier}: squeezing, each heading, in the wall's cell</h2>
        <div className="flex flex-wrap gap-4">
          {(["n", "s", "e", "w"] as const).map(dir => (
            <Patch key={dir} tier={tier} zoom={zoom} caption={`squeezing ${dir}`}>
              <Wall name={dir === "n" || dir === "s" ? "narrowAcross" : "narrowAlong"} faded={false} />
              <Squeezing dir={dir} />
            </Patch>
          ))}
        </div>
      </div>
    ))}
  </div>
)

const meta = {
  title: "Topology/NarrowPassage",
  component: PassageSheet,
  parameters: { layout: "fullscreen" },
  argTypes: { zoom: { control: { type: "range", min: 1, max: 6, step: 1 } } },
  args: { zoom: 3 },
} satisfies Meta<typeof PassageSheet>

export default meta
type Story = StoryObj<typeof meta>

/** Map scale: one cell is 56 wide, as the renderer draws it. */
export const MapScale: Story = { args: { zoom: 1 } }

/** Three times map scale, to see the paint. */
export const Zoomed: Story = { args: { zoom: 3 } }
```

In `src/app/SiteMap/LockPlayground.stories.tsx`, append:

```tsx
// A made-up lock for the narrow passage: a stone on a shelf by the way in, and a crack in a wall on to the way out.
// With empty hands, tap the wall to squeeze through; lift the stone first and the explorer stops beside the wall.
export const SqueezeThrough: Story = {
  args: {
    locks: { crack: "in -[unladen]- out\nshelf plate @in stone\nin ?\nout ?" },
    initial: "crack",
  },
}
```

- [ ] **Step 7: Look at it**

Start Storybook in the background and wait for it:

```bash
yarn storybook > /tmp/sb-phase3.log 2>&1 &
until curl -s -o /dev/null http://localhost:6006/iframe.html; do sleep 2; done
```

Take the screenshots:

```bash
npx -y playwright screenshot --wait-for-timeout=5000 --viewport-size=1600,1400 "http://localhost:6006/iframe.html?id=topology-narrowpassage--zoomed&viewMode=story" /tmp/narrow-3x.png
npx -y playwright screenshot --wait-for-timeout=5000 --viewport-size=1600,1000 "http://localhost:6006/iframe.html?id=topology-narrowpassage--map-scale&viewMode=story" /tmp/narrow-1x.png
npx -y playwright screenshot --wait-for-timeout=8000 --viewport-size=1400,1100 "http://localhost:6006/iframe.html?id=topology-lock-playground--squeeze-through&viewMode=story" /tmp/crack-playground.png
```

Read each PNG and record in the report: both walls read at 1x (the crack a black slit across, a dark spot along);
the explorer north of `narrowAcross` stands behind a faded wall; on each side he is the walking size; the squeezing
poses stand on the foot line at about the walking figure's head height (`e` and `w` wider than the box, `w` the
mirror of `e`, `n` the same pose as `s`); in the playground the passage is drawn in its cell with no gate leaf and no
marker on it. Stop Storybook (`kill %1`, or the PID in `jobs -l`). Describe; do not judge: the designer judges.

- [ ] **Step 8: Run the checks**

Run: `yarn check-types && yarn lint`
Expected: clean.

- [ ] **Step 9: Commit**

```bash
git add src/app/SiteMap/passageArt.ts src/app/SiteMap/SiteMapView.tsx src/app/SiteMap/NarrowPassage.stories.tsx src/app/SiteMap/LockPlayground.stories.tsx src/app/SiteMap/passageDrawing.spec.tsx
git commit -m "feat(stones): the narrow passage drawn as its wall, staged in Storybook" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 6: The contract, the spec and the roadmap say so; the world stays put

**Files:**
- Modify: `docs/mods/mechanic-contract.md` (§3.2 Stones on plates; §5 Binding a realisation)
- Modify: `docs/mods/ARCHITECTURE.md` (the kinds and realisations table)
- Modify: `docs/superpowers/specs/2026-10-04-stones-acceptance.md` (tick what holds)
- Modify: `docs/superpowers/plans/2026-10-06-stonegate-roadmap.md` (phase 3 done; open items)
- Modify: `docs/playtest-backlog.md` (an entry)
- Modify: `src/data/carveLedger.json` (hash refresh)
- `CHANGELOG.md`: no entry (rulings).

- [ ] **Step 1: The contract.** In `docs/mods/mechanic-contract.md` §3.2, add, in the voice of the surrounding
  bullets (current rule and why):
  - **A narrow passage.** A gate whose only owner is `unladen`, alone on its connection, binds under `unladen` to a
    passage realisation (`narrowPassage`, topology mod), which draws it as a wall with a crack in one cell. It is a
    gate to every walk and never ground in play: a tap on the wall walks the explorer to the side he can reach and
    offers "Go through the crack"; a carrying walk stops there with the one blocked line. A gate `unladen` shares
    with a plate or a mechanic stays a door.
  - **A drop that takes empty hands** is written `-[unladen]- >>`: the gate is the drop's own condition
    (`OneWayObstacle.unladen`), and every walk takes such a drop only with empty hands.
  In §5, after the `handsFull` paragraph, add: a passage realisation declares its prompt and may declare `handsFull`
  and its art; on a floor whose locks hold stones, a one-way realisation declaring `handsFull` bound to a drop the lock
  lets a stone ride is refused (`stonePasses`), so play never turns back a walk the solver takes.

- [ ] **Step 2: The architecture table.** In `docs/mods/ARCHITECTURE.md`, edit the two table rows by line (Prettier
  reflows tables: read the result back): the core row lists the kinds `toggle, activator, sequence, fork-switch,
  one-way, weights, unladen`; the mod row lists "the zipline, water and sand, the stone plate, the narrow passage" and
  `families`, `oneWayRealisations`, `regionBarrierRealisations`, `passageRealisations` of the descriptor.

- [ ] **Step 3: The spec.** In `docs/superpowers/specs/2026-10-04-stones-acceptance.md`: tick §3's "An `unladen`
  passage binds to a realisation like any gate" and "On a floor with stones, binding a zipline or a narrow passage
  where the lock lets a stone through … is refused". Replace §4's open box
  "(phase 3: the narrow passage declares its refusal through `handsFull`) A walk that crosses …" with:

  ```markdown
  - [x] A walk that crosses an `unladen` passage while carrying **stops on the near side** and says why, in the one
        blocked line every such place uses ("Cannot pass with a stone"; designer, 2026-10-07).
  ```

- [ ] **Step 4: The roadmap.** In `docs/superpowers/plans/2026-10-06-stonegate-roadmap.md` (edit the table row by
  line and read it back): phase 3's row says "(done 2026-10-08, [plan](2026-10-08-stonegate-phase-3-narrow-passage.md))"
  after **Narrow passage**. Replace the "**Phase 3:**" bullet of "Open per phase" with an "## Open after phase 3"
  section (above "## Open per phase") holding:
  - masonsRamp: its chute is a drop a stone rides, and the only one-way realisation (the zipline) needs both hands,
    so binding it is refused `stonePasses`; it needs a one-way realisation a stone may ride (a chute), which no mod has;
  - counterweight: record what `yarn lock counterweight` reports now that `-[unladen]- >>` compiles;
  - a passage on a corner draws `narrowAcross`; there is no corner art;
  - the squeeze is drawn in front of the wall, not through it;
  - where a gate loop makes both sides of a passage walkable (phase 4), the crossing starts from the first side in
    the cell's `dirs`.
  Point the remaining phase 6 bullet's "narrow passage for `unladen`" at the binding key: `unladen: "narrowPassage"`.

- [ ] **Step 5: The playtest backlog.** Add at the top of `docs/playtest-backlog.md` (below the intro paragraph):

```markdown
## stoneGate phase 3 — the narrow passage

- **Storybook, `Topology/Lock playground`, `SqueezeThrough`.** Tap the wall: the explorer walks beside it and "Go
  through the crack" shows; take it and he squeezes through and stands on the far side. Tap the wall again to come
  back. Lift the stone first: he stops beside the wall and "Cannot pass with a stone" shows.
- **Storybook, `Topology/NarrowPassage`.** Both walls at 1x and 3x on two ranks, the explorer either side, the four
  squeezing headings. Judge the squeeze's size against the walking figure and whether drawing it in front of the
  wall reads.
- **The squeeze's speed** (350 ms a leg) and its two legs at a corner: not seen live.
```

- [ ] **Step 6: Commit the docs**

```bash
git add docs/mods/mechanic-contract.md docs/mods/ARCHITECTURE.md docs/superpowers/specs/2026-10-04-stones-acceptance.md docs/superpowers/plans/2026-10-06-stonegate-roadmap.md docs/playtest-backlog.md
git commit -m "docs: the narrow passage, in the contract and the spec" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

- [ ] **Step 7: The world stays put**

Check first that no playtest bake is lying uncommitted: `git status --short src/data/` must print nothing. Then:

```bash
yarn generate-world
git diff --exit-code --stat src/data/generatedWorld.ts
git diff -U0 src/data/carveLedger.json | grep -E '^[-+] ' | grep -vc '"hash"'
```

Expected: `generate-world` succeeds; the second command prints nothing and exits 0 (the world is byte-identical);
the third prints `0` (every changed ledger line is a `"hash"` line). If the world changed, stop and find which
task's change moved a carve: no world floor holds a stone, a passage or an `unladen` drop, so none may move.

```bash
git add src/data/carveLedger.json
git commit -m "chore: refresh the carve ledger hashes" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

- [ ] **Step 8: The whole gate in a clean worktree**

```bash
git worktree add /tmp/stonegate-phase3 HEAD && cd /tmp/stonegate-phase3 && yarn install --immutable && yarn verify && yarn build
```

Expected: all pass (`yarn verify` runs lint --fix, types, tests, betterer in its order; the three known
`puzzleSeeds.verify.ts` failures are not in it). If `yarn verify`'s `lint --fix` rewrote a file, copy that change
back, commit it ("style: lint") in the real worktree, and run the gate again. Then `cd -` back,
`git worktree remove /tmp/stonegate-phase3`, push the branch (`git push`), and check `gh pr checks` if a PR exists
for it.

---

## Self-review notes

- **Spec §3:** the `unladen` passage binds like any gate, to a narrow passage (task 2) or, beside a drop, to the drop
  (task 1). "A zipline or a narrow passage where the lock lets a stone through is refused": the zipline by
  `stonePasses` (task 1); the narrow passage binds only to a gate empty hands alone open, so it cannot stand where a
  stone passes (task 2's `-[p|unladen]-` test). "With the realisation mod off, the carve is identical": task 2's
  mod-off test. "The four stone locks bake on the dev floor": not this phase (phase 4 gate loops; masonsRamp needs a
  chute realisation; recorded).
- **Spec §4:** a carrying walk stops on the near side and says why: task 3 (the passage) and task 1 (the `unladen`
  drop), one line for both (designer decision 4).
- **Roadmap phase 3 row and designer decisions:** registry beside `oneWayRealisation` (task 2); door room in one cell,
  explorer never inside (task 3: `openWaysOut`, the tap on the wall); crossing like the ride (task 4); prompt en/nl
  (task 3); `handsFull` and the notice (tasks 2, 3); crack black, one sprite (task 5 draws the tile whole); `fadeAt`
  (task 5); squeeze frames, sizes and mirroring (task 4); the carry gap (task 1); mod off (task 2); playground plays an
  unladen lock (task 2's binding choice, task 5's story; task 3 plays it through the playground's carve); story with
  both directions and both sides (task 5); docs (task 6); stable world and ledger (task 6).
- **Review Focus → tests:** 1 the way back, task 3; 2 a tap mid-crossing, task 3; 3 a reload, task 3; 4 the corner,
  tasks 2 and 4; 5 the prompt key, task 3.
- **Placeholder scan:** none; where a generated id is assumed (`in-out`, `out>in`), the step says how to read the real
  one and keeps the assertion.
- **Type consistency:** `isUnladenGate(gate: LockGate)` (task 1) is read by `absorbUnladen`, `lockFaults`, `kindsUsed`
  and `translate` (tasks 1, 2); `OneWayObstacle.unladen` → the span's `obstacle.unladen` → `oneWayRuns(...).unladen`
  → `LockSpec.oneWays[].unladen` and `useSiteNavigation`'s `span.unladen` (task 1); `GateTerms.passage: string` →
  `withPassages`' map value → `RoomCell.passage.realisation` → `passageCrossing(...).realisation` →
  `Traversal.kind` and `resolvePassage(...)` (tasks 2, 3, 5); `PassageRealisationMeta.art?: { across; along }` is read
  only by `passageTile` (task 5); `Traversal.via` (task 3) is what `useCrossing` and `useSqueeze` branch on (task 4);
  `Squeeze.traversal.via` is required where `Traversal.via` is optional, narrowed in `useSqueeze`;
  `SqueezeFigure` is shared by the rider and the story (tasks 4, 5); `PASSAGE_BINDING` and `CRACK` are the one
  binding and lock every passage test uses.
- **Not covered:** a passage at a corner has no art of its own; a sequence tile on the way to the near side is worked
  by the same `walkPresses` call as any walk but no test builds that floor (no sequence lock carves on the bench
  floor, roadmap "Open after phase 2").
