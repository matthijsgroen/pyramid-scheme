// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { RoomCell } from "@/game/siteTypes"

const talkRoom = {
  type: "room",
  roomType: "encounter",
  dirs: new Set(),
  state: "completed",
  family: "talk",
} as RoomCell

describe("a finished room that opens on arrival", () => {
  beforeEach(() => vi.resetModules())

  it("never opens one while no mod contributes, as with every such mod switched off", async () => {
    const { useMergedRoomArrivals } = await import("./roomArrivals")
    expect(renderHook(() => useMergedRoomArrivals("j1")).result.current(talkRoom)).toBe(false)
  })

  it("opens the rooms a contribution names", async () => {
    const { registerRoomArrivals, useMergedRoomArrivals } = await import("./roomArrivals")
    registerRoomArrivals(() => cell => cell.family === "talk")
    const opens = renderHook(() => useMergedRoomArrivals("j1")).result.current
    expect(opens(talkRoom)).toBe(true)
    expect(opens({ ...talkRoom, family: "other" })).toBe(false)
  })
})
