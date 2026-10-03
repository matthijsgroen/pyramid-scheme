// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { act, cleanup, render, renderHook, screen } from "@testing-library/react"
import "@/mods/registerModApps"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { useAssembledFloor } from "@/app/SiteMap/useAssembledFloor"
import { cellKey } from "@/app/SiteMap/cellIdentity"
import { useEncounter } from "@/app/SiteMap/useEncounter"
import { resolveEncounter } from "@/app/families/familyRegistry"
import { journeys as allKnownJourneys } from "@/data/journeys"
import { cellAddress } from "@/game/cellAddress"
import { assembleFloor } from "@/game/siteAssembler"
import type { FloorConfig, FloorGrid } from "@/game/siteTypes"
import { torchAndFloorKeyDoorFloor } from "@/game/testSupport/mixedDoorFixtures"
import { resolveKeyRequirements } from "@/mods/allFamilyMeta"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}|${Object.values(options).join(",")}` : key,
  }),
}))

afterEach(cleanup)

const JOURNEY = allKnownJourneys[0].id

type Carved = { config: FloorConfig; seed: number; grid: FloorGrid }
const carve = (config: FloorConfig): Carved => {
  for (let seed = 0; seed < 60; seed++) {
    const result = assembleFloor(JOURNEY, config, seed, resolveEncounter, {
      resolveKeyRequirements,
      floorRef: { journeyId: JOURNEY, floorIndex: 0 },
    })
    if (result.success) return { config, seed, grid: result.grid }
  }
  throw new Error("no seed carved this floor")
}

const carved: Record<"and" | "any", Carved> = {} as never
beforeAll(() => {
  carved.and = carve(torchAndFloorKeyDoorFloor())
  carved.any = carve(torchAndFloorKeyDoorFloor("any"))
}, 120_000)

const rooms = (grid: FloorGrid) =>
  grid.cells.flatMap((row, r) =>
    row.flatMap((cell, c) => (cell.type === "room" ? [{ cell, at: [r, c] as [number, number] }] : []))
  )

const COMBINATIONS = [
  { torch: "unlit", held: false },
  { torch: "unlit", held: true },
  { torch: "lit", held: false },
  { torch: "lit", held: true },
]

// The floor as a player meets it: real carve, the torch in the given state, the key chest explored or not.
const stand = (which: "and" | "any", torch: string, held: boolean) => {
  const { config, seed, grid } = carved[which]
  const torchAt = rooms(grid).find(({ cell }) => cell.mechanism)!
  const chest = rooms(grid).find(({ cell }) => cell.reward?.type === "tombKey")!
  const explored = held ? { [chest.cell.sectionAddress!]: [cellKey(grid, 0, chest.at[0], chest.at[1])!] } : {}
  const positions = new Map([[cellAddress(grid, 0, torchAt.at[0], torchAt.at[1])!, torch]])
  const journeys = {
    markCellExplored: vi.fn(),
    setMechanismState: vi.fn(),
    getMechanismStates: () => new Map<string, string>(),
  } as unknown as JourneyAPI
  return renderHook(() => {
    const floor = useAssembledFloor(JOURNEY, config, seed, 0, explored, null, 0, new Set(), undefined, positions)
    const encounter = useEncounter({
      journeys,
      journeyId: JOURNEY,
      levelNr: 1,
      currentFloor: 0,
      difficulty: "expert",
      grid: floor.grid,
      ownedKeys: floor.openGateKeys,
      onReward: vi.fn(),
    })
    return { floor, encounter }
  })
}

const faceDoor = (grid: FloorGrid) =>
  rooms(grid).find(({ cell }) => cell.gateFace) as { cell: { gateFace: unknown }; at: [number, number] } | undefined

describe("the face of a carved door owned by a torch and a floor key", () => {
  for (const { torch, held } of COMBINATIONS) {
    it(`and: shows a flame and a key, lit as the torch is ${torch} and the key is ${held ? "held" : "not held"}`, () => {
      const hook = stand("and", torch, held)
      const grid = hook.result.current.floor.grid!
      const door = faceDoor(grid)
      if (torch === "lit" && held) {
        expect(door).toBeUndefined()
        return
      }
      expect(door).toBeDefined()
      act(() => hook.result.current.encounter.open(door!.at, true))
      const { family, ctx, puzzle } = hook.result.current.encounter
      const Component = family!.Component
      render(
        <Component
          puzzle={puzzle}
          ctx={ctx!}
          progression={{} as never}
          journeys={{} as never}
          inventory={{} as never}
          applyReward={vi.fn()}
          onSolved={vi.fn()}
          onCancel={vi.fn()}
        />
      )
      const items = screen.getAllByRole("listitem")
      expect(items).toHaveLength(2)
      expect(items[0].textContent).toBe("🔥")
      expect(items[1].querySelector("svg")).not.toBeNull()
      expect(items.map(m => m.getAttribute("data-lit"))).toEqual([String(torch === "lit"), String(held)])
    })
  }

  it("any: the twin door has no face in any state", () => {
    for (const { torch, held } of COMBINATIONS)
      expect(faceDoor(stand("any", torch, held).result.current.floor.grid!)).toBeUndefined()
  })
})
