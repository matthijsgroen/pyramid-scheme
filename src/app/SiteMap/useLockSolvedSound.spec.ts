// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Lock } from "@/game/lockAuthoring"
import type { PlacedLock } from "@/game/floorLocks"
import { gateKeyOf } from "@/game/carve/ids"
import type { FloorRef } from "@/game/carve/state"

const playSound = vi.fn()
vi.mock("@/app/audio/audio", () => ({ playSound }))

const { useLockSolvedSound } = await import("./useLockSolvedSound")

const lockNamed = (name: string): Lock => ({
  name,
  regions: {},
  connections: [],
  gates: {
    A: { from: "in", to: "hall", owners: ["lever"] },
    B: { from: "hall", to: "out", owners: ["lever"] },
  },
  mechanics: {},
  in: "in",
  out: "out",
})

const FLOOR: FloorRef = { journeyId: "made-up", levelIndex: 0, floorIndex: 0 }
const UPSTAIRS: FloorRef = { ...FLOOR, floorIndex: 1 }
const LOCKS: PlacedLock[] = [{ lock: lockNamed("first") }, { lock: lockNamed("second") }]

const open = (floorRef: FloorRef, ...ids: string[]) => new Set(ids.map(id => gateKeyOf(floorRef, id)))

const mount = (openGateKeys: ReadonlySet<string>, floorRef = FLOOR) =>
  renderHook(props => useLockSolvedSound(props), {
    initialProps: { locks: LOCKS as readonly PlacedLock[] | undefined, openGateKeys, floorRef },
  })

beforeEach(() => playSound.mockClear())

describe("useLockSolvedSound", () => {
  it("opening a lock's last door plays lock.solved once", () => {
    const { rerender } = mount(open(FLOOR))
    rerender({ locks: LOCKS, openGateKeys: open(FLOOR, "first.A"), floorRef: FLOOR })
    expect(playSound).not.toHaveBeenCalled()
    rerender({ locks: LOCKS, openGateKeys: open(FLOOR, "first.A", "first.B"), floorRef: FLOOR })
    rerender({ locks: LOCKS, openGateKeys: open(FLOOR, "first.A", "first.B"), floorRef: FLOOR })
    expect(playSound.mock.calls).toEqual([["lock.solved"]])
  })

  it("a floor that loads with the lock already open plays nothing", () => {
    const { rerender } = mount(open(FLOOR, "first.B"))
    rerender({ locks: LOCKS, openGateKeys: open(FLOOR, "first.B"), floorRef: FLOOR })
    expect(playSound).not.toHaveBeenCalled()
  })

  it("closing and reopening the last door does not play again", () => {
    const { rerender } = mount(open(FLOOR))
    rerender({ locks: LOCKS, openGateKeys: open(FLOOR, "first.B"), floorRef: FLOOR })
    rerender({ locks: LOCKS, openGateKeys: open(FLOOR), floorRef: FLOOR })
    rerender({ locks: LOCKS, openGateKeys: open(FLOOR, "first.B"), floorRef: FLOOR })
    expect(playSound).toHaveBeenCalledTimes(1)
  })

  it("moving to another floor where a lock is open plays nothing", () => {
    const { rerender } = mount(open(FLOOR))
    rerender({ locks: LOCKS, openGateKeys: open(UPSTAIRS, "first.B"), floorRef: UPSTAIRS })
    expect(playSound).not.toHaveBeenCalled()
  })

  it("two locks opened in one write play twice", () => {
    const { rerender } = mount(open(FLOOR))
    rerender({ locks: LOCKS, openGateKeys: open(FLOOR, "first.B", "second.B"), floorRef: FLOOR })
    expect(playSound).toHaveBeenCalledTimes(2)
  })
})
