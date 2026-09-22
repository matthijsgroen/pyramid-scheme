// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { primeModState } from "@/app/state/useModState"
import { resolveFamilyByIdOrTag, type FamilyContext } from "@/app/families/familyRegistry"
import { ownedKeysFromSources, subscribeOwnedKeys } from "@/app/families/ownedKeySources"
import { traceWitnessBeam, type WitnessBoard } from "../game/generateWitnessDoor"
import { witnessKeyId, witnessSite, WITNESS_SHRINES } from "../game/witnessKeys"
import { useMintShrine } from "./mintedShrines"
import "./plugin"

const roomCtx: FamilyContext = {
  journeyId: "junior_2",
  levelNr: 3,
  edgeId: "2:4,4",
  address: "s0#2/4",
  sectionHash: "s0",
  freshArrival: true,
  difficulty: "junior",
}

const floorCtx = { journeyId: "junior_2", levelNr: 3, floorIndex: 2 }

describe("the witness door family", () => {
  it("resolves by its authored id", () => {
    expect(resolveFamilyByIdOrTag("witnessDoor")?.meta.id).toBe("witnessDoor")
  })

  // Its own tag, never "puzzle" — a room drawn from the generic pool would have no fork to open
  // (src/mods/witnessDoor/index.spec.ts pins the pool itself).
  it("resolves by its own tag", () => {
    expect(resolveFamilyByIdOrTag(["witnessDoor"])?.meta.id).toBe("witnessDoor")
  })

  it("builds a board with a route to each shrine at the tier the room carries", () => {
    const board = resolveFamilyByIdOrTag("witnessDoor")!.generate(7, roomCtx) as WitnessBoard
    expect(board.grid.size).toBe(7)
    expect(traceWitnessBeam(board, board.grid.initial).shrine).toBeUndefined()
    expect(WITNESS_SHRINES.every(shrine => board.shrines[shrine])).toBe(true)
  })
})

describe("the shrines it has minted", () => {
  /**
   * A mint has to ANNOUNCE itself, not merely be stored.
   *
   * The map reads the sources once per floor and memoizes; nothing it depends on moves when a key is
   * minted on the floor the player is already standing on, which is the only floor a witness key is ever
   * used. Without the announcement the gate stays shut until the site is left and re-entered — and a spec
   * that calls `ownedKeysFromSources` itself would never notice.
   */
  it("wakes the map, and is in the union by the time it does", async () => {
    const site = witnessSite("junior_2", 3, 2)
    const { result } = renderHook(() => useMintShrine())
    // The plugin's own load announces itself as well; let that land before listening, or its wake
    // would stand in for the one this test is about.
    await act(async () => {
      await primeModState("witnessDoor")
    })
    const sawTheKey: boolean[] = []
    const unsubscribe = subscribeOwnedKeys(() =>
      sawTheKey.push(ownedKeysFromSources(floorCtx).has(witnessKeyId(site, "east")))
    )
    await act(async () => {
      result.current(witnessKeyId(site, "east"))
    })
    unsubscribe()
    expect(sawTheKey).toContain(true)
  })

  // A solved board mints again on every re-mount. Left to write, that is a database round trip and a
  // revision bump per visit, and the re-render each bump causes would feed the next one.
  it("is not minted a second time", async () => {
    const site = witnessSite("junior_2", 3, 2)
    const { result } = renderHook(() => useMintShrine())
    const woken = vi.fn()
    const unsubscribe = subscribeOwnedKeys(woken)
    await act(async () => {
      result.current(witnessKeyId(site, "east"))
    })
    unsubscribe()
    expect(woken).not.toHaveBeenCalled()
  })

  it("carries no shrine that was not opened", () => {
    const owned = ownedKeysFromSources(floorCtx)
    expect(owned.has("witness:junior_2#3#2:east")).toBe(true)
    expect(owned.has("witness:junior_2#3#2:north")).toBe(false)
    // The same journey's OTHER pyramid, and another floor of this one, mint their own ids.
    expect(owned.has(witnessKeyId(witnessSite("junior_2", 4, 2), "east"))).toBe(false)
    expect(owned.has(witnessKeyId(witnessSite("junior_2", 3, 3), "east"))).toBe(false)
  })
})
