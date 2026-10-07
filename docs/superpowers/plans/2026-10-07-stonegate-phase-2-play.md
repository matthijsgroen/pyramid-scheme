# stoneGate Phase 2: Play with Stones — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Written against `4a370b2c`** (branch `topology/mechanics`, phase 1 done and pushed). Every path, symbol and
signature cited below was checked at that commit. Three carves were probed there: the made-up locks this plan's
tests use carve with `carveLockFloor`, walk sound, and name their plates `stones.<id>` (the lock's name is the
namespace); a stone floor with `exitOrStaircase: "staircase"` puts its stairhead at `exitPos` and its walk's
`leaveWith` already refuses `+ hand` there.

**Goal:** a player can play a stone lock on a floor: lift a stone, carry it, set it on a plate, see the plates and
doors move, be told why a carrying walk stops, and find every stone where they left it after a reload. The Lock
playground story plays any catalogue lock with the real navigation.

**Architecture:** play reads the phase 1 record and never a second copy of the rules. A new pure module
`src/game/stonePlay.ts` answers the play questions (which move a plate offers, how a plate looks, whether the
hand is full, what the explorer's own weight opens) from the weights `MechanismRecord`, using `pressAt` and a new
`arrangementOf` (the inverse of the arrangement key). The record gains two compiled fields: `underfoot` (the
gates the explorer's weight opens, per arrangement and plate, read only by drawing) and `weighs` (each gate's
stone terms, read by the door's face). `useSiteNavigation` offers the lift and the set-down at a plate and turns a
carrying walk away at stairs, the way out and a zipline with a notice. `SiteMapView` draws the plate in three
looks, the explorer carrying, and doors moved by his weight, without changing the grid the walk reads.

**Tech Stack:** TypeScript, React 19, Vitest + Testing Library, Storybook (`@storybook/react-vite`), i18next.

**Spec:** `docs/superpowers/specs/2026-10-04-stones-acceptance.md` §4 Play, §5 Save, "The carrying explorer".
**Roadmap:** `docs/superpowers/plans/2026-10-06-stonegate-roadmap.md` (phase 2 row, "Judged in Storybook", "Open
after phase 1", "Open per phase").

**Start from:** `topology/mechanics` at or after `4a370b2c`. The two untracked files at the repository root
(`circle.lock`, `stoneGate.lock`) are the designer's scratch: never stage them.

## Questions before running

The plan is written assuming each recommendation. If the designer picks the alternative, only the named text or
the one named function changes.

1. **Where a blocked walk's line shows.** *Recommended:* a notice, not a button: a new atom `MapNotice`
   (`src/ui/atoms/MapNotice.tsx`), drawn exactly where the prompt is drawn (over the explorer's cell), with no tap
   action, cleared by the next tap on the map. Navigation returns it beside `prompt` as `notice`. *Alternative:*
   the existing `MapActionPrompt` button with the line as its label, its tap only dismissing it (task 5: the
   notice renders through `MapActionPrompt` with `onClick` clearing it; `MapNotice` is not created).
2. **The wording.** *Recommended:* the spec's drafts, and for the prompts the spec's own words.

   | key | en | nl |
   | --- | --- | --- |
   | `ui.prompt.liftStone` | Lift the stone | Til de steen op |
   | `ui.prompt.setStone` | Set the stone on the plate | Leg de steen op de plaat |
   | `ui.blocked.setStoneDown` | Set the stone down first | Leg eerst de steen neer |
   | `ui.blocked.zipline` | You need both hands for the zipline | Je hebt beide handen nodig voor de lijn |

   *Alternative:* the designer's own lines; only `public/locales/{en,nl}/common.json` change.
3. **A zipline while carrying, before phase 3.** The spec says a zipline cannot be taken with a stone in hand,
   but in phase 2 no lock writes `-[unladen]-` on a one-way (phase 3 refuses the binding that would disagree).
   *Recommended:* the one-way realisation declares it: `OneWayRealisationMeta.handsFull` is the line a carrying
   walk is stopped with, and the zipline sets it, so every zipline turns a carrying explorer away now. No stone
   lock in the catalogue that carves in phase 2 has a zipline, so nothing the solver proved is contradicted.
   *Alternative:* no zipline refusal until phase 3 (task 5 drops the span branch and the `handsFull` field).
4. **Which plate doors wear a face.** Today a face is owed only by an `and` door with more than one owner, and a
   stones home is no owner there (no family). *Recommended:* every door with a stone term wears a face, `any`
   doors and single-plate doors included, because all plates look alike and nothing else on the floor says which
   plate a door listens to. Consequence: such a door is no longer a sealed wall (`isSealedWayOut` needs no family)
   but a door the player walks into and reads. *Alternative:* the same rule as other owners: a face only where the
   door has more than one owner and is not `any` (task 6 counts stone terms into `needsFace`'s owner count instead
   of forcing the face).
5. **How the face tells plates apart.** *Recommended:* not in phase 2. The face shows one marker per stone term:
   a plate wanting a stone or wanting none, and whether it agrees now. How many still disagree is what the player
   needs; which plate is which is learned on the floor. *Alternative:* a glyph pair per plate, worn by the plate
   and its marker (like `mark`); that needs the plates in `mark.ts`'s allocation and is a task of its own.
6. **The narrow passage's line.** The narrow passage realisation is phase 3. *Recommended:* phase 2 builds the
   mechanism (the notice and `handsFull` on a realisation) and phase 3's narrow passage declares
   `"Too narrow to carry the stone through"` through it. A bare `unladen` door carved in phase 2 stays what it is
   today, a door shut while carrying, and says nothing. *Alternative:* phase 2 also stops a carrying walk at a bare
   `unladen` door, which needs a route found on the floor as it would be with empty hands; a task of its own.
7. **A saved arrangement the lock no longer has.** A stored key that is not a state of the record freezes the
   stones (`pressAt` finds no move out of it) and opens nothing. Only dev floors hold stones until phase 6.
   *Recommended:* defer to phase 6, where a shipped floor's save impact is settled; record it in the roadmap's
   "Open after phase 2". *Alternative:* read a key the record does not have as `initial` in `stonesAt` (task 2),
   which a test then pins.

## Global Constraints

- **The stone rules live in `stoneArrangements` (`src/game/mechanics/weights.ts`).** Play derives what it shows
  from the compiled record and `pressAt`; it never re-implements a lift, a set-down or a gate's fold.
- **Arriving never acts, standing offers** (`node-actions.md`, spec §4). A plate is written down by standing on
  it, as a sequence tile is; a stone moves only when the player takes the prompt.
- **One stone in hand.** No lift while carrying; a set-down only on an empty plate.
- **The explorer's weight is play-time only.** It changes what is drawn while he stands on a plate; it never
  changes the grid the walk, the offers or the save read. The walk and the solver have no player-weight rule.
- **A stone never leaves its floor.** Every staircase and the way out turn a carrying walk away with a notice.
- **Mechanic art is shared:** plate tiles and the explorer's carrying frames come from `src/assets/tiles/default/`
  (`sharedTileUrl`, `sharedTileFrames`), the same at every rank. The plate tiles are `plate`, `plateDown`,
  `plateStone`; the carrying frames are `explorer-carry-{s,n,e}-<n>`.
- **No tests on authored content.** Tests use small made-up locks written inline. `yarn lock` checks
  `src/game/locks/*.lock`. Never assert what a catalogue lock contains, not even in the playground's spec.
- **Stable world:** a plain `yarn generate-world` leaves `src/data/generatedWorld.ts` byte-identical. This plan
  edits no file in the carve fingerprint (`src/game/siteAssembler.ts`, `src/worldGen/carveSeedSearch.ts`,
  `src/mods/allFamilyMeta.ts`, per `scripts/generateWorld.ts`), so `src/data/carveLedger.json` must not change
  either.
- **Save:** the arrangement is the weights mechanism's state in `journey.mechanismStates`, under the first
  plate's slot (`xplate:<id>`). No new field, no migration, never a reset.
- **Comments state the current rule and why**, never history ("replaces", "used to", "now").
- **Count work, never wall-clock**, in tests.
- **Rendering is verified by looking:** every task that changes drawing ends in a Storybook look, recorded in
  the report, and the designer judges it. Tests pin which sprite and which tile, never how it looks.
- **i18n:** every new string in `public/locales/en/common.json` and `public/locales/nl/common.json` together.
- **Commits:** one short line, then the trailer lines exactly:
  ```
  git commit -m "<type(scope)>: <what changed>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
  ```
- **Shell:** commands run in zsh; an unmatched glob is an error, so quote globs passed to tools.
- **Known failures, not yours:** `src/mods/puzzleSeeds.verify.ts` fails 3 tests ("the switch's three shapes…",
  "owes the switch a board…", "names the floor and the shape…"). Leave them.
- **Changelog:** no entry. Stones play only on the dev journey and in Storybook until phase 6.

## Review Focus

1. **A tap on the plate the explorer already stands on.** After taking a lift the prompt is gone (as a lever's
   is); tapping his own cell again must offer the set-down, and the set-down after that the lift. Test in task 2.
2. **A walk that crosses a plate on its way to somewhere else** must move no stone and offer nothing: only the
   tapped cell offers. Test in task 2.
3. **A door owned by a plate and a lever, under the explorer's weight.** His weight must not take the stones' say
   away from the door: with the lever shut, a door `-[p+L]-` stays drawn shut while he presses `p`. Test in task 4
   (the `NEVER` sentinel in `explorerWeight`).
4. **Standing on a plate that already holds a stone** moves nothing (no `underfoot` entry) and the plate keeps its
   stone look, not the pressed one. Test in task 4.
5. **The way back up.** A carrying explorer at the entrance stairhead of a deeper floor is turned away like at the
   way down; the stairs branch answers both because both are `portal` rooms with a `stairId`. Test in task 5.

---

### Task 1: The Lock playground

Built first, so every later task is judged in it. It plays any catalogue lock with the real carve, navigation,
prompts and an in-memory save. Levers, torches, sequences and ziplines play at once; stones play from task 2.

**Files:**
- Modify: `src/game/lockAuthoring.ts` (gains `freeRegions`, moved verbatim from the world spec)
- Modify: `src/worldGen/spec/locks/catalogue.ts` (loses `freeRegions`)
- Modify: `src/worldGen/spec/dev.ts` (imports `freeRegions` from `@/game/lockAuthoring`)
- Modify: `src/app/SiteMap/useAssembledFloor.ts` (extract `assemblePlayedFloor`)
- Create: `src/app/SiteMap/usePromptLabel.ts` (the prompt's words, out of `SiteMapScreen`)
- Modify: `src/app/SiteMap/SiteMapScreen.tsx` (uses `usePromptLabel`)
- Create: `src/app/SiteMap/lockPlayground.ts` (pure: the bench floor, the realisation choices, the seed)
- Create: `src/app/SiteMap/lockPlayground.testing.tsx` (`useMemoryJourneys`, `LockPlayground`)
- Create: `src/app/SiteMap/LockPlayground.stories.tsx` (`Topology/Lock playground`)
- Test: `src/app/SiteMap/lockPlayground.spec.tsx`

**Interfaces:**
- Produces: `freeRegions(lock: Lock): Lock` in `@/game/lockAuthoring`.
- Produces: `assemblePlayedFloor(journeyId: string, floorConfig: FloorConfig, seed: number, currentFloor: number, levelIndex?: number): AssemblerResult` in `useAssembledFloor.ts`; `useAssembledFloor` carves through it.
- Produces: `usePromptLabel(): (prompt: ArrivalPrompt) => string`.
- Produces in `lockPlayground.ts`: `PLAYGROUND_JOURNEY: string`, `REALISATION_CHOICES: Readonly<Record<string, readonly string[]>>`, `defaultBinding(): Record<string, string>`, `playgroundFloor(lock: Lock, binding: RealisationBinding): FloorConfig`, `carvePlayground(config: FloorConfig, budget?: number): { found: true; seed: number; grid: FloorGrid } | { found: false; reasons: AssemblerReason[] }`.
- Produces in `lockPlayground.testing.tsx`: `useMemoryJourneys(journeyId: string): { journeys: JourneyAPI; doc: StoredJourneyStateV3; reset: () => void }`, `LockPlayground: FC<{ locks: Readonly<Record<string, string>> }>`.
- Later tasks' harness tests pick their seed with `carvePlayground`, because it carves exactly as `useAssembledFloor` does (one-way and region-barrier resolvers included), which `carveSequence` does not.

- [ ] **Step 1: Write the failing tests** in `src/app/SiteMap/lockPlayground.spec.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { parseLock } from "@/game/lockNotation"
import { assemblePlayedFloor } from "./useAssembledFloor"
import { PLAYGROUND_JOURNEY, carvePlayground, defaultBinding, playgroundFloor } from "./lockPlayground"
import { LockPlayground } from "./lockPlayground.testing"
import "@/mods/registerModApps"

afterEach(cleanup)

const LEVER = "in -[L]- out\nL toggle @in\nin *\nout *"

describe("the playground's floor", () => {
  it("frees every region and binds the realisations it is given", () => {
    const config = playgroundFloor(parseLock(LEVER, "lever").lock, { toggle: "handle" })
    const lock = config.locks![0].lock
    expect(Object.values(lock.regions)).toEqual([{ takes: "free" }, { takes: "free" }])
    expect(config.realisations).toEqual({ toggle: "handle" })
    expect(config.pathPuzzles).toBe(0)
  })

  it("carves at the first seed play carves it at, and hands back that very grid", () => {
    const config = playgroundFloor(parseLock(LEVER, "lever").lock, defaultBinding())
    const carved = carvePlayground(config)
    if (!carved.found) throw new Error(JSON.stringify(carved.reasons))
    for (let seed = 0; seed < carved.seed; seed++)
      expect(assemblePlayedFloor(PLAYGROUND_JOURNEY, config, seed, 0).success).toBe(false)
    const again = assemblePlayedFloor(PLAYGROUND_JOURNEY, config, carved.seed, 0)
    expect(again.success && again.grid).toEqual(carved.grid)
  })
})

describe("LockPlayground", () => {
  it("lists every lock it is given and draws the first one's floor", () => {
    const { container } = render(<LockPlayground locks={{ lever: LEVER, second: LEVER }} />)
    expect(screen.getByRole("option", { name: "lever" })).toBeTruthy()
    expect(screen.getByRole("option", { name: "second" })).toBeTruthy()
    expect(container.querySelector("[data-explorer]")).not.toBeNull()
  })

  it("says why a lock does not parse instead of drawing a floor", () => {
    const { container } = render(<LockPlayground locks={{ broken: "in -[L]- out\nL lever @nowhere" }} />)
    expect(container.querySelector("[data-playground-refused]")?.textContent).toMatch(/line/)
    expect(container.querySelector("[data-explorer]")).toBeNull()
  })
})
```

`parseLock` throws `line <n>: …` on a malformed line (`fail` in `src/game/lockNotation.ts`); `L lever @nowhere`
names an unknown control, so it throws. If it does not, use any line `parseLock` throws on and keep the assertion.

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/app/SiteMap/lockPlayground.spec.tsx`
Expected: FAIL, `./lockPlayground` and `./lockPlayground.testing` do not exist.

- [ ] **Step 3: Move `freeRegions` into the shared lock**

Cut this block out of `src/worldGen/spec/locks/catalogue.ts` and paste it at the end of
`src/game/lockAuthoring.ts` unchanged (the browser cannot import `catalogue.ts`, which reads the disk):

```ts
/** The same lock with every region taking `free`, for a bench floor: what it holds is the topology, and the
 * carve seats none of a lock's `puzzles`/`nothing`/`reward` appetites on a floor with no content. */
export const freeRegions = (lock: Lock): Lock => ({
  ...lock,
  regions: Object.fromEntries(Object.keys(lock.regions).map(region => [region, { takes: "free" as const }])),
})
```

In `catalogue.ts` remove the now unused `import type { Lock }` only if `catalogueLock` no longer needs it (it
does: keep it). In `src/worldGen/spec/dev.ts` replace
`import { catalogueLock, freeRegions } from "./locks/catalogue"` with

```ts
import { freeRegions } from "@/game/lockAuthoring"
import { catalogueLock } from "./locks/catalogue"
```

- [ ] **Step 4: Extract the carve play uses**

In `src/app/SiteMap/useAssembledFloor.ts`, add above `export const useAssembledFloor`:

```ts
/** THE FLOOR AS PLAY CARVES IT: the registry's realisations, their key requirements and the address every id is
 * derived from. Whatever must agree with the floor the player walks carves through this. */
export const assemblePlayedFloor = (
  journeyId: string,
  floorConfig: FloorConfig,
  seed: number,
  currentFloor: number,
  levelIndex?: number
) =>
  assembleFloor(journeyId, floorConfig, seed + currentFloor, resolveEncounter, {
    resolveKeyRequirements,
    resolveOneWay: resolveOneWayRealisation,
    resolveRegionBarrier: resolveRegionBarrierRealisation,
    floorRef: { journeyId, ...(levelIndex !== undefined ? { levelIndex } : {}), floorIndex: currentFloor },
    ...(levelIndex !== undefined ? { resolveBoardIndex: boardIndexesForFloor(journeyId, levelIndex, currentFloor) } : {}),
  })
```

and make `baseGrid`'s memo body

```ts
    const result = assemblePlayedFloor(journeyId, floorConfig, seed, currentFloor, levelIndex)
    return result.success ? result.grid : null
```

(the options object above is the one the memo held, moved verbatim).

- [ ] **Step 5: The prompt's words, in one place**

Create `src/app/SiteMap/usePromptLabel.ts`:

```ts
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { getFamilyPlugin } from "@/app/families/familyRegistry"
import type { ArrivalPrompt } from "./useSiteNavigation"

/**
 * WHAT THE PROMPT BESIDE THE EXPLORER SAYS. Every key is written out in a `t("…")` call, so the locale guard
 * (src/i18n/keys.spec.ts) sees each one. A room's words are its family's own (FamilyMeta.invitation), read
 * through the registry so core names no mod; `here` is for a room whose family names none, or whose mod is off.
 */
export const usePromptLabel = (): ((prompt: ArrivalPrompt) => string) => {
  const { t } = useTranslation("common")
  return useCallback(
    (prompt: ArrivalPrompt): string => {
      switch (prompt.kind) {
        case "obstacle":
          // A crossing's words are its realisation's own; one no mod declares still says it cannot be undone.
          return prompt.invitation ? t(prompt.invitation) : t("ui.prompt.oneWay")
        case "stairs":
          return t("ui.prompt.stairs")
        case "exit":
          return t("ui.prompt.exit")
        case "room": {
          const invitation = prompt.familyId ? getFamilyPlugin(prompt.familyId)?.meta.invitation : undefined
          return invitation ? t(invitation) : t("ui.prompt.here")
        }
      }
    },
    [t]
  )
}
```

In `src/app/SiteMap/SiteMapScreen.tsx` delete the `promptLabels` object and the `promptLabel` function (with their
comments) and put in their place:

```ts
  const promptLabel = usePromptLabel()
```

Add `import { usePromptLabel } from "./usePromptLabel"`; change the navigation import to
`import { useSiteNavigation } from "./useSiteNavigation"` and drop the `getFamilyPlugin` import (nothing else in
the file uses it; `yarn lint` names any import left unused).

- [ ] **Step 6: The bench floor**

Create `src/app/SiteMap/lockPlayground.ts`:

```ts
import { journeys as allKnownJourneys } from "@/data/journeys"
import { freeRegions, type Lock } from "@/game/lockAuthoring"
import type { RealisationBinding } from "@/game/lockCompile"
import type { AssemblerReason, FloorConfig, FloorGrid } from "@/game/siteTypes"
import { assemblePlayedFloor } from "./useAssembledFloor"

// A LOCK STANDING ALONE ON A FLOOR, carved and played the way the game plays it. Used by the Lock playground story
// and by the specs that play a lock through the real navigation.

/** A known journey, because the journeys API files a level's writes only under one it knows. */
export const PLAYGROUND_JOURNEY = allKnownJourneys[0].id

/** Every realisation a control kind can be dressed as, first the default. A kind the lock does not use is ignored
 * by `compileLock`, so one binding serves every lock. */
export const REALISATION_CHOICES: Readonly<Record<string, readonly string[]>> = {
  toggle: ["handle"],
  activator: ["torch"],
  sequence: ["pressure-plate"],
  "fork-switch": ["lightbeamSwitch"],
  "one-way": ["zipline"],
  "region-barrier": ["water", "sand"],
  weights: ["stonePlate"],
}

export const defaultBinding = (): Record<string, string> =>
  Object.fromEntries(Object.entries(REALISATION_CHOICES).map(([kind, [first]]) => [kind, first]))

/** The lock alone on an expert floor with no puzzles, every region free, as the dev floors bench a lock. */
export const playgroundFloor = (lock: Lock, binding: RealisationBinding): FloorConfig => ({
  pathPuzzles: 0,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  locks: [{ lock: freeRegions(lock) }],
  realisations: binding,
})

/** The first seed below `budget` that play carves the floor at, with the grid it carves; otherwise the first
 * refusal, so the playground can say why. */
export const carvePlayground = (
  config: FloorConfig,
  budget = 200
): { found: true; seed: number; grid: FloorGrid } | { found: false; reasons: AssemblerReason[] } => {
  let reasons: AssemblerReason[] = []
  for (let seed = 0; seed < budget; seed++) {
    const result = assemblePlayedFloor(PLAYGROUND_JOURNEY, config, seed, 0)
    if (result.success) return { found: true, seed, grid: result.grid }
    if (reasons.length === 0) reasons = result.reasons
  }
  return { found: false, reasons }
}
```

`AssemblerResult`'s failure branch carries `reasons: AssemblerReason[]` (see `lockFixtures.ts`, which collects
them the same way).

- [ ] **Step 7: The playground itself**

Create `src/app/SiteMap/lockPlayground.testing.tsx`:

```tsx
import { useMemo, useState, type FC } from "react"
import { parseLock } from "@/game/lockNotation"
import { notBuildable } from "@/game/lockWalkSpec"
import { walkFloorLock } from "@/game/floorLockWalk"
import { getOwnedKeys } from "@/game/gridNavigation"
import type { FloorConfig } from "@/game/siteTypes"
import { createJourneysV3Api, type JourneyAPI, type StoredJourneyStateV3 } from "@/app/state/useJourneys"
import type { TranslatedJourney } from "@/app/translations/useJourneyTranslations"
import { useProgression } from "@/app/state/useProgression"
import { useInventory } from "@/app/Inventory/useInventory"
import { PuzzleRoomContext } from "@/mods/core/app/puzzleState"
import { EncounterModal } from "./EncounterModal"
import { SiteMapView } from "./SiteMapView"
import { useAssembledFloor } from "./useAssembledFloor"
import { useEncounter } from "./useEncounter"
import { useMechanismStates } from "./useMechanismStates"
import { usePromptLabel } from "./usePromptLabel"
import { useSiteNavigation } from "./useSiteNavigation"
import { useZiplineRide } from "./useZiplineRide"
import {
  PLAYGROUND_JOURNEY,
  REALISATION_CHOICES,
  carvePlayground,
  defaultBinding,
  playgroundFloor,
} from "./lockPlayground"

// THE LOCK PLAYGROUND: any lock, carved and played with the game's own navigation, prompts and encounter screens
// over a journey kept in memory. Nothing here decides what a move does; it only wires the hooks the site map uses.

const freshDoc = (journeyId: string): StoredJourneyStateV3 => ({
  journeyId,
  levelNr: 1,
  completionCount: 0,
  active: true,
  exploredSections: {},
  exploredCells: {},
  position: null,
  positionKey: null,
  standingKey: null,
  interiorLevelNr: null,
  mechanismStates: {},
})

const journeyData = (id: string): TranslatedJourney =>
  ({
    id,
    exterior: "pyramid",
    difficulty: "starter",
    levelCount: 1,
    journeyLength: "short",
    name: id,
    lengthLabel: "short",
  }) as TranslatedJourney

/** One journey's save, in memory: what the playground plays into, and what `reset` empties. */
export const useMemoryJourneys = (journeyId: string) => {
  const [docs, setDocs] = useState<StoredJourneyStateV3[]>(() => [freshDoc(journeyId)])
  const journeys = useMemo(
    () =>
      ({
        ...createJourneysV3Api({ journeys: docs, setJourneys: setDocs, journeyData: [journeyData(journeyId)] }),
        getPurchasedShopSlots: () => new Set<string>(),
        getSkippedConsumables: () => new Set<string>(),
      }) as unknown as JourneyAPI,
    [docs, journeyId]
  )
  return { journeys, doc: docs[0], reset: () => setDocs([freshDoc(journeyId)]) }
}

const PlayedFloor: FC<{ config: FloorConfig; seed: number }> = ({ config, seed }) => {
  const { journeys, doc, reset } = useMemoryJourneys(PLAYGROUND_JOURNEY)
  const progression = useProgression()
  const inventory = useInventory()
  const mechanismStates = useMechanismStates(journeys, PLAYGROUND_JOURNEY)
  const { grid, explorerPos, openGateKeys } = useAssembledFloor(
    PLAYGROUND_JOURNEY,
    config,
    seed,
    0,
    journeys.getExploredCells(PLAYGROUND_JOURNEY),
    doc.positionKey,
    0,
    undefined,
    undefined,
    mechanismStates,
    doc.standingKey
  )
  const ownedKeys = useMemo(() => new Set([...(grid ? getOwnedKeys(grid) : []), ...openGateKeys]), [grid, openGateKeys])
  const encounter = useEncounter({
    journeys,
    journeyId: PLAYGROUND_JOURNEY,
    levelNr: 1,
    currentFloor: 0,
    difficulty: config.difficulty,
    grid,
    ownedKeys,
    onReward: () => {},
  })
  const { ride, playTraversal } = useZiplineRide()
  const { onCellClick, prompt, explorerHidden } = useSiteNavigation({
    journeys,
    journeyId: PLAYGROUND_JOURNEY,
    siteConfig: [config],
    seed,
    currentFloor: 0,
    grid,
    explorerPos,
    onEncounter: encounter.open,
    onSkippedConsumable: () => {},
    onExitReached: () => {},
    playTraversal,
  })
  const promptLabel = usePromptLabel()
  const walk = useMemo(() => (grid ? walkFloorLock(grid) : undefined), [grid])
  if (!grid) return <p data-playground-refused="">the floor does not assemble</p>
  const Board = encounter.family?.Component ?? null
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-4 text-sm text-white/80">
        <button type="button" onClick={reset}>
          Start again
        </button>
        <span>seed {seed}</span>
        <span>{walk ? (walk.sound ? "walks sound" : "does not walk sound") : "no lock walk"}</span>
        <span data-playground-states="">{JSON.stringify(doc.mechanismStates ?? {})}</span>
      </div>
      <div className="relative h-160 w-full">
        <SiteMapView
          grid={grid}
          onCellClick={onCellClick}
          explorerPos={explorerPos}
          explorerHidden={explorerHidden}
          ride={ride}
          currentFloor={0}
          ownedKeys={ownedKeys}
          mechanismStates={mechanismStates}
          prompt={prompt && { label: promptLabel(prompt), at: prompt.at, onTake: prompt.take }}
          className="size-full"
        />
      </div>
      {encounter.isOpen && Board && encounter.ctx && (
        <EncounterModal difficulty={encounter.ctx.difficulty}>
          <PuzzleRoomContext value={encounter.roomKey}>
            <Board
              puzzle={encounter.puzzle}
              ctx={encounter.ctx}
              progression={progression}
              journeys={journeys}
              inventory={inventory}
              applyReward={() => {}}
              onSolved={encounter.solved}
              onCancel={encounter.cancel}
            />
          </PuzzleRoomContext>
        </EncounterModal>
      )}
    </div>
  )
}

/** Pick a lock and a realisation per control kind; the floor carves and plays as the game would. */
export const LockPlayground: FC<{ locks: Readonly<Record<string, string>> }> = ({ locks }) => {
  const names = useMemo(() => Object.keys(locks).sort(), [locks])
  const [name, setName] = useState(names[0])
  const [binding, setBinding] = useState(defaultBinding)
  const parsed = useMemo(() => {
    try {
      return { ok: true as const, ...parseLock(locks[name], name) }
    } catch (error) {
      return { ok: false as const, message: (error as Error).message }
    }
  }, [locks, name])
  const config = useMemo(() => (parsed.ok ? playgroundFloor(parsed.lock, binding) : null), [parsed, binding])
  const carved = useMemo(() => (config ? carvePlayground(config) : null), [config])
  const refusal = !parsed.ok
    ? parsed.message
    : parsed.refused.length > 0
      ? parsed.refused.join("; ")
      : carved && !carved.found
        ? JSON.stringify(carved.reasons)
        : undefined
  return (
    <div className="flex h-screen flex-col gap-2 overflow-auto bg-neutral-900 p-4 text-white">
      <div className="flex flex-wrap gap-4 text-sm">
        <label>
          lock{" "}
          <select value={name} onChange={e => setName(e.target.value)} className="text-black">
            {names.map(n => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        {Object.entries(REALISATION_CHOICES).map(([kind, choices]) => (
          <label key={kind}>
            {kind}{" "}
            <select
              value={binding[kind]}
              onChange={e => setBinding(b => ({ ...b, [kind]: e.target.value }))}
              className="text-black"
            >
              {choices.map(choice => (
                <option key={choice}>{choice}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {parsed.ok && (parsed.drafts.length > 0 || notBuildable(parsed.lock).length > 0) && (
        <p className="text-xs text-amber-300">
          not buildable yet: {[...parsed.drafts, ...notBuildable(parsed.lock)].join(", ")}
        </p>
      )}
      {refusal !== undefined ? (
        <pre data-playground-refused="" className="text-xs whitespace-pre-wrap text-red-300">
          {refusal}
        </pre>
      ) : (
        carved?.found &&
        config && <PlayedFloor key={`${name}|${JSON.stringify(binding)}`} config={config} seed={carved.seed} />
      )}
    </div>
  )
}
```

The `key` on `PlayedFloor` gives each lock and binding a fresh save. `useProgression` and `useInventory` are the
app's own hooks; the face, the lever and the torch never write to them, a lightbeam board may.

- [ ] **Step 8: The story**

Create `src/app/SiteMap/LockPlayground.stories.tsx`:

```tsx
import { StrictMode } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { LockPlayground } from "./lockPlayground.testing"
import "@/mods/registerModApps"

// Every catalogue lock, read the way `yarn lock` reads it: the file is the lock. Named by its path under
// src/game/locks, so a lesson reads as "lessons/torch".
const LOCKS = Object.fromEntries(
  Object.entries(
    import.meta.glob("../../game/locks/**/*.lock", { query: "?raw", import: "default", eager: true }) as Record<
      string,
      string
    >
  ).map(([path, text]) => [path.replace(/^.*\/locks\//, "").replace(/\.lock$/, ""), text])
)

const meta = {
  title: "Topology/Lock playground",
  component: LockPlayground,
  parameters: { layout: "fullscreen" },
  // The app renders in StrictMode; so does the playground, or a mount-time cleanup would go unseen.
  decorators: [
    Story => (
      <StrictMode>
        <Story />
      </StrictMode>
    ),
  ],
  args: { locks: LOCKS },
} satisfies Meta<typeof LockPlayground>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
```

- [ ] **Step 9: Run the tests, the gate, and the bake**

Run: `yarn vitest run src/app/SiteMap/lockPlayground.spec.tsx src/app/SiteMap/SiteMapScreen.spec.tsx src/app/SiteMap/useAssembledFloor.spec.ts`
Expected: PASS.

Run: `yarn check-types && yarn lint`
Expected: clean.

Run: `yarn generate-world && git diff --exit-code src/data/generatedWorld.ts src/data/carveLedger.json; echo $?`
Expected: `0` (the dev spec's import moved; nothing it bakes changed).

- [ ] **Step 10: Look at it**

Run `yarn storybook`, open `Topology/Lock playground`. Play `lessons/leverOpensADoor` (throw the lever, walk
through), `lessons/torch`, `lessons/tilesInOrder` and `lessons/dropDown` (the zipline ride). Record in the report
what each did. Locks the engine cannot build yet show their "not buildable yet" line or a refusal; that is the
playground working. Stones carve (`twoStones`) but cannot be lifted until task 2.

- [ ] **Step 11: Commit**

```bash
git add src/game/lockAuthoring.ts src/worldGen/spec/locks/catalogue.ts src/worldGen/spec/dev.ts src/app/SiteMap/useAssembledFloor.ts src/app/SiteMap/usePromptLabel.ts src/app/SiteMap/SiteMapScreen.tsx src/app/SiteMap/lockPlayground.ts src/app/SiteMap/lockPlayground.testing.tsx src/app/SiteMap/LockPlayground.stories.tsx src/app/SiteMap/lockPlayground.spec.tsx
git commit -m "feat(topology): the Lock playground story" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 2: Lift the stone, set it on the plate

**Files:**
- Modify: `src/game/mechanics/weights.ts` (export `arrangementOf`)
- Create: `src/game/stonePlay.ts` (`stonesAt`, `stoneMoveAt`, `isCarrying`)
- Create: `src/game/testSupport/stoneFixtures.ts` (made-up stone floors)
- Modify: `src/app/SiteMap/useSiteNavigation.ts` (a plate offers its move)
- Modify: `src/app/SiteMap/usePromptLabel.ts` (the `plate` kind's words)
- Modify: `public/locales/en/common.json`, `public/locales/nl/common.json` (`ui.prompt.liftStone`, `ui.prompt.setStone`)
- Test: `src/game/mechanics/weights.spec.ts`, `src/game/stonePlay.spec.ts`, `src/app/SiteMap/stoneWalk.spec.tsx`

**Interfaces:**
- Consumes: `carvePlayground`, `PLAYGROUND_JOURNEY` (task 1); `sequenceHarness(seed, config)`, `roomsOf(grid)` from `src/app/SiteMap/sequenceHarness.testing.tsx` (generic despite its name; its `JOURNEY` is the same journey as `PLAYGROUND_JOURNEY`).
- Produces: `arrangementOf(key: string): { weighted: string[]; hand: boolean }` in `weights.ts`.
- Produces in `stonePlay.ts`:
  - `stonesAt(grid: FloorGrid, floor: number, row: number, col: number, states: ReadonlyMap<string, string>): { address: string; state: string } | undefined`
  - `stoneMoveAt(grid, floor, row, col, states): { address: string; state: string; move: "lift" | "set" } | undefined`
  - `isCarrying(grid: FloorGrid, floor: number, states: ReadonlyMap<string, string>): boolean`
- Produces: `ArrivalPromptKind` gains `"plate"`; `ArrivalPrompt` gains `stone?: "lift" | "set"`.
- Produces in `stoneFixtures.ts`: `stoneFloor(text: string, more?: Partial<FloorConfig>): FloorConfig`, `plateNamed(grid: FloorGrid, name: string): readonly [number, number]`, the lock texts `SHELF_AND_DOOR`, `TWO_STONES`.

- [ ] **Step 1: Write the failing tests**

Append to `src/game/mechanics/weights.spec.ts` (add `arrangementOf` to the `./weights` import):

```ts
describe("arrangementOf", () => {
  it("reads back every key stoneArrangements writes", () => {
    const { states } = stoneArrangements(lockOf("in -[a+b]- out\na plate @in stone\nb plate @in stone\nc plate @in"))
    for (const key of states) {
      const { weighted, hand } = arrangementOf(key)
      const rewritten = [...weighted.sort(), ...(hand ? ["+ hand"] : [])].join(" ") || "none"
      expect(rewritten).toBe(key)
    }
  })

  it("names the plates holding a stone and whether the hand holds one", () => {
    expect(arrangementOf("a.p a.q + hand")).toEqual({ weighted: ["a.p", "a.q"], hand: true })
    expect(arrangementOf("+ hand")).toEqual({ weighted: [], hand: true })
    expect(arrangementOf("a.p")).toEqual({ weighted: ["a.p"], hand: false })
    expect(arrangementOf("none")).toEqual({ weighted: [], hand: false })
  })
})
```

Create `src/game/testSupport/stoneFixtures.ts`:

```ts
import { parseLock } from "@/game/lockNotation"
import type { FloorConfig, FloorGrid } from "@/game/siteTypes"

// MADE-UP STONE LOCKS, never catalogue ones: a test pins the rule, `yarn lock` checks the catalogue. Every region
// takes `free`, so the floor holds the lock and nothing else. Placed without a namespace, a lock's ids read
// `stones.<id>` on the floor: its name is the namespace.

/** A stone on a shelf by the way in, and a door further on that waits for a stone on `p`. */
export const SHELF_AND_DOOR = "in -- hall\nhall -[p]- out\np plate @hall\nshelf plate @in stone\nin ?\nhall ?\nout ?"

/** Two stones and an empty plate the door waits on: lifting one stone leaves the other to be refused. */
export const TWO_STONES = "in -[p]- out\np plate @in\na plate @in stone\nb plate @in stone\nin ?\nout ?"

export const stoneFloor = (text: string, more: Partial<FloorConfig> = {}): FloorConfig => ({
  pathPuzzles: 0,
  difficulty: "expert",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  locks: [{ lock: parseLock(text, "stones").lock }],
  realisations: { weights: "stonePlate" },
  ...more,
})

/** Where the plate authored as `name` stands. */
export const plateNamed = (grid: FloorGrid, name: string): readonly [number, number] => {
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type === "room" && cell.plate?.id === `stones.${name}`) return [r, c]
    }
  throw new Error(`no plate ${name} on this floor`)
}
```

Create `src/game/stonePlay.spec.ts`:

```ts
import { describe, expect, it } from "vitest"
import { parseLock } from "./lockNotation"
import { carveLockFloor } from "./testSupport/lockFixtures"
import { SHELF_AND_DOOR, TWO_STONES, plateNamed } from "./testSupport/stoneFixtures"
import { isCarrying, stoneMoveAt, stonesAt } from "./stonePlay"

const floorOf = (text: string) => carveLockFloor(parseLock(text, "stones").lock, { weights: "stonePlate" })

describe("the stones as play reads them", () => {
  it("reads a plate's arrangement as the authored start while nothing is saved", () => {
    const grid = floorOf(SHELF_AND_DOOR)
    const [r, c] = plateNamed(grid, "shelf")
    expect(stonesAt(grid, 0, r, c, new Map())?.state).toBe("stones.shelf")
  })

  it("offers a lift on a plate holding a stone with empty hands, and a set-down on an empty one when carrying", () => {
    const grid = floorOf(SHELF_AND_DOOR)
    const shelf = plateNamed(grid, "shelf")
    const p = plateNamed(grid, "p")
    const lift = stoneMoveAt(grid, 0, shelf[0], shelf[1], new Map())
    expect(lift).toMatchObject({ state: "+ hand", move: "lift" })
    const carrying = new Map([[lift!.address, "+ hand"]])
    expect(stoneMoveAt(grid, 0, p[0], p[1], carrying)).toMatchObject({ state: "stones.p", move: "set" })
  })

  it("offers nothing on an empty plate with empty hands", () => {
    const grid = floorOf(SHELF_AND_DOOR)
    const [r, c] = plateNamed(grid, "p")
    expect(stoneMoveAt(grid, 0, r, c, new Map())).toBeUndefined()
  })

  it("offers no lift while a stone is already in hand", () => {
    const grid = floorOf(TWO_STONES)
    const a = plateNamed(grid, "a")
    const b = plateNamed(grid, "b")
    const lifted = stoneMoveAt(grid, 0, a[0], a[1], new Map())!
    expect(stoneMoveAt(grid, 0, b[0], b[1], new Map([[lifted.address, lifted.state]]))).toBeUndefined()
  })

  it("says the hand is full only in an arrangement with a stone in hand", () => {
    const grid = floorOf(SHELF_AND_DOOR)
    const [r, c] = plateNamed(grid, "shelf")
    const { address } = stonesAt(grid, 0, r, c, new Map())!
    expect(isCarrying(grid, 0, new Map())).toBe(false)
    expect(isCarrying(grid, 0, new Map([[address, "+ hand"]]))).toBe(true)
  })

  it("reads nothing off a cell that is no plate", () => {
    const grid = floorOf(SHELF_AND_DOOR)
    const [r, c] = grid.entrancePos
    expect(stonesAt(grid, 0, r, c, new Map())).toBeUndefined()
    expect(stoneMoveAt(grid, 0, r, c, new Map())).toBeUndefined()
  })
})
```

Create `src/app/SiteMap/stoneWalk.spec.tsx`:

```tsx
// @vitest-environment jsdom
import { act, cleanup } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { findPath, revealAll } from "@/game/gridNavigation"
import { SHELF_AND_DOOR, TWO_STONES, plateNamed, stoneFloor } from "@/game/testSupport/stoneFixtures"
import { carvePlayground } from "./lockPlayground"
import { sequenceHarness } from "./sequenceHarness.testing"
import "@/mods/registerModApps"

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const play = (text: string) => {
  const config = stoneFloor(text)
  const carved = carvePlayground(config)
  if (!carved.found) throw new Error(JSON.stringify(carved.reasons))
  return { ...sequenceHarness(carved.seed, config), grid: carved.grid }
}

describe("a plate offers its stone", () => {
  it("arriving on a plate holding a stone offers the lift and moves nothing", () => {
    const h = play(SHELF_AND_DOOR)
    h.walkTo(plateNamed(h.grid, "shelf"))
    expect(h.current().prompt).toMatchObject({ kind: "plate", stone: "lift" })
    expect(h.store.mechanismStates).toEqual({})
  })

  it("taking the lift puts the stone in hand, and the empty plate it stood on offers it back on a second tap", () => {
    const h = play(SHELF_AND_DOOR)
    const shelf = plateNamed(h.grid, "shelf")
    h.walkTo(shelf)
    act(() => h.current().prompt!.take())
    h.settle()
    expect(Object.values(h.store.mechanismStates)).toEqual(["+ hand"])
    expect(h.current().prompt).toBeNull()
    h.tap(shelf[0], shelf[1])
    expect(h.current().prompt).toMatchObject({ kind: "plate", stone: "set" })
  })

  it("setting the stone on the door's plate opens the door", () => {
    const h = play(SHELF_AND_DOOR)
    h.walkTo(plateNamed(h.grid, "shelf"))
    act(() => h.current().prompt!.take())
    h.settle()
    h.walkTo(plateNamed(h.grid, "p"))
    expect(h.current().prompt).toMatchObject({ kind: "plate", stone: "set" })
    act(() => h.current().prompt!.take())
    h.settle()
    expect(Object.values(h.store.mechanismStates)).toEqual(["stones.p"])
    expect(h.current().openGateKeys.size).toBe(1)
  })

  it("offers no lift on a plate holding a stone while the hand is full", () => {
    const h = play(TWO_STONES)
    h.walkTo(plateNamed(h.grid, "a"))
    act(() => h.current().prompt!.take())
    h.settle()
    h.walkTo(plateNamed(h.grid, "b"))
    expect(h.current().prompt).toBeNull()
  })

  it("offers nothing on an empty plate with empty hands", () => {
    const h = play(SHELF_AND_DOOR)
    h.walkTo(plateNamed(h.grid, "p"))
    expect(h.current().prompt).toBeNull()
  })

  it("a walk over a plate to somewhere else moves no stone and offers nothing", () => {
    const h = play(TWO_STONES)
    const lit = revealAll(h.grid)
    const a = plateNamed(h.grid, "a")
    // A plate some route from the entrance crosses on its way to another plate, if this carve has one.
    const crossing = ["b", "p"]
      .map(name => plateNamed(h.grid, name))
      .find(to => findPath(lit, h.grid.entrancePos, to).some(([r, c]) => r === a[0] && c === a[1]))
    if (!crossing) return
    h.walkTo(crossing)
    expect(h.store.mechanismStates).toEqual({})
  })
})
```

The last test returns early on a carve where no route crosses `a`; in that case also check the playground by hand
in step 7 (walk over a plate holding a stone: nothing moves).

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/mechanics/weights.spec.ts src/game/stonePlay.spec.ts src/app/SiteMap/stoneWalk.spec.tsx`
Expected: FAIL: `arrangementOf` is not exported, `./stonePlay` does not exist, and the walk opens the plate as an
empty encounter (no `plate` prompt).

- [ ] **Step 3: Read a key back**

In `src/game/mechanics/weights.ts`, below `keyOf`:

```ts
const HAND_MARK = `+ ${HAND}`

/** The inverse of an arrangement's key: the plates holding a stone, and whether the hand holds one. */
export const arrangementOf = (key: string): { weighted: string[]; hand: boolean } => {
  const hand = key === HAND_MARK || key.endsWith(` ${HAND_MARK}`)
  const plates = hand ? key.slice(0, key.length - HAND_MARK.length).trim() : key === "none" ? "" : key
  return { weighted: plates === "" ? [] : plates.split(" "), hand }
}
```

Plate ids are `\w+` (`NAME` in `lockNotation.ts`), with a `<namespace>.` prefix on a floor, so they hold no space.

- [ ] **Step 4: Play's questions, in the domain**

Create `src/game/stonePlay.ts`:

```ts
import { storedAtCell } from "./cellAddress"
import { mechanismAddress, mechanismWorkedAt, pressAt } from "./mechanismDoors"
import { arrangementOf } from "./mechanics/weights"
import type { FloorGrid } from "./siteTypes"

// THE STONES AS PLAY ASKS ABOUT THEM, read off the weights record a lock's first plate carries and never off a
// second copy of the rules: a move is what `pressAt` makes at the plate, an arrangement is what its key says.

/** The arrangement the stones of a plate stand in, and the address it is filed under; nothing off a plate. A save
 * with no entry stands in the authored start. */
export const stonesAt = (
  grid: FloorGrid,
  floor: number,
  row: number,
  col: number,
  states: ReadonlyMap<string, string>
): { address: string; state: string } | undefined => {
  const cell = grid.cells[row]?.[col]
  if (cell?.type !== "room" || !cell.plate) return undefined
  const worked = mechanismWorkedAt(grid, row, col)
  const address = mechanismAddress(grid, floor, row, col)
  if (!worked || !address) return undefined
  const [hr, hc] = worked.home
  return { address, state: storedAtCell(grid, floor, hr, hc, states) ?? worked.record.initial }
}

/** What standing on a plate offers: the lift off it or the set-down on it, as the write it makes. Nothing where the
 * plate has no move out of the current arrangement: an empty plate with empty hands, or a full one while carrying. */
export const stoneMoveAt = (
  grid: FloorGrid,
  floor: number,
  row: number,
  col: number,
  states: ReadonlyMap<string, string>
): { address: string; state: string; move: "lift" | "set" } | undefined => {
  const stones = stonesAt(grid, floor, row, col, states)
  if (!stones) return undefined
  const press = pressAt(grid, floor, row, col, states)
  if (!press || press.state === stones.state) return undefined
  return { ...press, move: arrangementOf(press.state).hand ? "lift" : "set" }
}

/** Whether a stone is in hand on this floor: some lock's stones stand in an arrangement its record lists as
 * carrying. */
export const isCarrying = (grid: FloorGrid, floor: number, states: ReadonlyMap<string, string>): boolean => {
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type !== "room" || !cell.mechanism?.carrying?.length) continue
      const state = storedAtCell(grid, floor, r, c, states) ?? cell.mechanism.initial
      if (cell.mechanism.carrying.includes(state)) return true
    }
  return false
}
```

- [ ] **Step 5: A plate offers its move**

In `src/app/SiteMap/useSiteNavigation.ts`:

1. Add `import { stoneMoveAt } from "@/game/stonePlay"`.
2. Widen the prompt types:

```ts
export type ArrivalPromptKind = "room" | "stairs" | "exit" | "obstacle" | "plate"
```

   and in `ArrivalPrompt`, after `invitation?: string`:

```ts
  /** On a `plate` prompt, which move standing there offers: the stone lifted off it, or set on it. */
  stone?: "lift" | "set"
```

3. Extend `offer` with the stone: add a last parameter `stone?: "lift" | "set"` and spread
   `...(stone ? { stone } : {})` into the object `setPrompt` receives.
4. Insert the plate branch right after the span block (the `if (span) { … return }`), before the comment
   "Completed cells just reposition the player":

```ts
      // A PLATE IS GROUND THAT OFFERS ITS STONE: written down by standing on it, like a sequence tile, and asked
      // before the completed-cell block because a plate is walked back to again and again. The move is read
      // again when the prompt is taken, so it is always the one the floor allows then.
      if (cell.type === "room" && cell.plate) {
        journeys.markCellExplored(sectionHash, edgeId, address)
        goHere()
        const offered = stoneMoveAt(grid, currentFloor, row, col, journeys.getMechanismStates(journeyId))
        if (offered)
          scheduleArrival(walkDelay(row, col), () =>
            offer(
              "plate",
              row,
              col,
              () => {
                const move = stoneMoveAt(grid, currentFloor, row, col, journeys.getMechanismStates(journeyId))
                if (move) journeys.setMechanismState(move.address, move.state)
              },
              undefined,
              undefined,
              undefined,
              offered.move
            )
          )
        return
      }
```

- [ ] **Step 6: Its words**

In `src/app/SiteMap/usePromptLabel.ts`, add to the `switch`:

```ts
        case "plate":
          return prompt.stone === "lift" ? t("ui.prompt.liftStone") : t("ui.prompt.setStone")
```

In `public/locales/en/common.json`, inside `"ui"` → `"prompt"`, after `"oneWay"`:

```json
      "oneWay": "Cross over — there is no way back",
      "liftStone": "Lift the stone",
      "setStone": "Set the stone on the plate"
```

and in `public/locales/nl/common.json`:

```json
      "oneWay": "Steek over — er is geen weg terug",
      "liftStone": "Til de steen op",
      "setStone": "Leg de steen op de plaat"
```

(`"oneWay"` loses nothing: the line is shown only to anchor the edit; it gains a trailing comma.)

- [ ] **Step 7: Run the tests, then look**

Run: `yarn vitest run src/game/mechanics/weights.spec.ts src/game/stonePlay.spec.ts src/app/SiteMap/stoneWalk.spec.tsx src/app/SiteMap/useSiteNavigation.spec.ts src/i18n/keys.spec.ts`
Expected: PASS.

Run: `yarn check-types && yarn lint`
Expected: clean.

In `Topology/Lock playground`, pick `twoStones`: walk to a plate holding a stone, lift it, set it on another.
The door opens when its plates agree. The plate still draws as a plain room marker (task 3 draws it). Record it.

- [ ] **Step 8: Commit**

```bash
git add src/game/mechanics/weights.ts src/game/mechanics/weights.spec.ts src/game/stonePlay.ts src/game/stonePlay.spec.ts src/game/testSupport/stoneFixtures.ts src/app/SiteMap/useSiteNavigation.ts src/app/SiteMap/usePromptLabel.ts src/app/SiteMap/stoneWalk.spec.tsx public/locales/en/common.json public/locales/nl/common.json
git commit -m "feat(stones): lift the stone, set it on the plate" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 3: The plate's three looks, and the explorer carrying

**Files:**
- Modify: `src/game/stonePlay.ts` (`PlateLook`, `plateLookOf`, `plateLookAt`)
- Create: `src/app/SiteMap/plateArt.ts` (`PLATE_TILE`)
- Modify: `src/app/SiteMap/nodeKinds.ts` (a stone plate is shape `plate`; never spent)
- Modify: `src/app/SiteMap/SiteMapView.tsx` (the plate sprite; no finished dim; no marker over the art; drawn under the explorer; `carrying`)
- Modify: `src/app/SiteMap/ExplorerDot.tsx` (`carrying` reaches `ExplorerFigure`)
- Modify: `src/app/SiteMap/Plate.stories.tsx` (the looks chosen from state, the explorer on them)
- Test: `src/game/stonePlay.spec.ts`, `src/app/SiteMap/plateDrawing.spec.tsx`, `src/app/SiteMap/ExplorerDot.spec.tsx`

**Interfaces:**
- Consumes: `stonesAt`, `isCarrying`, `arrangementOf` (task 2).
- Produces in `stonePlay.ts`: `type PlateLook = "raised" | "pressed" | "stone"`, `plateLookOf(holdsStone: boolean, standing: boolean): PlateLook`, `plateLookAt(grid, floor, row, col, states, standing: boolean): PlateLook | undefined`.
- Produces: `PLATE_TILE: Record<PlateLook, string>` in `plateArt.ts`.
- Produces: `nodeSpritesFor(grid, claims, floorTier, pendingCells?, mechanismStates?, floorIndex = 0, standingAt?: readonly [number, number])`; plate sprites keyed `plate:<r>,<c>`.
- Produces: `ExplorerDot` prop `carrying?: boolean`.

- [ ] **Step 1: Write the failing tests**

Append to `src/game/stonePlay.spec.ts` (extend the `./stonePlay` import with `plateLookAt, plateLookOf`):

```ts
describe("a plate's look", () => {
  it("is raised while empty and nobody stands on it, pressed while somebody does, and holds its stone either way", () => {
    expect(plateLookOf(false, false)).toBe("raised")
    expect(plateLookOf(false, true)).toBe("pressed")
    expect(plateLookOf(true, false)).toBe("stone")
    expect(plateLookOf(true, true)).toBe("stone")
  })

  it("is read off the arrangement the stones stand in", () => {
    const grid = floorOf(SHELF_AND_DOOR)
    const shelf = plateNamed(grid, "shelf")
    const p = plateNamed(grid, "p")
    expect(plateLookAt(grid, 0, shelf[0], shelf[1], new Map(), false)).toBe("stone")
    expect(plateLookAt(grid, 0, p[0], p[1], new Map(), false)).toBe("raised")
    expect(plateLookAt(grid, 0, p[0], p[1], new Map(), true)).toBe("pressed")
    const { address } = stonesAt(grid, 0, shelf[0], shelf[1], new Map())!
    expect(plateLookAt(grid, 0, shelf[0], shelf[1], new Map([[address, "+ hand"]]), false)).toBe("raised")
  })
})
```

Create `src/app/SiteMap/plateDrawing.spec.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { revealAll } from "@/game/gridNavigation"
import { parseLock } from "@/game/lockNotation"
import type { FloorGrid } from "@/game/siteTypes"
import { carveLockFloor } from "@/game/testSupport/lockFixtures"
import { SHELF_AND_DOOR, plateNamed } from "@/game/testSupport/stoneFixtures"
import { buildRoomClaims } from "./roomClaims"
import { nodeSpritesFor } from "./SiteMapView"
import { sharedTileUrl } from "./tileAssets"
import { PLATE_TILE } from "./plateArt"
import { shapeKindFor } from "./nodeKinds"
import "@/mods/registerModApps"

const lit = revealAll(carveLockFloor(parseLock(SHELF_AND_DOOR, "stones").lock, { weights: "stonePlate" }))
const sprites = (grid: FloorGrid, standingAt?: readonly [number, number]) =>
  nodeSpritesFor(grid, buildRoomClaims(grid), "expert", undefined, new Map(), 0, standingAt)
const spriteAt = (grid: FloorGrid, [r, c]: readonly [number, number], standingAt?: readonly [number, number]) =>
  sprites(grid, standingAt).find(s => s.key === `plate:${r},${c}`)

describe("a plate on the map", () => {
  it("is drawn in the shared art, with its stone while it holds one", () => {
    expect(spriteAt(lit, plateNamed(lit, "shelf"))?.url).toBe(sharedTileUrl(PLATE_TILE.stone))
    expect(spriteAt(lit, plateNamed(lit, "p"))?.url).toBe(sharedTileUrl(PLATE_TILE.raised))
  })

  it("is drawn pressed while the explorer stands on it", () => {
    const p = plateNamed(lit, "p")
    expect(spriteAt(lit, p, p)?.url).toBe(sharedTileUrl(PLATE_TILE.pressed))
  })

  it("is not drawn while its cell is still dark", () => {
    const [pr, pc] = plateNamed(lit, "p")
    const dark: FloorGrid = {
      ...lit,
      cells: lit.cells.map((row, r) =>
        row.map((cell, c) => (r === pr && c === pc && cell.type !== "empty" ? { ...cell, state: "fogged" as const } : cell))
      ),
    }
    expect(spriteAt(dark, [pr, pc])).toBeUndefined()
  })

  it("is shaped as ground, the home plate and every other alike", () => {
    for (const name of ["p", "shelf"]) {
      const [r, c] = plateNamed(lit, name)
      const cell = lit.cells[r][c]
      expect(cell.type === "room" && shapeKindFor(lit, r, c, cell)).toBe("plate")
    }
  })
})
```

Append to `src/app/SiteMap/ExplorerDot.spec.tsx`, inside `describe("ExplorerFigure, carrying", …)` after the two
`it`s (its `figure` helper mocks `./tileAssets` and re-imports the module; add a sibling helper for the dot):

```tsx
  it("the walking explorer is drawn carrying while a stone is in hand", async () => {
    vi.resetModules()
    vi.doMock("./tileAssets", async original => ({
      ...(await original<typeof import("./tileAssets")>()),
      sharedTileFrames: (prefix: string) =>
        ({ "explorer-s": ["walk.png"], "explorer-carry-s": ["carry.png"] })[prefix] ?? [],
    }))
    const { ExplorerDot: Dot } = await import("./ExplorerDot")
    const { container } = render(<Dot grid={grid} pos={[0, 1]} carrying />)
    expect(container.querySelector("img")?.getAttribute("src")).toBe("carry.png")
  })
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/stonePlay.spec.ts src/app/SiteMap/plateDrawing.spec.tsx src/app/SiteMap/ExplorerDot.spec.tsx`
Expected: FAIL: `plateLookOf`, `./plateArt` and the `carrying` prop do not exist; the home plate is shaped
`mechanism`, the others `puzzle`.

- [ ] **Step 3: The look, in the domain**

Append to `src/game/stonePlay.ts` (add `import type { RoomCell } from "./siteTypes"` beside `FloorGrid`):

```ts
/** A plate's three looks: raised (empty, nobody on it), pressed (somebody's weight on it, nothing else), and
 * pressed with a stone. A stone presses it whoever stands there. */
export type PlateLook = "raised" | "pressed" | "stone"

export const plateLookOf = (holdsStone: boolean, standing: boolean): PlateLook =>
  holdsStone ? "stone" : standing ? "pressed" : "raised"

/** How the plate at a cell looks now; nothing off a plate. `standing` is whether the explorer stands on it. */
export const plateLookAt = (
  grid: FloorGrid,
  floor: number,
  row: number,
  col: number,
  states: ReadonlyMap<string, string>,
  standing: boolean
): PlateLook | undefined => {
  const stones = stonesAt(grid, floor, row, col, states)
  if (!stones) return undefined
  const { plate } = grid.cells[row][col] as RoomCell & { plate: { id: string } }
  return plateLookOf(arrangementOf(stones.state).weighted.includes(plate.id), standing)
}
```

Create `src/app/SiteMap/plateArt.ts`:

```ts
import type { PlateLook } from "@/game/stonePlay"

/** The painting each look of a plate wears, from `tiles/default/`: one plate for every rank, three looks drawn in
 * one frame so they swap on a cell. */
export const PLATE_TILE: Record<PlateLook, string> = { raised: "plate", pressed: "plateDown", stone: "plateStone" }
```

- [ ] **Step 4: A plate is ground**

In `src/app/SiteMap/nodeKinds.ts`:
- `ShapeCell` gains `"plate"`: `Pick<RoomCell, "roomType" | "tags" | "stairId" | "family" | "sequenceTile" | "mechanism" | "plate">`.
- Replace

```ts
  // A sequence tile is ground with a glyph on it, whatever else its cell says.
  if (cell.sequenceTile) return "plate"
```

  with

```ts
  // A sequence tile and a stone's plate are ground stepped on, whatever else their cell says; the home plate's
  // record makes it no mechanism room.
  if (cell.sequenceTile || cell.plate) return "plate"
```

- In `isSpentAt`, the guard becomes `if (!cell.mechanism || cell.sequenceTile || cell.plate) return false`, and
  its comment gains: "nor are a lock's stones, which always have a move left".

- [ ] **Step 5: Draw the plate, and the explorer carrying**

In `src/app/SiteMap/ExplorerDot.tsx`:
- `Props` gains

```ts
  /** A stone in hand: drawn with the carrying frames, which fall back to the plain ones per facing. */
  carrying?: boolean
```

- the component destructures `carrying = false` and renders
  `<ExplorerFigure facing={facing} walking={walking} cellMs={segmentDuration} color={color} carrying={carrying} />`.

In `src/app/SiteMap/SiteMapView.tsx`:

1. Imports: `import { isCarrying, plateLookAt } from "@/game/stonePlay"` and `import { PLATE_TILE } from "./plateArt"`.
   Add a module constant beside the other ones above `nodeSpritesFor`:

```ts
const NO_STATES: ReadonlyMap<string, string> = new Map()
```

2. `nodeSpritesFor` gains a last parameter, after `floorIndex = 0`:

```ts
  /** Where the explorer stands once his walk has settled, for the plate he presses; unset while he walks. */
  standingAt?: readonly [number, number]
```

3. In its room loop, replace the line `} else if (kind === "stairhead") {` with

```ts
      } else if (cell.plate) {
        // A PLATE IS FLAT ON THE FLOOR, drawn in the cell-wide prop frame like an exit, in the look its stones and
        // the explorer's weight give it now. The shared painting, never a rank's: a plate is the same at every rank.
        const standing = standingAt !== undefined && standingAt[0] === r && standingAt[1] === c
        const look = plateLookAt(grid, floorIndex, r, c, mechanismStates ?? NO_STATES, standing)
        const url = look && sharedTileUrl(PLATE_TILE[look])
        if (!url) continue
        out.push({ footprint, key: `plate:${r},${c}`, url, x: cx - CELL / 2, y: cy + CELL / 2 - PROP_H, mirrored: false })
      } else if (kind === "stairhead") {
```

4. In the component, move the block that declares `settledExplorerPos` and `isTraveling` (the `useState` and the
   `const isTraveling = …`, with their comment) up to just above `const nodeSprites = useMemo(`, and make the memo

```ts
  const nodeSprites = useMemo(
    () =>
      nodeSpritesFor(
        grid,
        claims,
        tier,
        pendingCells,
        mechanismStates,
        currentFloor ?? 0,
        isTraveling ? undefined : settledExplorerPos
      ),
    [grid, claims, tier, pendingCells, mechanismStates, currentFloor, isTraveling, settledExplorerPos]
  )
```

5. A plate is stood ON, so it never wins the floor-line tie: in `standing`, the `atExplorer` line becomes

```ts
      atExplorer:
        standingOn !== null &&
        !sprite.key.startsWith("drop:") &&
        !sprite.key.startsWith("plate:") &&
        sprite.footprint.includes(standingOn),
```

   and the comment above it gains: "A plate is the other: he stands on it, so it is always under him."

6. In the room cell rendering: `isCompleted` becomes
   `(state === "completed" && !staysOpen(cell) && !cell.sequenceTile && !cell.plate) || spent`, its comment gains
   "a plate is ground, walked again and again"; add beside `hasExit`

```ts
                // A PAINTED PLATE IS THE NODE, as a flight is: the vector slab underneath has nothing more to say.
                const hasPlate = !!cell.plate && !!sharedTileUrl(PLATE_TILE.raised)
```

   and the marker's opacity condition becomes `sealedWay || hasStair || hasExit || hasPlate ? 0 : …`.

7. The explorer carrying: above the `return (`, add

```ts
  const carrying = useMemo(
    () => isCarrying(grid, currentFloor ?? 0, mechanismStates ?? NO_STATES),
    [grid, currentFloor, mechanismStates]
  )
```

   and pass `carrying={carrying}` to `<ExplorerDot … />`.

- [ ] **Step 6: Stage the looks, the explorer on them** (designer request)

In `src/app/SiteMap/Plate.stories.tsx`, keep `PlateStage` and add, above `PlateSheet`, a stage that chooses each
look from state through the core function and puts the explorer on the plate:

```tsx
import { ExplorerFigure } from "./ExplorerDot"
import { plateLookOf } from "@/game/stonePlay"
import { PLATE_TILE } from "./plateArt"

// The plate as play draws it: the look is chosen from state by the game's own `plateLookOf`, and the explorer
// stands on the plate (walking frames, or carrying frames with a stone in hand) the way the map draws him.
const CASES: { name: string; holdsStone: boolean; standing: boolean; carrying: boolean }[] = [
  { name: "raised: empty, nobody on it", holdsStone: false, standing: false, carrying: false },
  { name: "pressed: the explorer's weight", holdsStone: false, standing: true, carrying: false },
  { name: "pressed: carrying, on an empty plate", holdsStone: false, standing: true, carrying: true },
  { name: "with a stone: nobody on it", holdsStone: true, standing: false, carrying: false },
  { name: "with a stone: the explorer on it", holdsStone: true, standing: true, carrying: false },
]

const InPlayStage: FC<{ tier: "starter" | "expert"; zoom: number }> = ({ tier, zoom }) => {
  const palette = tierPalette[tier]
  const floor = tileUrl(tier, "floor")
  return (
    <div className="flex flex-wrap gap-4">
      {CASES.map(({ name, holdsStone, standing, carrying }) => {
        const src = sharedTileUrl(PLATE_TILE[plateLookOf(holdsStone, standing)])
        return (
          <figure key={name} className="m-0 flex flex-col gap-1">
            <div
              className="relative overflow-hidden"
              style={{
                width: CELL * 2 * zoom,
                height: (WALL_H + CELL * 2) * zoom,
                background: floor ? `url(${floor})` : palette.slab,
                backgroundSize: `${CELL * 8 * zoom}px ${CELL * 8 * zoom}px`,
                imageRendering: ART_IMAGE_RENDERING,
              }}
            >
              {/* One map cell, centred, drawn at map scale and zoomed as a whole, as the map draws it. */}
              <div
                className="absolute"
                style={{ left: 0, top: 0, width: CELL * 2, height: WALL_H + CELL * 2, transform: `scale(${zoom})`, transformOrigin: "0 0" }}
              >
                {src && (
                  <img
                    src={src}
                    alt=""
                    className="absolute"
                    style={{ left: CELL / 2, top: WALL_H + CELL * 1.5 - PROP_H, width: CELL, height: PROP_H }}
                  />
                )}
                {standing && (
                  <div className="absolute" style={{ left: CELL, top: WALL_H + CELL, width: 0, height: 0 }}>
                    <ExplorerFigure facing="s" carrying={carrying} />
                  </div>
                )}
              </div>
            </div>
            <figcaption className="text-[10px] text-white/70">
              {tier}, {zoom}x: {name}
            </figcaption>
          </figure>
        )
      })}
    </div>
  )
}
```

Add to `PlateSheet`, below the existing row:

```tsx
    <h2 className="m-0 text-sm text-white/80">in play: the look chosen from state, the explorer on the plate</h2>
    <InPlayStage tier="starter" zoom={zoom} />
    <InPlayStage tier="expert" zoom={zoom} />
```

Change the file's opening comment's sentence "Nothing in the app draws it yet; this story stages it the way the
renderer will" to "The map draws it (`nodeSpritesFor`); this story stages it the way the map does". The explorer
cell's centre is `(CELL, WALL_H + CELL)` inside the stage, the plate's frame bottom sits on the cell's floor line
`WALL_H + CELL * 1.5`, as `nodeSpritesFor` places it (`cy + CELL / 2 - PROP_H`).

- [ ] **Step 7: Run the tests**

Run: `yarn vitest run src/game/stonePlay.spec.ts src/app/SiteMap/plateDrawing.spec.tsx src/app/SiteMap/ExplorerDot.spec.tsx src/app/SiteMap/SiteMapView.spec.tsx src/app/SiteMap/sequenceWalk.spec.tsx src/app/SiteMap/spentActivator.spec.tsx`
Expected: PASS (the sequence and spent-torch specs pin that the shape and `isSpentAt` changes leave tiles and
torches as they were).

Run: `yarn check-types && yarn lint`
Expected: clean.

- [ ] **Step 8: Look at it**

`Topology/Plate`: the in-play row shows five cells at 1x and 3x; the explorer stands ON the plate (his feet on
the slab, not in front of it), the carrying frames on the third. `Topology/Lock playground` → `twoStones`: the
plates draw raised, with a stone, and pressed under the explorer; while a stone is in hand he walks carrying; no
plate dims or wears a ✓ once walked. Record what you saw; the designer judges.

- [ ] **Step 9: Commit**

```bash
git add src/game/stonePlay.ts src/game/stonePlay.spec.ts src/app/SiteMap/plateArt.ts src/app/SiteMap/nodeKinds.ts src/app/SiteMap/SiteMapView.tsx src/app/SiteMap/ExplorerDot.tsx src/app/SiteMap/ExplorerDot.spec.tsx src/app/SiteMap/plateDrawing.spec.tsx src/app/SiteMap/Plate.stories.tsx
git commit -m "feat(stones): plates drawn raised, pressed or holding a stone; the explorer carries it" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 4: The explorer's weight presses a plate

His weight moves a plate's ways while he stands on it, in the drawing only. The grid the walk, the offers and the
save read is never touched, so a way held only by his weight is never on a route (designer, 2026-10-06).

**Files:**
- Modify: `src/game/mechanics/weights.ts` (`Arrangements.underfoot`; `WEIGHTS` and `compileWeights` carry it)
- Modify: `src/game/obstacles.ts` (`WeightsControl.underfoot`)
- Modify: `src/game/siteTypes.ts` (`MechanismRecord.underfoot`)
- Modify: `src/game/mechanics/realisations.spec.ts` (its `WeightsControl` literal gains `underfoot: []`)
- Modify: `src/game/stonePlay.ts` (`ExplorerWeight`, `explorerWeight`)
- Modify: `src/app/SiteMap/SiteMapView.tsx` (gate leaves drawn as his weight leaves them)
- Test: `src/game/mechanics/weights.spec.ts`, `src/game/stonePlay.spec.ts`, `src/app/SiteMap/plateDrawing.spec.tsx`, `src/app/SiteMap/stoneWalk.spec.tsx`

**Interfaces:**
- Produces: `Arrangements.underfoot: { from: string; plate: string; opens: string[] }[]` and the same field on `WeightsControl`.
- Produces: `MechanismRecord.underfoot?: { from: string; at: readonly [number, number]; opens: { gateKeyId: string; mode?: "any" }[] }[]`.
- Produces in `stonePlay.ts`: `type ExplorerWeight = { plate: readonly [number, number]; open: ReadonlySet<string>; shut: ReadonlySet<string> }` (gate keys), `explorerWeight(grid, floor, at: readonly [number, number], states, heldKeys?: ReadonlySet<string>): ExplorerWeight | undefined`.
- Produces: `nodeSpritesFor(…, standingAt?, weight?: ExplorerWeight)`.

- [ ] **Step 1: Write the failing tests**

Append to `src/game/mechanics/weights.spec.ts`:

```ts
describe("the explorer's weight", () => {
  it("lists, for every arrangement and every plate empty in it, what pressing that plate opens", () => {
    const { underfoot } = stoneArrangements(lockOf("in -[b]- out\nb plate @in\na plate @in stone"))
    expect(underfoot).toEqual([
      { from: "a", plate: "b", opens: ["in-out"] },
      { from: "+ hand", plate: "a", opens: [] },
      { from: "+ hand", plate: "b", opens: ["in-out"] },
      { from: "b", plate: "a", opens: ["in-out"] },
    ])
  })

  it("shuts an :empty way while the plate it waits on is pressed", () => {
    const { underfoot } = stoneArrangements(lockOf("in -[b:empty]- out\nb plate @in\na plate @in stone"))
    expect(underfoot).toContainEqual({ from: "a", plate: "b", opens: [] })
  })

  it("is placed at the pressed plate's cell, each gate as its door asks for it", () => {
    const record = recordOf("in -[b]- out\nb plate @in\na plate @in stone")
    expect(record.underfoot).toContainEqual({ from: "a", at: [0, 2], opens: [{ gateKeyId: "k:in-out" }] })
  })
})
```

Append to `src/game/stonePlay.spec.ts` (extend the import with `explorerWeight`; add
`import { openDoorsFor } from "./mechanismDoors"`):

```ts
describe("explorerWeight", () => {
  const doorKeyOf = (grid: ReturnType<typeof floorOf>) =>
    grid.cells.flat().flatMap(cell => (cell.type === "room" && cell.tags?.includes("gate") ? [cell.requiredKeyId!] : []))[0]

  it("opens a way waiting for a stone while he stands on its empty plate", () => {
    const grid = floorOf(SHELF_AND_DOOR)
    const weight = explorerWeight(grid, 0, plateNamed(grid, "p"), new Map())
    expect(weight?.open).toEqual(new Set([doorKeyOf(grid)]))
    expect(weight?.shut).toEqual(new Set())
    expect(openDoorsFor(grid, 0, new Map()).has(doorKeyOf(grid))).toBe(false)
  })

  it("shuts a way waiting for an empty plate while he stands on it", () => {
    const grid = floorOf("in -- hall\nhall -[p:empty]- out\np plate @hall\nshelf plate @in stone\nin ?\nhall ?\nout ?")
    const weight = explorerWeight(grid, 0, plateNamed(grid, "p"), new Map())
    expect(weight?.shut).toEqual(new Set([doorKeyOf(grid)]))
  })

  it("moves nothing on a plate that already holds a stone, nor off a plate", () => {
    const grid = floorOf(SHELF_AND_DOOR)
    expect(explorerWeight(grid, 0, plateNamed(grid, "shelf"), new Map())).toBeUndefined()
    expect(explorerWeight(grid, 0, grid.entrancePos, new Map())).toBeUndefined()
  })

  it("leaves a lever its say: a plate-and-lever door stays shut while the lever is", () => {
    const grid = carveLockFloor(parseLock("in -[p+L]- out\np plate @in\nshelf plate @in stone\nL toggle @in\nin ?\nout ?", "stones").lock, {
      weights: "stonePlate",
      toggle: "handle",
    })
    const weight = explorerWeight(grid, 0, plateNamed(grid, "p"), new Map())
    expect(weight?.open).toEqual(new Set())
  })
})
```

The last case checks the lever's initial side shuts the door (`L` starts in `a`, and only `b` would name it, per
`DEFAULT_STATES` in `lockNotation.ts`: a toggle's gates open in its second state). If the carve opens the door
with the lever untouched, read `openDoorsFor(grid, 0, new Map())` first and assert the weight's `open` adds
nothing beyond it.

Append to `src/app/SiteMap/plateDrawing.spec.tsx` (add `import { explorerWeight } from "@/game/stonePlay"`):

```tsx
describe("a door under the explorer's weight", () => {
  it("draws its leaf swung open while he presses its plate, and shut once he steps off", () => {
    const p = plateNamed(lit, "p")
    const door = lit.cells.flatMap((row, r) =>
      row.flatMap((cell, c) => (cell.type === "room" && cell.tags?.includes("gate") ? [[r, c] as const] : []))
    )[0]
    const leaf = (weight?: ReturnType<typeof explorerWeight>) =>
      nodeSpritesFor(lit, buildRoomClaims(lit), "expert", undefined, new Map(), 0, p, weight).find(
        s => s.key === `gate:${door[0]},${door[1]}` || s.key === `wall:${door[0]},${door[1]}`
      )
    expect(leaf(explorerWeight(lit, 0, p, new Map()))?.url).toMatch(/gate-open/)
    expect(leaf(undefined)?.url).not.toMatch(/gate-open/)
  })
})
```

Append to `src/app/SiteMap/stoneWalk.spec.tsx`:

```tsx
describe("standing on a plate", () => {
  it("leaves the way it would open shut for the walk: the door is still a door and no gate key is held", () => {
    const h = play(SHELF_AND_DOOR)
    h.walkTo(plateNamed(h.grid, "p"))
    const { grid, openGateKeys } = h.current()
    expect(openGateKeys.size).toBe(0)
    expect(grid!.cells.flat().some(cell => cell.type === "room" && cell.tags?.includes("gate"))).toBe(true)
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/mechanics/weights.spec.ts src/game/stonePlay.spec.ts src/app/SiteMap/plateDrawing.spec.tsx src/app/SiteMap/stoneWalk.spec.tsx`
Expected: FAIL: `underfoot` and `explorerWeight` do not exist; `nodeSpritesFor` takes no weight. The walk test
passes already (the walk was never told about weight); it stays as the pin.

- [ ] **Step 3: The arrangements list what his weight opens**

In `src/game/mechanics/weights.ts`:

- `Arrangements` gains, after `carrying`:

```ts
  /** For every arrangement and every plate empty in it, the gates open once the explorer's own weight presses that
   * plate. Only drawing reads it; the walk never does, so a way his weight alone holds is never on a route. */
  underfoot: { from: string; plate: string; opens: string[] }[]
```

- In `stoneArrangements`, replace the `return { … }` with a fold shared by both:

```ts
  const opening = (stones: Stones) =>
    gates
      .filter(({ id, terms, any }) =>
        any ? terms.some(t => says(weights, id, t, stones)) : terms.every(t => says(weights, id, t, stones))
      )
      .map(({ id }) => id)
  const plates = Object.keys(weights.plates).sort()
  return {
    states: [...found.keys()],
    initial: keyOf(start),
    moves,
    opens: Object.fromEntries([...found].map(([key, stones]) => [key, opening(stones)])),
    carrying: [...found].filter(([, stones]) => stones.hand).map(([key]) => key),
    underfoot: [...found].flatMap(([key, stones]) =>
      plates
        .filter(plate => !stones.weighted.has(plate))
        .map(plate => ({
          from: key,
          plate,
          opens: opening({ weighted: new Set([...stones.weighted, plate]), hand: stones.hand }),
        }))
    ),
  }
```

- In `WEIGHTS.compileLock`, destructure `underfoot` too
  (`const { states, initial, moves, opens, carrying, underfoot } = stoneArrangements(renamed)`) and add
  `underfoot,` after `carrying,` in the control.
- In `compileWeights`, after `carrying: control.carrying,`:

```ts
  underfoot: control.underfoot.map(({ from, plate, opens }) => ({ from, at: cellOf(plate), opens: opens.map(gate) })),
```

In `src/game/obstacles.ts`, `WeightsControl` gains after `carrying: string[]`:

```ts
  /** What the explorer's own weight opens, standing on a plate empty in `from`: gate ids (namespaced). */
  underfoot: { from: string; plate: string; opens: string[] }[]
```

In `src/game/siteTypes.ts`, `MechanismRecord` gains after `carrying?: string[]`:

```ts
  /** WHAT THE EXPLORER'S OWN WEIGHT MAKES OF AN ARRANGEMENT: standing at the empty plate `at` while the stones stand
   * in `from`, the gates they then open. Read only to draw the floor while he stands there; the walk never reads
   * it, so a way his weight alone holds is never on a route. */
  underfoot?: { from: string; at: readonly [number, number]; opens: { gateKeyId: string; mode?: "any" }[] }[]
```

In `src/game/mechanics/realisations.spec.ts`, the `stones` control literal gains `underfoot: [],` after
`carrying: ["+ hand"],`.

- [ ] **Step 4: His weight, as the doors it moves**

Append to `src/game/stonePlay.ts` (add `openDoorsFor` to the `./mechanismDoors` import and `MechanismRecord` to
the `./siteTypes` type import):

```ts
/** What the explorer's weight moves while he stands on a plate: the gate keys it opens and the ones it shuts. */
export type ExplorerWeight = { plate: readonly [number, number]; open: ReadonlySet<string>; shut: ReadonlySet<string> }

// The two positions the weighed record is read in: the arrangement his weight makes, and one nothing stands in.
const WEIGHED = "weighed"
const NEVER = "never"

/**
 * WHAT HIS WEIGHT DOES, standing at `at`: nothing off a plate or on one that holds a stone already. Otherwise the
 * doors are folded twice by `openDoorsFor`, once as the stones stand and once as his weight makes them, and the
 * difference is what moves. Every gate the stones name stays theirs under his weight, said no to under `NEVER`
 * where the weighed arrangement does not open it, so a door they share with a lever is still theirs to refuse.
 */
export const explorerWeight = (
  grid: FloorGrid,
  floor: number,
  at: readonly [number, number],
  states: ReadonlyMap<string, string>,
  heldKeys?: ReadonlySet<string>
): ExplorerWeight | undefined => {
  const [row, col] = at
  const stones = stonesAt(grid, floor, row, col, states)
  const worked = mechanismWorkedAt(grid, row, col)
  if (!stones || !worked) return undefined
  const pressed = worked.record.underfoot?.find(u => u.from === stones.state && u.at[0] === row && u.at[1] === col)
  if (!pressed) return undefined
  const named = new Map(worked.record.positions.map(p => [p.gateKeyId, p.mode]))
  const record: MechanismRecord = {
    ...worked.record,
    positions: [
      ...pressed.opens.map(open => ({ state: WEIGHED, ...open })),
      ...[...named]
        .filter(([gateKeyId]) => !pressed.opens.some(open => open.gateKeyId === gateKeyId))
        .map(([gateKeyId, mode]) => ({ state: NEVER, gateKeyId, ...(mode ? { mode } : {}) })),
    ],
  }
  const [hr, hc] = worked.home
  const weighed: FloorGrid = {
    ...grid,
    cells: grid.cells.map((cells, r) =>
      r !== hr ? cells : cells.map((cell, c) => (c === hc && cell.type === "room" ? { ...cell, mechanism: record } : cell))
    ),
  }
  const before = openDoorsFor(grid, floor, states, heldKeys)
  const after = openDoorsFor(weighed, floor, new Map(states).set(stones.address, WEIGHED), heldKeys)
  return {
    plate: at,
    open: new Set([...after].filter(key => !before.has(key))),
    shut: new Set([...before].filter(key => !after.has(key))),
  }
}
```

`openDoorsFor` reads the home's state through `storedAtCell`, keyed by the home's `cellAddress`, which is the
`address` `stonesAt` returns (`mechanismAddress`), so the override lands on the entry it reads.

- [ ] **Step 5: Draw the doors his weight moves**

In `src/app/SiteMap/SiteMapView.tsx`:

1. Import `explorerWeight, type ExplorerWeight` from `@/game/stonePlay`.
2. `nodeSpritesFor` gains a last parameter after `standingAt`:

```ts
  /** What the explorer's weight moves while he stands on a plate: drawn so, never walked so. */
  weight?: ExplorerWeight
```

3. The open-gate corridor call becomes

```ts
        gateLeaf(r, c, cell.difficulty ?? floorTier, cell.dirs, {
          open: !weight?.shut.has(cell.openGate.requiredKeyId ?? ""),
          wall: false,
          mark: cell.openGate.mark,
        })
```

   and the shut gate's

```ts
        gateLeaf(r, c, tier, cell.dirs, {
          open: cell.state === "completed" || (weight?.open.has(cell.requiredKeyId ?? "") ?? false),
          wall: isSealedWayOut(cell),
          mark: cell.mark,
        })
```

   with a comment above the first: "A way the explorer's weight shuts is drawn shut while he stands there; the
   walk still reads the corridor it is." A barred region (water, sand) is not redrawn under his weight: its cover
   is drawn from the grid (`regionBarrierCovers`).
4. In the component, beside `carrying`, compute his weight from where he has settled, and pass it on:

```ts
  const weight = useMemo(
    () =>
      isTraveling || !settledExplorerPos
        ? undefined
        : explorerWeight(grid, currentFloor ?? 0, settledExplorerPos, mechanismStates ?? NO_STATES, ownedKeys),
    [grid, currentFloor, settledExplorerPos, isTraveling, mechanismStates, ownedKeys]
  )
```

   It must be declared above `nodeSprites` (after the moved `settledExplorerPos`); `nodeSprites` passes `weight`
   as its last argument and lists it in its dependencies.

- [ ] **Step 6: Run the tests and the bake**

Run: `yarn vitest run src/game/mechanics src/game/stonePlay.spec.ts src/game/weightsPlates.spec.ts src/app/SiteMap/plateDrawing.spec.tsx src/app/SiteMap/stoneWalk.spec.tsx src/game/lockCompile.spec.ts`
Expected: PASS.

Run: `yarn check-types && yarn lint`
Expected: clean.

Run: `yarn generate-world && git diff --exit-code src/data/generatedWorld.ts src/data/carveLedger.json; echo $?`
Expected: `0`.

- [ ] **Step 7: Look at it**

Playground, `twoStones`: stand on the empty `door` plate: it draws pressed and the vault's door draws swung open;
tap beyond it: nothing is offered; step off: it shuts. Record it.

- [ ] **Step 8: Commit**

```bash
git add src/game/mechanics/weights.ts src/game/mechanics/weights.spec.ts src/game/obstacles.ts src/game/siteTypes.ts src/game/mechanics/realisations.spec.ts src/game/stonePlay.ts src/game/stonePlay.spec.ts src/app/SiteMap/SiteMapView.tsx src/app/SiteMap/plateDrawing.spec.tsx src/app/SiteMap/stoneWalk.spec.tsx
git commit -m "feat(stones): the explorer's weight presses a plate while he stands on it" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 5: A carrying walk is turned away, and says why

**Files:**
- Modify: `src/game/oneWayRealisation.ts` (`handsFull`)
- Modify: `src/mods/topology/game/zipline/meta.ts` (the zipline declares it)
- Modify: `src/app/SiteMap/useSiteNavigation.ts` (`BlockedNotice`, `notice`; stairs, way out, span)
- Create: `src/ui/atoms/MapNotice.tsx`, `src/ui/atoms/MapNotice.stories.tsx`
- Modify: `src/app/SiteMap/SiteMapView.tsx` (`notice` prop drawn where the prompt is)
- Modify: `src/app/SiteMap/usePromptLabel.ts` (`noticeLabel`)
- Modify: `src/app/SiteMap/SiteMapScreen.tsx`, `src/app/SiteMap/lockPlayground.testing.tsx` (pass the notice)
- Modify: `public/locales/en/common.json`, `public/locales/nl/common.json` (`ui.blocked.*`)
- Modify: `src/i18n/keys.spec.ts` (one-way realisations' declared lines are in both locales)
- Test: `src/app/SiteMap/stoneWalk.spec.tsx`, `src/game/weightsPlates.spec.ts`, `src/i18n/keys.spec.ts`

**Interfaces:**
- Consumes: `isCarrying` (task 2), `stoneFloor`, `plateNamed` (task 2), `carvePlayground` (task 1).
- Produces: `OneWayRealisationMeta.handsFull?: string`.
- Produces: `export type BlockedNotice = { at: readonly [number, number]; line?: string }` and `SiteNavigation.notice: BlockedNotice | null`.
- Produces: `MapNotice: FC<{ label: string }>`; `SiteMapView` prop `notice?: { label: string; at: readonly [number, number] } | null`.
- Produces: `usePromptLabel` returns the same function; a sibling hook `useNoticeLabel(): (notice: BlockedNotice) => string` in `usePromptLabel.ts`.

- [ ] **Step 1: Write the failing tests**

Append to `src/app/SiteMap/stoneWalk.spec.tsx` (add `import { oneWayRuns } from "@/game/gridNavigation"`):

```tsx
describe("a carrying walk", () => {
  const OPEN = "in -- out\nshelf plate @in stone\nin ?\nout ?"
  const lift = (h: ReturnType<typeof play>) => {
    h.walkTo(plateNamed(h.grid, "shelf"))
    act(() => h.current().prompt!.take())
    h.settle()
  }

  it("is turned away at the way out: no prompt, the line that says why", () => {
    const h = play(OPEN)
    lift(h)
    h.walkTo(h.grid.exitPos)
    expect(h.current().prompt).toBeNull()
    expect(h.current().notice).toEqual({ at: h.grid.exitPos })
  })

  it("is offered the way out again once the hands are empty", () => {
    const h = play(OPEN)
    h.walkTo(h.grid.exitPos)
    expect(h.current().prompt).toMatchObject({ kind: "exit" })
    expect(h.current().notice).toBeNull()
  })

  it("is turned away at the stairs back up, as at the way down", () => {
    const config = stoneFloor(OPEN, { entrance: "stairhead" })
    const carved = carvePlayground(config)
    if (!carved.found) throw new Error(JSON.stringify(carved.reasons))
    const h = { ...sequenceHarness(carved.seed, config), grid: carved.grid }
    lift(h)
    h.walkTo(h.grid.entrancePos)
    expect(h.current().prompt).toBeNull()
    expect(h.current().notice).toEqual({ at: h.grid.entrancePos })
  })

  it("is turned away at a zipline's launch with the line the zipline declares", () => {
    const config = stoneFloor("in -- yard\nyard >> out\nshelf plate @yard stone\nin ?\nyard ?\nout ?", {
      realisations: { weights: "stonePlate", "one-way": "zipline" },
    })
    const carved = carvePlayground(config)
    if (!carved.found) throw new Error(JSON.stringify(carved.reasons))
    const h = { ...sequenceHarness(carved.seed, config), grid: carved.grid }
    lift(h)
    const { launch } = oneWayRuns(h.grid)[0]
    h.walkTo(launch)
    expect(h.current().prompt).toBeNull()
    expect(h.current().notice).toEqual({ at: launch, line: "ui.blocked.zipline" })
  })

  it("forgets the line at the next tap", () => {
    const h = play(OPEN)
    lift(h)
    h.walkTo(h.grid.exitPos)
    h.walkTo(plateNamed(h.grid, "shelf"))
    expect(h.current().notice).toBeNull()
  })
})
```

Append to `src/game/weightsPlates.spec.ts`, inside `describe("a stone lock on a floor", …)` (add
`import { assembleFloor } from "./siteAssembler"` and `import type { FloorConfig } from "./siteTypes"`):

```ts
  it("leaves by the stairs down only with empty hands, as by the way out", () => {
    const config: FloorConfig = {
      pathPuzzles: 0,
      difficulty: "expert",
      end: "treasure",
      exitOrStaircase: "staircase",
      sideSections: [],
      locks: [{ lock: parseLock(STONES, "stones").lock }],
      realisations: { weights: "stonePlate" },
    }
    const grid = Array.from({ length: 30 }, (_, seed) => assembleFloor("test", config, seed + 1)).find(r => r.success)
    if (!grid?.success) throw new Error("no seed carved the stair floor")
    const [er, ec] = grid.grid.exitPos
    const exit = grid.grid.cells[er][ec]
    expect(exit.type === "room" && exit.stairId).toBeTruthy()
    expect(floorLock(grid.grid)!.leaveWith).toEqual([{ mechanism: expect.any(String), notIn: ["+ hand"] }])
  })
```

Append to `src/i18n/keys.spec.ts`, inside the `describe` (add `import { MOD_ONE_WAY_REALISATIONS } from "@/mods/registeredMods"`):

```ts
  it("covers the lines every one-way realisation declares", () => {
    const en = shippedKeys("en")
    const nl = shippedKeys("nl")
    const lines = MOD_ONE_WAY_REALISATIONS.flatMap(meta => [meta.prompt, meta.handsFull]).filter(
      (key): key is string => key !== undefined
    )
    expect(lines).not.toEqual([])
    expect(lines.filter(key => !en.has(key) || !nl.has(key))).toEqual([])
  })
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/app/SiteMap/stoneWalk.spec.tsx src/game/weightsPlates.spec.ts src/i18n/keys.spec.ts`
Expected: FAIL: `notice` is undefined and the exit and stairs still offer themselves. The stairs-down engine test
passes at once (probed at `4a370b2c`); it stays as the pin that stairs are covered.

- [ ] **Step 3: A realisation says it needs both hands**

In `src/game/oneWayRealisation.ts`, `OneWayRealisationMeta` gains after `prompt?: string`:

```ts
  /** Locale key of the line a carrying walk is turned away with at the launch: this crossing needs both hands. Unset
   * where a stone may be carried across. */
  handsFull?: string
```

In `src/mods/topology/game/zipline/meta.ts`, `ZIPLINE_META` gains `handsFull: "ui.blocked.zipline",` and its
comment gains: "It needs both hands, so a stone is never carried across."

- [ ] **Step 4: Navigation turns a carrying walk away**

In `src/app/SiteMap/useSiteNavigation.ts`:

1. Import `isCarrying` from `@/game/stonePlay` (beside `stoneMoveAt`).
2. Add after `ArrivalPrompt`:

```ts
/** Why the explorer stopped where he did: a stone in hand where it may not go. `line` is the locale key a
 * realisation declared; unset, it is the floor's own: set the stone down first. Nothing to take. */
export type BlockedNotice = { at: readonly [number, number]; line?: string }
```

3. `SiteNavigation` gains

```ts
  /** Why the walk went no further, beside the explorer, or null. Never beside a prompt. */
  notice: BlockedNotice | null
```

4. In the hook: `const [notice, setNotice] = useState<BlockedNotice | null>(null)`; where `onCellClick` clears the
   prompt (`setPrompt(null)` after the guard block) also call `setNotice(null)`; and below `walkDelay`:

```ts
  // A STONE NEVER LEAVES ITS FLOOR, and some crossings need both hands: such a walk ends where the player stands
  // and says why, instead of offering the way on.
  const turnAway = useCallback(
    (row: number, col: number, line?: string) =>
      scheduleArrival(walkDelay(row, col), () => setNotice({ at: [row, col], ...(line ? { line } : {}) })),
    [scheduleArrival, walkDelay]
  )
```

5. In `onCellClick`, after `const goHere = …`:

```ts
      const carrying = isCarrying(grid, currentFloor, journeys.getMechanismStates(journeyId))
```

   - stairs branch: after `goHere()`, insert `if (carrying) return turnAway(row, col)`;
   - way-out branch: after `goHere()`, insert `if (carrying) return turnAway(row, col)`;
   - span branch: after `goHere()` and the `traversal` const, insert

```ts
        const handsFull = resolveOneWay(span.kind)?.handsFull
        if (carrying && handsFull) return turnAway(row, col, handsFull)
```

   Each `return turnAway(…)` returns `void` from a `void` callback, which TypeScript accepts; if lint objects to
   returning a call, write it as two statements.
6. Add `turnAway` to the `onCellClick` dependency list, and `notice` to the hook's return:
   `return { onCellClick, prompt, notice, explorerHidden }`.

- [ ] **Step 5: The notice, drawn**

Create `src/ui/atoms/MapNotice.tsx`:

```tsx
import type { FC } from "react"

// Why the explorer stopped, said beside him where a prompt would stand. A remark, not a button: there is nothing
// to take, and the next tap on the map clears it.
export const MapNotice: FC<{ label: string }> = ({ label }) => (
  <p
    role="status"
    className="m-0 rounded-full border border-stone-500/70 bg-stone-900/90 px-3 py-1 text-xs whitespace-nowrap text-stone-200 italic shadow-lg"
  >
    {label}
  </p>
)
```

Create `src/ui/atoms/MapNotice.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react-vite"
import { MapNotice } from "./MapNotice"

const meta = {
  component: MapNotice,
  parameters: { layout: "centered" },
  decorators: [
    Story => (
      <div className="flex h-32 w-72 items-center justify-center bg-stone-800">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MapNotice>

export default meta
type Story = StoryObj<typeof meta>

export const SetTheStoneDown: Story = { args: { label: "Set the stone down first" } }

export const BothHands: Story = { args: { label: "You need both hands for the zipline" } }
```

In `src/app/SiteMap/SiteMapView.tsx`: import `MapNotice` from `@/ui/atoms/MapNotice`; `Props` gains

```ts
  /** Why the explorer stopped, drawn where the prompt is — see `useSiteNavigation`. */
  notice?: { label: string; at: readonly [number, number] } | null
```

destructure `notice`, and after the `{prompt && (…)}` block add the same placement for the notice:

```tsx
              {notice && (
                <div
                  data-map-notice=""
                  style={{
                    position: "absolute",
                    left: cellCenter(notice.at[0], notice.at[1]).cx,
                    top: cellCenter(notice.at[0], notice.at[1]).cy - CELL * 0.7,
                    transform: "translate(-50%, -100%)",
                  }}
                >
                  <MapNotice label={notice.label} />
                </div>
              )}
```

In `src/app/SiteMap/usePromptLabel.ts` add (import `BlockedNotice` beside `ArrivalPrompt`):

```ts
/** WHAT A NOTICE SAYS: the line a realisation declared, or the floor's own. */
export const useNoticeLabel = (): ((notice: BlockedNotice) => string) => {
  const { t } = useTranslation("common")
  return useCallback(
    (notice: BlockedNotice): string => (notice.line ? t(notice.line) : t("ui.blocked.setStoneDown")),
    [t]
  )
}
```

In `SiteMapScreen.tsx` and in `PlayedFloor` (`lockPlayground.testing.tsx`): destructure `notice` from
`useSiteNavigation`, `const noticeLabel = useNoticeLabel()`, and pass
`notice={notice && { label: noticeLabel(notice), at: notice.at }}` to `SiteMapView`.

- [ ] **Step 6: The words**

`public/locales/en/common.json`, inside `"ui"`, right after the `"prompt": { … }` object:

```json
    "blocked": {
      "setStoneDown": "Set the stone down first",
      "zipline": "You need both hands for the zipline"
    },
```

`public/locales/nl/common.json`, same place:

```json
    "blocked": {
      "setStoneDown": "Leg eerst de steen neer",
      "zipline": "Je hebt beide handen nodig voor de lijn"
    },
```

- [ ] **Step 7: Run the tests**

Run: `yarn vitest run src/app/SiteMap/stoneWalk.spec.tsx src/game/weightsPlates.spec.ts src/i18n/keys.spec.ts src/app/SiteMap/useSiteNavigation.spec.ts src/app/SiteMap/oneWayPrompt.spec.tsx src/app/SiteMap/SiteMapScreen.spec.tsx`
Expected: PASS.

Run: `yarn check-types && yarn lint`
Expected: clean.

- [ ] **Step 8: Look at it**

`UI/Atoms/MapNotice`, then the playground with `twoStones`: lift a stone and tap the way out; the explorer walks
there and the line shows over him, not a button; tap elsewhere and it goes. Record it.

- [ ] **Step 9: Commit**

```bash
git add src/game/oneWayRealisation.ts src/mods/topology/game/zipline/meta.ts src/app/SiteMap/useSiteNavigation.ts src/ui/atoms/MapNotice.tsx src/ui/atoms/MapNotice.stories.tsx src/app/SiteMap/SiteMapView.tsx src/app/SiteMap/usePromptLabel.ts src/app/SiteMap/SiteMapScreen.tsx src/app/SiteMap/lockPlayground.testing.tsx public/locales/en/common.json public/locales/nl/common.json src/i18n/keys.spec.ts src/app/SiteMap/stoneWalk.spec.tsx src/game/weightsPlates.spec.ts
git commit -m "feat(stones): a stone never leaves its floor, and the walk says so" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 6: A door shows the plates it waits for

**Files:**
- Modify: `src/game/siteTypes.ts` (`WeightTerm`; `MechanismRecord.weighs`)
- Modify: `src/game/obstacles.ts` (`WeightsControl.terms`)
- Modify: `src/game/mechanics/weights.ts` (`WEIGHTS.compileLock` lists each gate's terms; `compileWeights` carries them)
- Modify: `src/game/mechanics/realisations.spec.ts` (its literal gains `terms: {}`)
- Modify: `src/game/gateFace.ts` (stone markers; a door with a stone term wears a face)
- Modify: `src/mods/topology/app/gateFace/GateFaceComponent.tsx` (the plate and hands icons, their names)
- Modify: `public/locales/en/common.json`, `public/locales/nl/common.json` (`gateFace.owner.*`)
- Test: `src/game/mechanics/weights.spec.ts`, `src/game/gateFace.spec.ts`, `src/app/SiteMap/stoneWalk.spec.tsx`

**Interfaces:**
- Consumes: `arrangementOf` (task 2), `SHELF_AND_DOOR`, `plateNamed` (task 2).
- Produces: `type WeightTerm = { kind: "plate"; plate: string; wants: "stone" | "empty" } | { kind: "unladen" }` in `siteTypes.ts`.
- Produces: `WeightsControl.terms: Record<string, WeightTerm[]>` (gate id → terms) and `MechanismRecord.weighs?: { gateKeyId: string; terms: WeightTerm[] }[]`.
- Produces: `GateOwnerIcon` gains `{ kind: "plate"; wants: "stone" | "empty" } | { kind: "hands" }`; markers ids are plate ids or `"unladen"`.

- [ ] **Step 1: Write the failing tests**

Append to `src/game/mechanics/weights.spec.ts`:

```ts
describe("a gate's stone terms", () => {
  it("names each plate a gate waits on and what it wants of it, and empty hands", () => {
    const control = controlOf("in -[a+b:empty+unladen]- out\na plate @in stone\nb plate @in")
    expect(control.terms).toEqual({
      "in-out": [{ kind: "plate", plate: "a", wants: "stone" }, { kind: "plate", plate: "b", wants: "empty" }, { kind: "unladen" }],
    })
  })

  it("is carried on the record under the key the door asks for", () => {
    const record = recordOf("in -[b]- out\nb plate @in\na plate @in stone")
    expect(record.weighs).toEqual([{ gateKeyId: "k:in-out", terms: [{ kind: "plate", plate: "b", wants: "stone" }] }])
  })
})
```

If `parseLock` writes `b:empty` inside an `and` gate differently (check `lockNotation.ts`'s gate owner parsing for
`:empty`), write the gate as the notation accepts it and keep the three expected terms.

Append to `src/game/gateFace.spec.ts` (add imports: `import { parseLock } from "./lockNotation"`,
`import { carveLockFloor } from "./testSupport/lockFixtures"`, `import { SHELF_AND_DOOR } from "./testSupport/stoneFixtures"`):

```ts
describe("a door the stones hold", () => {
  const stoneFloor = (text: string) => carveLockFloor(parseLock(text, "stones").lock, { weights: "stonePlate" })
  const faceOf = (grid: FloorGrid, positions: ReadonlyMap<string, string> = new Map()) =>
    withGateFaces(grid, 0, positions, undefined, GATE_FACE_FAMILY)
      .cells.flat()
      .find((cell): cell is RoomCell => cell.type === "room" && cell.gateFace !== undefined)

  it("wears a face even with one plate, one marker per plate saying what it wants", () => {
    const door = faceOf(stoneFloor(SHELF_AND_DOOR))
    expect(door?.family).toBe(GATE_FACE_FAMILY)
    expect(door?.gateFace?.markers).toEqual([{ id: "stones.p", icon: { kind: "plate", wants: "stone" }, lit: false }])
  })

  it("lights a plate's marker once the plate agrees", () => {
    const grid = stoneFloor(SHELF_AND_DOOR)
    const home = grid.cells.flat().findIndex(cell => cell.type === "room" && cell.mechanism && cell.plate)
    const address = cellAddress(grid, 0, Math.floor(home / grid.cols), home % grid.cols)!
    expect(faceOf(grid, new Map([[address, "stones.p"]]))?.gateFace?.markers[0].lit).toBe(true)
  })

  it("marks a plate wanting none lit while it is empty, and empty hands lit while nothing is carried", () => {
    const door = faceOf(stoneFloor("in -[p:empty+unladen]- out\np plate @in\nshelf plate @in stone\nin ?\nout ?"))
    expect(door?.gateFace?.markers).toEqual([
      { id: "stones.p", icon: { kind: "plate", wants: "empty" }, lit: true },
      { id: "unladen", icon: { kind: "hands" }, lit: true },
    ])
  })
})
```

`grid.cols` indexes rows of equal length (`FloorGrid.cols`); the second test finds the home (the plate carrying
the record) and files the arrangement under its address, as play does.

Append to `src/app/SiteMap/stoneWalk.spec.tsx`:

```tsx
describe("a door the stones hold", () => {
  it("is walked up to and read, not a wall", () => {
    const h = play(SHELF_AND_DOOR)
    const door = h.grid.cells.flatMap((row, r) =>
      row.flatMap((cell, c) => (cell.type === "room" && cell.tags?.includes("gate") ? [[r, c] as const] : []))
    )[0]
    h.walkTo(door)
    expect(h.encountered).toContainEqual(door)
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `yarn vitest run src/game/mechanics/weights.spec.ts src/game/gateFace.spec.ts src/app/SiteMap/stoneWalk.spec.tsx`
Expected: FAIL: no `terms`, no `weighs`, no face on a plate door (it is a sealed wall the walk cannot enter).

- [ ] **Step 3: Compile each gate's terms**

In `src/game/siteTypes.ts`, above `export type MechanismRecord`:

```ts
/** One condition a gate puts on a lock's stones: a plate holding a stone or left empty, or empty hands. */
export type WeightTerm = { kind: "plate"; plate: string; wants: "stone" | "empty" } | { kind: "unladen" }
```

and `MechanismRecord` gains after `underfoot`:

```ts
  /** WHAT EACH GATE THE STONES GOVERN WAITS FOR, term by term, under the key its door asks for. Read by the door's
   * face (src/game/gateFace.ts); the walk reads `positions`. */
  weighs?: { gateKeyId: string; terms: WeightTerm[] }[]
```

In `src/game/obstacles.ts`: `import type { WeightTerm } from "./siteTypes"` (beside `ForkDemand`) and
`WeightsControl` gains after `underfoot`:

```ts
  /** Each gate's stone terms (namespaced gate id → terms), for the door's face. */
  terms: Record<string, WeightTerm[]>
```

In `src/game/mechanics/weights.ts`: `import type { MechanismRecord, WeightTerm } from "../siteTypes"` (it imports
`MechanismRecord` already); in `WEIGHTS.compileLock`, before `return { controls: … }`:

```ts
    const owned = renamed.weights!.plates
    const terms = Object.fromEntries(
      Object.entries(renamed.gates).flatMap(([id, gate]) => {
        const own = gate.owners.filter(
          owner => Object.hasOwn(owned, owner) || (CARRY_TERMS as readonly string[]).includes(owner)
        )
        return own.length === 0
          ? []
          : [
              [
                id,
                own.map(
                  (owner): WeightTerm =>
                    Object.hasOwn(owned, owner)
                      ? { kind: "plate", plate: owner, wants: owned[owner].opens.empty.includes(id) ? "empty" : "stone" }
                      : { kind: "unladen" }
                ),
              ],
            ]
      })
    )
```

and `terms,` after `underfoot,` in the control. In `compileWeights`, after `underfoot`:

```ts
  weighs: Object.entries(control.terms).map(([id, terms]) => ({ gateKeyId: gate(id).gateKeyId, terms })),
```

In `src/game/mechanics/realisations.spec.ts`, the literal gains `terms: {},` after `underfoot: [],`.

- [ ] **Step 4: The face reads the stones**

In `src/game/gateFace.ts`:

1. `import { arrangementOf } from "./mechanics/weights"`.
2. `GateOwnerIcon` becomes

```ts
export type GateOwnerIcon =
  | { kind: "mechanism"; family: string }
  | { kind: "key"; color?: KeyColor }
  | { kind: "plate"; wants: "stone" | "empty" }
  | { kind: "hands" }
```

   and its comment gains: "a plate the door waits on wears the plate, with a stone or without as the door wants
   it; empty hands wear hands."
3. Below `sequencesOf`, add

```ts
type StoneHome = { mechanism: MechanismRecord; at: readonly [number, number] }

const stoneHomesOf = (grid: FloorGrid): StoneHome[] => {
  const homes: StoneHome[] = []
  for (let r = 0; r < grid.rows; r++)
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c]
      if (cell.type === "room" && cell.mechanism?.weighs) homes.push({ mechanism: cell.mechanism, at: [r, c] })
    }
  return homes
}

// ALL PLATES LOOK ALIKE, so nothing on the floor says which plate a door listens to: every door with a stone term
// wears a face, whatever its mode and however many owners it has. One marker per term, lit while it agrees.
const stoneMarkers = (
  grid: FloorGrid,
  floor: number,
  homes: readonly StoneHome[],
  gateKeyId: string,
  positions: ReadonlyMap<string, string>
): GateMarker[] =>
  homes.flatMap(({ mechanism, at }) => {
    const entry = mechanism.weighs!.find(w => w.gateKeyId === gateKeyId)
    if (!entry) return []
    const { weighted, hand } = arrangementOf(storedAtCell(grid, floor, at[0], at[1], positions) ?? mechanism.initial)
    return entry.terms.map(
      (term): GateMarker =>
        term.kind === "plate"
          ? {
              id: term.plate,
              icon: { kind: "plate", wants: term.wants },
              lit: weighted.includes(term.plate) === (term.wants === "stone"),
            }
          : { id: "unladen", icon: { kind: "hands" }, lit: !hand }
    )
  })
```

4. In `withGateFaces`: `const stones = stoneHomesOf(grid)` beside `const homes = sequencesOf(grid)`; per door,
   after `const floorKeys = …`:

```ts
      const weighed = stoneMarkers(grid, floor, stones, key, positions)
```

   the early return becomes
   `if (!needsFace(owners, floorKeys.length, key) && sequences.length === 0 && weighed.length === 0) return cell`,
   and the stone markers go between the owners' and the keys': after `const markers = owners.map(…)` add
   `markers.push(...weighed)` before the floor-key loop.

The withGateFaces doc comment's "Gives every door that needs one its face" line gains "(a door the stones hold
always needs one)".

- [ ] **Step 5: The face draws them**

In `src/mods/topology/app/gateFace/GateFaceComponent.tsx`:

```tsx
import { sharedTileUrl } from "@/app/SiteMap/tileAssets"
import { CELL, PROP_H } from "@/app/SiteMap/mapScale"

const iconFor = (icon: GateOwnerIcon) => {
  if (icon.kind === "key") return <KeyIcon color={icon.color ?? "blue"} size={40} />
  if (icon.kind === "plate") {
    // The plate as the floor shows it, with its stone where the door wants one: the shared painting.
    const src = sharedTileUrl(icon.wants === "stone" ? "plateStone" : "plate")
    return src ? <img src={src} width={40} height={(40 * PROP_H) / CELL} alt="" /> : <span aria-hidden="true">▭</span>
  }
  if (icon.kind === "hands") return <span aria-hidden="true">🤲</span>
  return <span aria-hidden="true">{getFamilyPlugin(icon.family)?.meta.icon ?? "◇"}</span>
}

/** The name a marker is read out by, under gateFace.owner. */
const ownerOf = (icon: GateOwnerIcon): string =>
  icon.kind === "key"
    ? "key"
    : icon.kind === "plate"
      ? icon.wants === "stone"
        ? "plateStone"
        : "plateEmpty"
      : icon.kind === "hands"
        ? "hands"
        : icon.family
```

and in the component replace `` `gateFace.owner.${marker.icon.kind === "key" ? "key" : marker.icon.family}` `` with
`` `gateFace.owner.${ownerOf(marker.icon)}` ``.

Locales, `gateFace.owner` in `public/locales/en/common.json`:

```json
      "key": "Key",
      "plateStone": "A plate, with a stone on it",
      "plateEmpty": "A plate, left empty",
      "hands": "Empty hands",
```

and in `public/locales/nl/common.json`:

```json
      "key": "Sleutel",
      "plateStone": "Een plaat, met een steen erop",
      "plateEmpty": "Een plaat, leeg gelaten",
      "hands": "Lege handen",
```

- [ ] **Step 6: Run the tests, the sweeps, and the bake**

Run: `yarn vitest run src/game/mechanics src/game/gateFace.spec.ts src/app/SiteMap/stoneWalk.spec.tsx src/mods/topology/app/gateFace src/i18n/keys.spec.ts`
Expected: PASS.

Run: `yarn check-types && yarn lint`
Expected: clean.

Run: `yarn verify-content 2>&1 | grep -E "×|Test Files|Tests "`
Expected: only the three known `src/mods/puzzleSeeds.verify.ts` failures. The dev floor's twoStones doors now wear
faces; a sweep that pinned them as sealed walls is wrong to, and is fixed by reading what it asserts, never by
dropping the face.

Run: `yarn generate-world && git diff --exit-code src/data/generatedWorld.ts src/data/carveLedger.json; echo $?`
Expected: `0`.

- [ ] **Step 7: Look at it**

Playground, `twoStones`: walk into the vault door and the exit door. Each shows its plates, with or without a
stone as it wants them, lit as they agree. Record it.

- [ ] **Step 8: Commit**

```bash
git add src/game/siteTypes.ts src/game/obstacles.ts src/game/mechanics/weights.ts src/game/mechanics/weights.spec.ts src/game/mechanics/realisations.spec.ts src/game/gateFace.ts src/game/gateFace.spec.ts src/mods/topology/app/gateFace/GateFaceComponent.tsx src/app/SiteMap/stoneWalk.spec.tsx public/locales/en/common.json public/locales/nl/common.json
git commit -m "feat(stones): a door shows the plates it waits for" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 7: The stones are where the player left them

No code: the arrangement already is a mechanism state. This task proves §5 through the real store and remount.

**Files:**
- Test: `src/app/SiteMap/stoneSave.spec.tsx`

**Interfaces:**
- Consumes: `sequenceHarness` (`remount`, `store`), `carvePlayground`, `stoneFloor`, `plateNamed`, `SHELF_AND_DOOR`, `isCarrying`, `plateLookAt`.

- [ ] **Step 1: Write the tests**

Create `src/app/SiteMap/stoneSave.spec.tsx`:

```tsx
// @vitest-environment jsdom
import { act, cleanup } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { isCarrying, plateLookAt } from "@/game/stonePlay"
import { SHELF_AND_DOOR, plateNamed, stoneFloor } from "@/game/testSupport/stoneFixtures"
import { carvePlayground } from "./lockPlayground"
import { sequenceHarness } from "./sequenceHarness.testing"
import "@/mods/registerModApps"

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const play = () => {
  const config = stoneFloor(SHELF_AND_DOOR)
  const carved = carvePlayground(config)
  if (!carved.found) throw new Error(JSON.stringify(carved.reasons))
  return { ...sequenceHarness(carved.seed, config), grid: carved.grid }
}

describe("the stones in the save", () => {
  it("are one entry, filed under the first plate's slot", () => {
    const h = play()
    h.walkTo(plateNamed(h.grid, "shelf"))
    act(() => h.current().prompt!.take())
    h.settle()
    expect(Object.keys(h.store.mechanismStates)).toEqual([expect.stringContaining("xplate:stones.p")])
  })

  it("keep a stone in hand through a reload: he still carries it and the empty plate offers the set-down", () => {
    const h = play()
    const shelf = plateNamed(h.grid, "shelf")
    h.walkTo(shelf)
    act(() => h.current().prompt!.take())
    h.settle()
    h.remount()
    h.settle()
    const { grid, mechanismStates } = h.current()
    expect(isCarrying(grid!, 0, mechanismStates)).toBe(true)
    h.tap(shelf[0], shelf[1])
    expect(h.current().prompt).toMatchObject({ kind: "plate", stone: "set" })
  })

  it("keep a stone where it was set down through a reload, and the door it holds open", () => {
    const h = play()
    h.walkTo(plateNamed(h.grid, "shelf"))
    act(() => h.current().prompt!.take())
    h.settle()
    h.walkTo(plateNamed(h.grid, "p"))
    act(() => h.current().prompt!.take())
    h.settle()
    h.remount()
    h.settle()
    const { grid, mechanismStates, openGateKeys } = h.current()
    const [r, c] = plateNamed(grid!, "p")
    expect(plateLookAt(grid!, 0, r, c, mechanismStates, false)).toBe("stone")
    expect(openGateKeys.size).toBe(1)
  })

  it("read as the authored start where the save holds no entry", () => {
    const h = play()
    const { grid, mechanismStates, openGateKeys } = h.current()
    const [r, c] = plateNamed(grid!, "shelf")
    expect(h.store.mechanismStates).toEqual({})
    expect(plateLookAt(grid!, 0, r, c, mechanismStates, false)).toBe("stone")
    expect(openGateKeys.size).toBe(0)
  })
})
```

The first test assumes `cellAddress` names the slot inside the address (`cellSlot` returns `xplate:<id>` for a
plate, `src/game/cellSlot.ts` l.75). If the address carries the slot in another form, assert on the form
`cellAddress(grid, 0, …home plate…)` returns and keep the claim: one entry, at the home plate's address.

- [ ] **Step 2: Run them**

Run: `yarn vitest run src/app/SiteMap/stoneSave.spec.tsx`
Expected: PASS. A failure here is a bug in tasks 2–6, not in this test: fix it there.

- [ ] **Step 3: Commit**

```bash
git add src/app/SiteMap/stoneSave.spec.tsx
git commit -m "test(stones): the arrangement survives a reload, a stone in hand included" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

---

### Task 8: The contract, the spec and the roadmap say so

**Files:**
- Modify: `docs/mods/mechanic-contract.md` (§3.2 Stones on plates; §5 a one-way realisation's `handsFull`)
- Modify: `docs/superpowers/specs/2026-10-04-stones-acceptance.md` (tick what holds)
- Modify: `docs/superpowers/plans/2026-10-06-stonegate-roadmap.md` (phase 2 done; open items)
- Modify: `docs/playtest-backlog.md` (an entry)
- `CHANGELOG.md`: no entry (Global Constraints).

- [ ] **Step 1: The contract.** In §3.2 add, in the voice of the surrounding bullets (current rule and why):
  - **Play.** A plate offers its move through a prompt (lift or set-down, `stoneMoveAt`); arriving never acts.
    A carrying walk is turned away at every staircase and the way out, and at a one-way whose realisation declares
    `handsFull`.
  - **The explorer's weight** is the record's `underfoot`: per arrangement and empty plate, what pressing it opens.
    Only drawing reads it, so a way his weight alone holds is never on a route.
  - **The face.** The record's `weighs` lists each gate's stone terms; every door with one wears a face, one marker
    per term, because all plates look alike.
  In §5 add that a one-way realisation may declare `handsFull`, the line a carrying walk is turned away with.

- [ ] **Step 2: The spec.** Tick in §4 every box tasks 2–6 prove (lift, set-down, none elsewhere, standing
  presses, never on a route, three looks, explorer carrying, way out and stairs, door shows its condition, plates
  seen once their room is), leaving the `unladen` passage box open with "(phase 3: the narrow passage declares its
  line through `handsFull`)". Tick §5's three boxes. In §2 replace "(way out only; stairs are phase 2)" with
  "(the stairs down are the way out of a staircase floor; every staircase turns a carrying walk away in play)".
  In "The carrying explorer" tick the `ExplorerDot` and walking/standing boxes. Tick nothing the designer has not
  judged in Storybook if the step 10 looks of tasks 1–6 were not recorded.

- [ ] **Step 3: The roadmap.** Phase 2's row: done, linking this plan. Replace "Open after phase 1"'s line "Gate
  faces (`gateFace.ts`) do not know plate homes yet (phase 2)." with nothing (it is done) and add an "Open after
  phase 2" list:
  - a saved arrangement the lock no longer has freezes the stones (question 7, settled in phase 6);
  - a barred region (water, sand) owned by a plate does not move under the explorer's weight; doors do;
  - the face does not tell plates apart (question 5).
  Drop "Phase 2" from "Open per phase".

- [ ] **Step 4: The playtest backlog.** Add at the top of `docs/playtest-backlog.md`:

```markdown
## stoneGate phase 2 — playing with stones

- **Storybook, `Topology/Lock playground`, `twoStones`.** Lift a stone, set it on the vault plate, fetch the second,
  press both exit plates. Stand on an empty plate: it sinks and its door swings, and steps back when you leave.
  Carry a stone to the way out: the explorer stops and says why.
- **Dev pyramid 11, floor 0.** The same lock in the game. Reload the app mid-carry: he is still carrying it.
```

- [ ] **Step 5: Commit**

```bash
git add docs/mods/mechanic-contract.md docs/superpowers/specs/2026-10-04-stones-acceptance.md docs/superpowers/plans/2026-10-06-stonegate-roadmap.md docs/playtest-backlog.md
git commit -m "docs: stones in play, in the contract and the spec" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_018WV7pZwTJC84nRwPESXJfW"
```

- [ ] **Step 6: The whole gate in a clean worktree**

```bash
git worktree add /tmp/stonegate-phase2 HEAD && cd /tmp/stonegate-phase2 && yarn install --immutable && yarn verify && yarn build
```

Expected: all pass (`yarn verify` runs lint --fix, types, tests, betterer in its order). Then `cd -` back and
`git worktree remove /tmp/stonegate-phase2`. Push only when asked.

---

## Self-review notes

- **Spec coverage, §4 Play:** "Lift the stone" and "Set the stone on the plate", none elsewhere, no lift while
  carrying: task 2. Standing presses, ways move and move back: task 4 (doors), task 3 (the plate). Never on a
  route: task 4's walk test. Three looks: task 3. Explorer carrying: task 3. A carrying walk at an `unladen`
  passage: the zipline in task 5; the narrow passage is phase 3 (question 6). Way out and every staircase: task 5.
  A door shows its condition: task 6. Plates seen once their room is: task 3 (drawn on any cell not fogged).
- **§5 Save:** task 7, no field and no migration; a stale arrangement is question 7.
- **The carrying explorer:** the frames exist (`src/assets/tiles/default/explorer-carry-*`); `ExplorerFigure`
  already reads them with the fallback; task 3 wires `ExplorerDot` and the map. The Facings story already shows
  the carrying rows (phase 5).
- **Roadmap phase 2 row:** playground (task 1), prompts (task 2), plate looks with the painted tiles (task 3),
  blocked walk (task 5), door shows its plates (task 6), carrying (task 3). Designer request (2026-10-07): the
  explorer standing on an empty plate and carrying on a plate, looks chosen from state, in `Topology/Plate`
  (task 3, step 6).
- **Not covered:** the explorer's weight on a barred region (doors only); telling plates apart on the face;
  a bare `unladen` door saying why (phase 3).
- **Type consistency:** `stonesAt` / `stoneMoveAt` / `isCarrying` (task 2) → `plateLookAt` (task 3) →
  `explorerWeight` (task 4); `nodeSpritesFor(…, floorIndex, standingAt, weight)` gains `standingAt` in task 3 and
  `weight` in task 4; `WeightsControl` gains `underfoot` (task 4) then `terms` (task 6), and the one literal of it
  (`realisations.spec.ts`) is edited in both.
