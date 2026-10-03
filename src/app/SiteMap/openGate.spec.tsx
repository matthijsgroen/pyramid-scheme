// @vitest-environment jsdom
import { render, renderHook, act } from "@testing-library/react"
import { useState } from "react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import type { Direction, FloorConfig, FloorGrid, GridCell, RoomCell, SiteConfig } from "@/game/siteTypes"
import { assembleFloor } from "@/game/siteAssembler"
import { openDoorsFor, openWaysOut } from "@/game/mechanismDoors"
import { cellAddress } from "@/game/cellAddress"
import { findPath } from "@/game/gridNavigation"
import { createJourneysV3Api, type JourneyAPI, type StoredJourneyStateV3 } from "@/app/state/useJourneys"
import { journeys as allKnownJourneys } from "@/data/journeys"
import type { TranslatedJourney } from "@/app/translations/useJourneyTranslations"
import { resolveEncounter } from "@/app/families/familyRegistry"
import { resolveKeyRequirements } from "@/mods/allFamilyMeta"
import { handleFloorConfig } from "@/game/testSupport/handleFixtures"
import { forkSwitchFloorConfig } from "@/game/testSupport/forkSwitchFixtures"
import { keyColorHex } from "@/ui/tokens/keyColors"
import { applyExplored, sealWaysOut, useAssembledFloor } from "./useAssembledFloor"
import { useMechanismStates } from "./useMechanismStates"
import { useSiteNavigation } from "./useSiteNavigation"
import { SiteMapView } from "./SiteMapView"
import { buildRoomClaims } from "./roomClaims"
import { markerAt, offerContextFrom, offeredTargets } from "./clickTargets"
import { cellKey } from "./cellIdentity"
import { encodeEdge } from "./edgeId"
import { CELL } from "./mapScale"
import "@/mods/registerModApps"

// A journey the store knows, so the navigation harness can write to it; the floors are carved under its
// id, which only seeds their gate key ids — nothing below names a key, each is read off the floor.
const JOURNEY = allKnownJourneys[0].id

type Scenario = {
  name: string
  config: FloorConfig
  /** The cell standing in the mechanism whose position is under test, and the positions it can take. */
  mechanism: (grid: FloorGrid) => { at: [number, number]; states: string[] }
}

const roomsOf = (grid: FloorGrid): { cell: RoomCell; at: [number, number] }[] =>
  grid.cells.flatMap((row, r) =>
    row.flatMap((cell, c) => (cell.type === "room" ? [{ cell, at: [r, c] as [number, number] }] : []))
  )

// The lever's own room, and the junction a fork-switch stands in: the one cell whose position opens doors.
const SCENARIOS: Scenario[] = [
  {
    name: "a lever driving two doors on one side and one on the other",
    config: handleFloorConfig({ in: "lever", left: ["vault", "vault2"], right: ["pocket"] }),
    mechanism: grid => {
      const found = roomsOf(grid).find(({ cell }) => cell.tags?.includes("handle"))
      if (!found) throw new Error("no lever on this floor")
      return { at: found.at, states: found.cell.mechanism!.states }
    },
  },
  {
    name: "a fork-switch opening one seam of its fork at a time",
    config: forkSwitchFloorConfig(),
    mechanism: grid => {
      const found = roomsOf(grid).find(({ cell }) => cell.mechanismId === "Y")
      if (!found) throw new Error("no fork-switch on this floor")
      return { at: found.at, states: found.cell.mechanism!.states }
    },
  },
]

const floorRefFor = { journeyId: JOURNEY, floorIndex: 0 }
const carve = (config: FloorConfig): { seed: number; grid: FloorGrid } => {
  for (let seed = 0; seed < 120; seed++) {
    const result = assembleFloor(JOURNEY, config, seed, resolveEncounter, {
      resolveKeyRequirements,
      floorRef: floorRefFor,
    })
    if (result.success) return { seed, grid: result.grid }
  }
  throw new Error("no seed carved this floor")
}

const carved = new Map<string, { seed: number; grid: FloorGrid }>()
beforeAll(() => {
  for (const scenario of SCENARIOS) carved.set(scenario.name, carve(scenario.config))
}, 120_000)

// A gate nobody stands in: no family renders it, so it is the mechanism's door and nothing else.
const isMechanismGate = (cell: GridCell): cell is RoomCell =>
  cell.type === "room" && cell.family === undefined && !!cell.tags?.includes("gate") && !!cell.requiredKeyId

/** What an open door was rewritten to, before it kept its identity: the plain corridor, nothing else. */
const headOpenWaysOut = (grid: FloorGrid, open: ReadonlySet<string>): FloorGrid => ({
  ...grid,
  cells: grid.cells.map(row =>
    row.map((cell): GridCell => {
      if (!isMechanismGate(cell) || !open.has(cell.requiredKeyId!)) return cell
      return {
        type: "corridor",
        dirs: cell.dirs,
        state: cell.state,
        sectionAddress: cell.sectionAddress,
        sectionHash: cell.sectionHash,
        legacySectionHash: cell.legacySectionHash,
        ordinal: cell.ordinal,
        difficulty: cell.difficulty,
        hidden: cell.hidden,
      }
    })
  ),
})

/** The floor as it was carved before an open door was remembered: what every walk, reveal and count was
 * written against. */
const headCarve = (grid: FloorGrid, open: ReadonlySet<string>): FloorGrid => sealWaysOut(headOpenWaysOut(grid, open))

const withoutOpenGates = (grid: FloorGrid): FloorGrid => ({
  ...grid,
  cells: grid.cells.map(row =>
    row.map((cell): GridCell => {
      if (cell.type !== "corridor" || !cell.openGate) return cell
      const { openGate: _kept, ...plain } = cell
      void _kept
      return plain
    })
  ),
})

const carveWith = (name: string, state: string) => {
  const { grid: base } = carved.get(name)!
  const { at, states } = SCENARIOS.find(s => s.name === name)!.mechanism(base)
  expect(states).toContain(state)
  const positions = new Map([[cellAddress(base, 0, at[0], at[1])!, state]])
  const open = openDoorsFor(base, 0, positions)
  return { base, positions, open, now: sealWaysOut(openWaysOut(base, open)), head: headCarve(base, open) }
}

// The positions each scenario is read in. A fork-switch's states are named for its seams, so `forkLeft`
// means the state opening the seam authored as `forkLeft` (see resolveState).
const STATES: Record<string, string[]> = {
  [SCENARIOS[0].name]: ["left", "right"],
  [SCENARIOS[1].name]: ["rest", "forkLeft", "forkRight"],
}

const forEachScenarioState = (run: (name: string, state: string) => void) => {
  for (const { name } of SCENARIOS) for (const state of STATES[name]) run(name, state)
}

/** The state named for a fork seam is its gate key id, so `forkLeft` means whichever state opens the
 * seam authored as `forkLeft`. */
const resolveState = (name: string, state: string): string => {
  const { grid } = carved.get(name)!
  const { states } = SCENARIOS.find(s => s.name === name)!.mechanism(grid)
  return states.find(s => s === state || s.endsWith(`:${state}`)) ?? state
}

/** Every cell lit, so a door is drawn and a route can be read off the floor rather than fogged away. */
const revealed = (grid: FloorGrid): FloorGrid => ({
  ...grid,
  cells: grid.cells.map(row =>
    row.map((cell): GridCell => (cell.type === "empty" ? cell : { ...cell, state: "reachable" }))
  ),
})

const stateGrid = (grid: FloorGrid): string[] =>
  grid.cells.flatMap((row, r) =>
    row.map((cell, c) => `${r},${c}:${cell.type === "empty" ? "empty" : `${cell.type}/${cell.state}`}`)
  )

describe("an open gate keeps its symbol and colour", () => {
  describe("the cell", () => {
    forEachScenarioState((name, wanted) => {
      it(`${name}: in ${wanted}, every gate the position opens is a corridor still wearing its gate, key and mark`, () => {
        const state = resolveState(name, wanted)
        const { base, open, now } = carveWith(name, state)
        const mechanismGates = roomsOf(base).filter(({ cell }) => isMechanismGate(cell))
        const wanting = mechanismGates.filter(({ cell }) => open.has(cell.requiredKeyId!))
        // Not vacuous: each scenario opens at least one door in at least one of its states, checked below.
        const kept: {
          key: string
          at: [number, number]
          gate: NonNullable<Extract<GridCell, { type: "corridor" }>["openGate"]>
        }[] = []
        now.cells.forEach((row, r) =>
          row.forEach((cell, c) => {
            if (cell.type === "corridor" && cell.openGate)
              kept.push({ key: cell.openGate.requiredKeyId, at: [r, c], gate: cell.openGate })
          })
        )
        expect(kept.map(k => k.key).sort()).toEqual(wanting.map(({ cell }) => cell.requiredKeyId!).sort())
        for (const { key, gate } of kept) {
          const was = wanting.find(({ cell }) => cell.requiredKeyId === key)!.cell
          expect(gate.tags).toContain("gate")
          expect(gate.tags).toEqual(was.tags)
          expect(gate.mark).toEqual(was.mark)
          expect(gate.mark, `${key} wore a mark shut`).toBeDefined()
          expect(gate.gateVariant).toEqual(was.gateVariant)
          expect(gate.keyIsAuthored).toEqual(was.keyIsAuthored)
        }
      })
    })

    it("opens at least one gate in some state of every scenario, so the cases above are not empty", () => {
      for (const scenario of SCENARIOS) {
        const opened = (STATES[scenario.name] ?? []).map(wanted => {
          const { now } = carveWith(scenario.name, resolveState(scenario.name, wanted))
          return now.cells.flat().filter(cell => cell.type === "corridor" && cell.openGate).length
        })
        expect(Math.max(...opened), scenario.name).toBeGreaterThan(0)
      }
    })

    it("stands a fork-switch's open door in its doorway, beside the junction, where the shut one stood", () => {
      const name = SCENARIOS[1].name
      const state = resolveState(name, "forkLeft")
      const { base, now, head } = carveWith(name, state)
      const junction = roomsOf(base).find(({ cell }) => cell.mechanismId === "Y")!
      const opened = (junction.cell.exits ?? []).filter(exit => exit.gateKeyId === state)
      expect(opened).toHaveLength(1)
      const [dr, dc] = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }[opened[0].dir as Direction]
      const [r, c] = junction.at
      const doorway = now.cells[r + dr][c + dc]
      expect(doorway.type === "corridor" && doorway.openGate?.requiredKeyId).toBe(state)
      const node = now.cells[r + dr * 2][c + dc * 2]
      expect(node.type === "corridor" && node.openGate).toBeFalsy()
      // The shut seam stays a door in its own doorway, exactly as it was.
      const shut = (junction.cell.exits ?? []).find(exit => exit.gateKeyId && exit.gateKeyId !== state)!
      const [sr, sc] = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }[shut.dir as Direction]
      expect(now.cells[r + sr][c + sc]).toEqual(head.cells[r + sr][c + sc])
      expect(now.cells[r + sr][c + sc].type).toBe("room")
    })
  })

  describe("a shut gate is unchanged in every respect", () => {
    forEachScenarioState((name, wanted) => {
      it(`${name}: in ${wanted}, every gate the position leaves shut is the cell the floor always carved`, () => {
        const state = resolveState(name, wanted)
        const { base, open, now, head } = carveWith(name, state)
        const shutKeys = roomsOf(base)
          .filter(({ cell }) => isMechanismGate(cell) && !open.has(cell.requiredKeyId!))
          .map(({ cell }) => cell.requiredKeyId!)
        now.cells.forEach((row, r) =>
          row.forEach((cell, c) => {
            if (isMechanismGate(cell) && shutKeys.includes(cell.requiredKeyId!)) expect(cell).toEqual(head.cells[r][c])
          })
        )
        expect(now.cells.flat().filter(cell => isMechanismGate(cell)).length).toBe(shutKeys.length)
        // And a position that opens nothing leaves the whole floor the one it always carved.
        if (open.size === 0) expect(now).toEqual(head)
      })
    })

    it("a floor with no open gate comes back as the very grid it was given", () => {
      const { grid } = carved.get(SCENARIOS[0].name)!
      expect(openWaysOut(grid, new Set())).toBe(grid)
    })
  })

  describe("walking and reveal treat it as the corridor it is", () => {
    forEachScenarioState((name, wanted) => {
      it(`${name}: in ${wanted}, nothing but the openGate field differs from the floor carved with plain corridor`, () => {
        const state = resolveState(name, wanted)
        const { now, head } = carveWith(name, state)
        expect(withoutOpenGates(now)).toEqual(head)
      })

      it(`${name}: in ${wanted}, the whole revealed set matches the plain-corridor floor from every explored start`, () => {
        const state = resolveState(name, wanted)
        const { now, head, open } = carveWith(name, state)
        const gates: [number, number][] = []
        now.cells.forEach((row, r) =>
          row.forEach((cell, c) => {
            if (cell.type === "corridor" && cell.openGate) gates.push([r, c])
          })
        )
        const keysOf = (grid: FloorGrid, cells: [number, number][]): Record<string, string[]> => {
          const out: Record<string, string[]> = {}
          for (const [r, c] of cells) {
            const cell = grid.cells[r]?.[c]
            const key = cell && cellKey(grid, 0, r, c)
            if (!cell || cell.type === "empty" || !key) continue
            const section = cell.sectionAddress ?? ""
            out[section] = [...(out[section] ?? []), key]
          }
          return out
        }
        const around = (cells: [number, number][]): [number, number][] =>
          cells.flatMap(([r, c]) => [[r, c] as [number, number], [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]])
        const everyCell = now.cells.flatMap((row, r) => row.map((_, c) => [r, c] as [number, number]))
        const starts: [number, number][][] = [[now.entrancePos as [number, number]], around(gates), everyCell]
        for (const start of starts) {
          const fromNow = applyExplored(now, 0, keysOf(now, start), open)
          const fromHead = applyExplored(head, 0, keysOf(head, start), open)
          expect(stateGrid(fromNow)).toEqual(stateGrid(fromHead))
        }
        // Reveal beyond a gate is real: standing round a gate lights more than the cells named.
        if (gates.length > 0) {
          const lit = (grid: FloorGrid) => stateGrid(grid).filter(s => !s.endsWith("/fogged")).length
          expect(lit(applyExplored(now, 0, keysOf(now, around(gates)), open))).toBeGreaterThan(
            around(gates).filter(([r, c]) => (now.cells[r]?.[c]?.type ?? "empty") !== "empty").length - 1
          )
        }
      })

      it(`${name}: in ${wanted}, every cell offers and marks exactly what the plain-corridor floor does`, () => {
        const state = resolveState(name, wanted)
        const { now, head } = carveWith(name, state)
        const claimsNow = buildRoomClaims(now)
        const claimsHead = buildRoomClaims(head)
        const readAt = (grid: FloorGrid, claims: ReturnType<typeof buildRoomClaims>, at: readonly [number, number]) => {
          const ctx = offerContextFrom(grid, at, {})
          return {
            offers: [...offeredTargets(grid, claims, at)].sort(),
            markers: [...offeredTargets(grid, claims, at).keys()].map(key => {
              const [r, c] = key.split(",").map(Number)
              return markerAt(grid, claims, r, c, ctx)
            }),
          }
        }
        now.cells.forEach((row, r) =>
          row.forEach((cell, c) => {
            if (cell.type === "empty") return
            expect(readAt(now, claimsNow, [r, c]), `from ${r},${c}`).toEqual(readAt(head, claimsHead, [r, c]))
          })
        )
      })
    })
  })

  describe("it is drawn as a gate, standing open, wearing its mark", () => {
    const hookGrid = (name: string, state: string) => {
      const { seed, grid: base } = carved.get(name)!
      const scenario = SCENARIOS.find(s => s.name === name)!
      const { at } = scenario.mechanism(base)
      const positions = new Map([[cellAddress(base, 0, at[0], at[1])!, state]])
      const { result } = renderHook(() =>
        useAssembledFloor(JOURNEY, scenario.config, seed, 0, {}, null, 0, undefined, undefined, positions)
      )
      return result.current.grid!
    }
    const leafOf = (container: HTMLElement, r: number, c: number) =>
      container.querySelector<HTMLElement>(`[data-node-sprite="gate:${r},${c}"]`)
    const urlOf = (el: HTMLElement) => /url\(["']?(.*?)["']?\)/.exec(el.style.backgroundImage)?.[1] ?? ""
    // A footprint-clipped sprite is laid out over its clip's box, with its art placed inside by
    // background-position (docs/instructions/map-rendering.md).
    const leftOf = (el: HTMLElement) =>
      el.style.clipPath
        ? parseFloat(el.style.left) + parseFloat(el.style.backgroundPosition.split(" ")[0])
        : parseFloat(el.style.left)
    const badgesOf = (container: HTMLElement) =>
      Array.from(container.querySelectorAll<SVGSVGElement>("svg"))
        .filter(svg => svg.getAttribute("viewBox") === "-12 -12 24 24")
        .map(svg => ({
          glyph: svg.querySelector("text")?.textContent,
          fill: svg.querySelector("circle")?.getAttribute("fill"),
          left: parseFloat(svg.style.left) + 11,
        }))

    forEachScenarioState((name, wanted) => {
      it(`${name}: in ${wanted}, each open gate draws the open leaf with its mark, each shut one the shut leaf`, () => {
        const state = resolveState(name, wanted)
        const grid = revealed(hookGrid(name, state))
        const { container } = render(<SiteMapView grid={grid} />)
        const badges = badgesOf(container)
        let openSeen = 0
        let shutSeen = 0
        let marked = 0
        grid.cells.forEach((row, r) =>
          row.forEach((cell, c) => {
            const open = cell.type === "corridor" ? cell.openGate : undefined
            const shut = isMechanismGate(cell) ? cell : undefined
            const gate = open ?? shut
            if (!gate) return
            const leaf = leafOf(container, r, c)
            const where = `${name} / ${state} / ${r},${c}`
            // A way a switch shut is a wall and stays keyed as one: only an open door or a walk-up gate
            // hangs in the doorway with the archways.
            if (open) {
              openSeen++
              expect(leaf, `${where}: the open gate drew no leaf`).not.toBeNull()
              expect(urlOf(leaf!), where).toMatch(/gate-open/)
              const mark = open.mark!
              const badge = badges.find(
                b =>
                  b.glyph === String.fromCodePoint(mark.glyph) && Math.abs(b.left - (leftOf(leaf!) + CELL / 2)) < 0.01
              )
              expect(badge, `${where}: the open leaf wears no mark`).toBeDefined()
              expect(badge!.fill).toBe(keyColorHex[mark.color].reachable)
            } else if (shut) {
              shutSeen++
              // A way a switch or lever shut is a wall painted with the stone: the shut bars, keyed `wall:`,
              // wearing the mark, and no leaf hung in the doorway.
              const wall = container.querySelector<HTMLElement>(`[data-node-sprite="wall:${r},${c}"]`)
              expect(leaf, `${where}: a shut way hung a leaf`).toBeNull()
              expect(wall, `${where}: the shut way drew no bars`).not.toBeNull()
              expect(urlOf(wall!), where).toMatch(/\/gate(-side)?\.png$/)
              const worn = badges.some(
                badge =>
                  badge.left === leftOf(wall!) + CELL / 2 &&
                  badge.glyph === (shut.mark && String.fromCodePoint(shut.mark.glyph))
              )
              expect(worn, `${where}: the shut bars wear ${shut.mark ? "no" : "a"} mark`).toBe(shut.mark !== undefined)
              if (shut.mark) marked++
            }
          })
        )
        expect(openSeen + shutSeen).toBeGreaterThan(0)
        expect(marked, "some shut way wears a mark").toBeGreaterThan(0)
      })
    })
  })
})

// ── Walking through one, on the real navigation hook ──────────────────────────────────────────────────

type Store = {
  exploredCells: Record<string, string[]>
  positionKey: string | null
  standingKey: string | null
  mechanismStates: Record<string, string>
}

const makeJourneyData = (id: string): TranslatedJourney =>
  ({
    id,
    exterior: "pyramid",
    difficulty: "starter",
    levelCount: 1,
    journeyLength: "short",
    name: id,
    lengthLabel: "short",
  }) as TranslatedJourney

const harness = (name: string) => {
  const { seed, grid: base } = carved.get(name)!
  const scenario = SCENARIOS.find(s => s.name === name)!
  const store: Store = { exploredCells: {}, positionKey: null, standingKey: null, mechanismStates: {} }
  const encountered: [number, number][] = []
  const siteConfig: SiteConfig = [scenario.config]
  const doc = (): StoredJourneyStateV3 => ({
    journeyId: JOURNEY,
    levelNr: 1,
    completionCount: 0,
    active: true,
    exploredSections: {},
    exploredCells: store.exploredCells,
    position: null,
    positionKey: store.positionKey,
    standingKey: store.standingKey,
    interiorLevelNr: null,
    mechanismStates: store.mechanismStates,
  })
  const hook = renderHook(() => {
    const [, force] = useState(0)
    void force
    const journeys = {
      ...createJourneysV3Api({
        journeys: [doc()],
        setJourneys: updater => {
          const next =
            typeof updater === "function"
              ? (updater as (prev: StoredJourneyStateV3[]) => StoredJourneyStateV3[])([doc()])
              : updater
          store.exploredCells = next[0]?.exploredCells ?? {}
          store.positionKey = next[0]?.positionKey ?? null
          store.standingKey = next[0]?.standingKey ?? null
          store.mechanismStates = next[0]?.mechanismStates ?? {}
        },
        journeyData: [makeJourneyData(JOURNEY)],
      }),
      getPurchasedShopSlots: () => new Set<string>(),
      getSkippedConsumables: () => new Set<string>(),
    } as unknown as JourneyAPI
    const assembled = useAssembledFloor(
      JOURNEY,
      scenario.config,
      seed,
      0,
      journeys.getExploredCells(JOURNEY),
      store.positionKey,
      0,
      undefined,
      undefined,
      useMechanismStates(journeys, JOURNEY),
      store.standingKey
    )
    const nav = useSiteNavigation({
      journeys,
      journeyId: JOURNEY,
      siteConfig,
      seed,
      currentFloor: 0,
      grid: assembled.grid,
      explorerPos: assembled.explorerPos,
      onEncounter: ([r, c]) => {
        encountered.push([r, c])
        const cell = assembled.grid?.cells[r]?.[c]
        const address = cell && cellAddress(assembled.grid!, 0, r, c)
        if (cell && cell.type !== "empty" && address)
          journeys.markCellExplored(cell.sectionHash ?? "", encodeEdge(0, r, c), address)
      },
      onSkippedConsumable: () => {},
      onExitReached: () => {},
    })
    return { ...assembled, ...nav, journeys }
  })
  const settle = () => {
    act(() => vi.advanceTimersByTime(5000))
    hook.rerender()
  }
  const dirsOf = (grid: FloorGrid, r: number, c: number): Direction[] => {
    const cell = grid.cells[r]?.[c]
    return cell && cell.type !== "empty" ? [...cell.dirs] : []
  }
  /** Taps the offer that brings the explorer nearest `goal` (by the floor's own ways), until he is there
   * or nothing gets nearer. Reports every prompt that was hung beside him on the way. */
  const walkTo = (goal: readonly [number, number]) => {
    const prompts: { kind: string; at: readonly [number, number] }[] = []
    const stood: [number, number][] = []
    const distance = (grid: FloorGrid, from: readonly [number, number]): number => {
      const seen = new Map<string, number>([[`${from[0]},${from[1]}`, 0]])
      const queue: [number, number][] = [[from[0], from[1]]]
      for (let i = 0; i < queue.length; i++) {
        const [r, c] = queue[i]
        for (const dir of dirsOf(grid, r, c)) {
          const [dr, dc] = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }[dir]
          const key = `${r + dr},${c + dc}`
          if (seen.has(key)) continue
          seen.set(key, seen.get(`${r},${c}`)! + 1)
          queue.push([r + dr, c + dc])
        }
      }
      return seen.get(`${goal[0]},${goal[1]}`) ?? Infinity
    }
    for (let step = 0; step < 300; step++) {
      hook.rerender()
      const { grid, explorerPos } = hook.result.current
      if (!grid) break
      if (explorerPos[0] === goal[0] && explorerPos[1] === goal[1]) break
      const offers = offeredTargets(grid, buildRoomClaims(grid), explorerPos)
      let best: readonly [number, number] | undefined
      let bestDistance = distance(grid, explorerPos)
      for (const [, target] of offers) {
        const d = distance(grid, target)
        if (d < bestDistance) {
          best = target
          bestDistance = d
        }
      }
      if (!best) break
      act(() => hook.result.current.onCellClick(best![0], best![1]))
      settle()
      stood.push([hook.result.current.explorerPos[0], hook.result.current.explorerPos[1]])
      const prompt = hook.result.current.prompt
      if (prompt) prompts.push({ kind: prompt.kind, at: prompt.at })
    }
    return { prompts, stood }
  }
  return { hook, store, encountered, walkTo, base }
}

describe("walking through an open gate, on the real navigation hook", () => {
  afterEach(() => vi.useRealTimers())

  const crossesAnOpenGate = (name: string, state?: string) => {
    vi.useFakeTimers()
    const h = harness(name)
    if (state) {
      const { at } = SCENARIOS.find(s => s.name === name)!.mechanism(h.base)
      act(() => h.hook.result.current.journeys.setMechanismState(cellAddress(h.base, 0, at[0], at[1])!, state))
      h.hook.rerender()
    }
    return h
  }

  const MOVES = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] } as const

  // Where the live floor stands the door `key` names — a corridor that remembers it, or the room it was —
  // asked of the key, so the walk below reads the same whichever the floor makes of it.
  const standsOf = (grid: FloorGrid, key: string): [number, number][] =>
    grid.cells.flatMap((row, r) =>
      row.flatMap((cell, c) => {
        const named =
          cell.type === "corridor"
            ? cell.openGate?.requiredKeyId
            : cell.type === "room"
              ? cell.requiredKeyId
              : undefined
        return named === key ? [[r, c] as [number, number]] : []
      })
    )

  // The first cell on the far side of the door that is somewhere to stand — a room or a bend — away from
  // the side the route from the entrance arrives by. Read off the plain-corridor floor, so what counts as
  // "beyond" does not depend on how the floor under test draws the door.
  const farSide = (plain: FloorGrid, entrance: readonly [number, number], door: [number, number]) => {
    const here = plain.cells[door[0]][door[1]]
    if (here.type === "empty") throw new Error("a door stands on void")
    const route = findPath(plain, entrance, door)
    const first = [...here.dirs]
      .map(dir => [door[0] + MOVES[dir][0], door[1] + MOVES[dir][1]] as [number, number])
      .find(([r, c]) => !route.some(([pr, pc]) => pr === r && pc === c))!
    const step = [first[0] - door[0], first[1] - door[1]]
    let at = first
    for (;;) {
      const cell = plain.cells[at[0]][at[1]]
      const straight =
        cell.type === "corridor" &&
        cell.dirs.size === 2 &&
        [...cell.dirs].every(dir => (MOVES[dir][0] === 0) === (step[0] === 0))
      if (!straight) return at
      at = [at[0] + step[0], at[1] + step[1]]
    }
  }

  const crossesWithoutStopping = (h: ReturnType<typeof harness>, key: string) => {
    const live = h.hook.result.current.grid!
    const stands = standsOf(live, key)
    expect(stands, "the position names a door on this floor").toHaveLength(1)
    const doorInBase = roomsOf(h.base).find(({ cell }) => cell.requiredKeyId === key)!.at
    const goal = farSide(revealed(headCarve(h.base, new Set([key]))), h.base.entrancePos, doorInBase)
    const { prompts, stood } = h.walkTo(goal)
    const { explorerPos } = h.hook.result.current
    expect([explorerPos[0], explorerPos[1]], "the explorer stands beyond the door").toEqual(goal)
    expect(stood.length).toBeGreaterThan(0)
    const onDoor = (at: readonly [number, number]) => stands.some(([r, c]) => r === at[0] && c === at[1])
    expect(prompts.filter(p => onDoor(p.at))).toEqual([])
    expect(h.encountered.filter(onDoor)).toEqual([])
  }

  it("a lever's open door is crossed with no prompt and no stop, and no room is entered on it", () => {
    const h = crossesAnOpenGate(SCENARIOS[0].name)
    const [lever] = h.hook.result.current.openGateKeys
    crossesWithoutStopping(h, lever)
  }, 60_000)

  it("a fork-switch's open door is crossed with no prompt and no stop, once the board has opened it", () => {
    const name = SCENARIOS[1].name
    const state = resolveState(name, "forkLeft")
    crossesWithoutStopping(crossesAnOpenGate(name, state), state)
  }, 60_000)
})
