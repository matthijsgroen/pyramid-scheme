import { act, renderHook } from "@testing-library/react"
import { vi } from "vitest"
import type { Direction, FloorConfig, FloorGrid, GridCell, RoomCell, SiteConfig } from "@/game/siteTypes"
import { assembleFloor } from "@/game/siteAssembler"
import { cellAddress } from "@/game/cellAddress"
import { findPath } from "@/game/gridNavigation"
import { createJourneysV3Api, type JourneyAPI, type StoredJourneyStateV3 } from "@/app/state/useJourneys"
import { journeys as allKnownJourneys } from "@/data/journeys"
import type { TranslatedJourney } from "@/app/translations/useJourneyTranslations"
import { resolveEncounter } from "@/app/families/familyRegistry"
import { resolveKeyRequirements } from "@/mods/allFamilyMeta"
import { useAssembledFloor } from "./useAssembledFloor"
import { useMechanismStates } from "./useMechanismStates"
import { useSiteNavigation } from "./useSiteNavigation"
import { buildRoomClaims } from "./roomClaims"
import { offeredTargets } from "./clickTargets"
import { encodeEdge } from "./edgeId"

// The real navigation hook, floor assembly and journeys API over one stored journey, so a spec plays a
// carved sequence floor the way a player does and can mount it again from what was stored.

export const JOURNEY = allKnownJourneys[0].id

export type Place = readonly [number, number]

const MOVES: Record<Direction, Place> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

/** The first seed that carves `config` and that `accept` takes. */
export const carveSequence = (config: FloorConfig, accept: (grid: FloorGrid) => boolean = () => true) => {
  for (let seed = 0; seed < 200; seed++) {
    const result = assembleFloor(JOURNEY, config, seed, resolveEncounter, {
      resolveKeyRequirements,
      floorRef: { journeyId: JOURNEY, floorIndex: 0 },
    })
    if (result.success && accept(result.grid)) return { seed, grid: result.grid }
  }
  throw new Error("no seed carved this floor")
}

export const roomsOf = (grid: FloorGrid): { cell: RoomCell; at: Place }[] =>
  grid.cells.flatMap((row, r) =>
    row.flatMap((cell, c) => (cell.type === "room" ? [{ cell, at: [r, c] as Place }] : []))
  )

/** The sequence's tiles in step order, with where each stands. */
export const tilesOf = (grid: FloorGrid) =>
  roomsOf(grid)
    .filter(({ cell }) => cell.sequenceTile)
    .sort((a, b) => a.cell.sequenceTile!.step - b.cell.sequenceTile!.step)

/** The tile cell the sequence's record lives on. */
export const homeOf = (grid: FloorGrid) => roomsOf(grid).find(({ cell }) => cell.mechanism && cell.sequenceTile)!

/** Every cell lit, so tiles are drawn and a route can be read off the floor rather than fogged away. */
export const revealed = (grid: FloorGrid): FloorGrid => ({
  ...grid,
  cells: grid.cells.map(row =>
    row.map((cell): GridCell => (cell.type === "empty" ? cell : { ...cell, state: "reachable" }))
  ),
})

// A seed on which the way from the entrance to each tile in turn runs over no tile that is still ahead,
// so walking the tiles in order is a thing the floor allows; a route over a later tile spoils the run,
// while one over a tile already walked does nothing.
export const routesAreClean = (grid: FloorGrid): boolean => {
  const lit = revealed(grid)
  const tiles = tilesOf(grid)
  let from: Place = grid.entrancePos as Place
  return tiles.every(({ at: to }, k) => {
    const path = findPath(lit, from, to)
    from = to
    return (
      path.length > 0 &&
      path
        .slice(1, -1)
        .every(([r, c]) => !tiles.some(t => t.cell.sequenceTile!.step >= k && t.at[0] === r && t.at[1] === c))
    )
  })
}

type Store = {
  exploredCells: Record<string, string[]>
  positionKey: string | null
  standingKey: string | null
  mechanismStates: Record<string, string>
}

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

export const sequenceHarness = (seed: number, config: FloorConfig) => {
  const store: Store = { exploredCells: {}, positionKey: null, standingKey: null, mechanismStates: {} }
  const encountered: Place[] = []
  const siteConfig: SiteConfig = [config]
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
  const mount = () =>
    renderHook(() => {
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
          journeyData: [journeyData(JOURNEY)],
        }),
        getPurchasedShopSlots: () => new Set<string>(),
        getSkippedConsumables: () => new Set<string>(),
      } as unknown as JourneyAPI
      const mechanismStates = useMechanismStates(journeys, JOURNEY)
      const assembled = useAssembledFloor(
        JOURNEY,
        config,
        seed,
        0,
        journeys.getExploredCells(JOURNEY),
        store.positionKey,
        0,
        undefined,
        undefined,
        mechanismStates,
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
      return { ...assembled, ...nav, journeys, mechanismStates }
    })
  const holder = { hook: mount() }
  const current = () => holder.hook.result.current
  const settle = () => {
    act(() => vi.advanceTimersByTime(5000))
    holder.hook.rerender()
  }
  /** Taps a cell, as the player does, and lets the walk finish. */
  const tap = (r: number, c: number) => {
    act(() => current().onCellClick(r, c))
    settle()
  }
  /** Unmounts everything and mounts it again from what the journeys store holds. */
  const remount = () => {
    holder.hook.unmount()
    holder.hook = mount()
  }
  const dirsOf = (grid: FloorGrid, r: number, c: number): Direction[] => {
    const cell = grid.cells[r]?.[c]
    return cell && cell.type !== "empty" ? [...cell.dirs] : []
  }
  /** Taps the offer that brings the explorer nearest `goal`, until he is there or nothing gets nearer. */
  const walkTo = (goal: readonly [number, number]) => {
    const distance = (grid: FloorGrid, from: readonly [number, number]): number => {
      const seen = new Map<string, number>([[`${from[0]},${from[1]}`, 0]])
      const queue: Place[] = [[from[0], from[1]]]
      for (let i = 0; i < queue.length; i++) {
        const [r, c] = queue[i]
        for (const dir of dirsOf(grid, r, c)) {
          const [dr, dc] = MOVES[dir]
          const key = `${r + dr},${c + dc}`
          if (seen.has(key)) continue
          seen.set(key, seen.get(`${r},${c}`)! + 1)
          queue.push([r + dr, c + dc])
        }
      }
      return seen.get(`${goal[0]},${goal[1]}`) ?? Infinity
    }
    for (let step = 0; step < 300; step++) {
      holder.hook.rerender()
      const { grid, explorerPos } = current()
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
      tap(best[0], best[1])
    }
  }
  return { store, encountered, current, tap, walkTo, remount, settle, holder }
}
