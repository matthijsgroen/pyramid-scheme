// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { beforeAll, describe, expect, it } from "vitest"
import type { FloorConfig, FloorGrid } from "@/game/siteTypes"
import { assembleFloor } from "@/game/siteAssembler"
import { cellAddress } from "@/game/cellAddress"
import { doorOpen, type DoorMode } from "@/game/doorOpen"
import { floorLock } from "@/game/floorLock"
import { openGates, walkLock, type LockConfig } from "@/game/lockWalk"
import { journeys as allKnownJourneys } from "@/data/journeys"
import { resolveEncounter } from "@/app/families/familyRegistry"
import { resolveKeyRequirements } from "@/mods/allFamilyMeta"
import { torchAndFloorKeyDoorFloor } from "@/game/testSupport/mixedDoorFixtures"
import { useAssembledFloor } from "./useAssembledFloor"
import { cellKey } from "./cellIdentity"
import "@/mods/registerModApps"

// A journey the store knows; the floors are carved under its id, which only seeds their gate key ids.
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

const MODES: { name: string; mode: DoorMode }[] = [
  { name: "and", mode: "all" },
  { name: "any", mode: "any" },
]
const carved = new Map<DoorMode, Carved>()
beforeAll(() => {
  for (const { mode } of MODES) carved.set(mode, carve(torchAndFloorKeyDoorFloor(mode === "any" ? "any" : undefined)))
}, 120_000)

const cellsOf = (grid: FloorGrid) =>
  grid.cells.flatMap((row, r) =>
    row.flatMap((cell, c) => (cell.type === "room" ? [{ cell, at: [r, c] as [number, number] }] : []))
  )

// The door the floor stands on the way to the vault: it asks for its gate key and the floor key.
const parts = (grid: FloorGrid) => {
  const rooms = cellsOf(grid)
  const door = rooms.find(({ cell }) => cell.requiredKeyId && cell.requiredKeyIds?.length)!
  const keyId = door.cell.requiredKeyIds![0]
  const torch = rooms.find(({ cell }) => cell.mechanism)!
  const chest = rooms.find(({ cell }) => cell.reward?.type === "tombKey" && cell.reward.keyId === keyId)!
  return { door, torch, chest, keyId }
}

const STATES = [
  { torch: "unlit", held: false },
  { torch: "unlit", held: true },
  { torch: "lit", held: false },
  { torch: "lit", held: true },
]

describe("a door owned by a torch and a floor key, on a carved floor", () => {
  for (const { name, mode } of MODES) {
    it(`${name}: the carved floor is sound to walk`, () => {
      const { grid } = carved.get(mode)!
      const lock = floorLock(grid)!
      expect(Object.values(lock.gates).filter(gate => gate.owners.length === 2)).not.toHaveLength(0)
      expect(walkLock(lock)).toMatchObject({ sound: true })
    })

    it(`${name}: the door the proof reads and the door the walk reads stand open in the same states`, () => {
      const { config, seed, grid } = carved.get(mode)!
      const { door, torch, chest, keyId } = parts(grid)
      const lock = floorLock(grid)!
      const torchId = Object.keys(lock.mechanisms).find(id => id.endsWith(` ${torch.at[0]},${torch.at[1]}`))!
      const gates = Object.entries(lock.gates).filter(([id]) => id.startsWith(`door ${door.at[0]},${door.at[1]}|`))
      const held = { [chest.cell.sectionAddress!]: [cellKey(grid, 0, chest.at[0], chest.at[1])!] }

      for (const state of STATES) {
        const want = doorOpen([state.torch === "lit", state.held], mode)
        const proof: LockConfig = Object.fromEntries(Object.entries(lock.mechanisms).map(([id, m]) => [id, m.initial]))
        proof[torchId] = state.torch
        if (state.held) proof[`key ${keyId}`] = "held"
        const open = openGates(lock, proof)

        const positions = new Map([[cellAddress(grid, 0, torch.at[0], torch.at[1])!, state.torch]])
        const { result } = renderHook(() =>
          useAssembledFloor(JOURNEY, config, seed, 0, state.held ? held : {}, null, 0, undefined, undefined, positions)
        )
        const drawn = result.current.grid!.cells[door.at[0]][door.at[1]]

        expect(
          {
            proof: gates.map(([id]) => open.has(id)),
            walk: result.current.openGateKeys.has(door.cell.requiredKeyId!),
            carvedOpen: drawn.type === "corridor",
          },
          `${name}, torch ${state.torch}, key ${state.held ? "held" : "not held"}`
        ).toEqual({ proof: gates.map(() => want), walk: want, carvedOpen: want })
      }
    })
  }
})

describe("the key a gate asks for", () => {
  it("is refused by name when the section it names has no floor-key gate", () => {
    const config = torchAndFloorKeyDoorFloor()
    const bad: FloorConfig = {
      ...config,
      obstacles: config.obstacles!.map(o => (o.kind === "gate" ? { ...o, floorKeys: ["keeper"] } : o)),
    }
    const result = assembleFloor(JOURNEY, bad, 1, resolveEncounter, {
      resolveKeyRequirements,
      floorRef: { journeyId: JOURNEY, floorIndex: 0 },
    })
    expect(result.success).toBe(false)
    expect(!result.success && result.reasons).toEqual([
      { type: "gateKeyNamesNoFloorKey", id: "vaultDoor", section: "keeper" },
    ])
  })
})
