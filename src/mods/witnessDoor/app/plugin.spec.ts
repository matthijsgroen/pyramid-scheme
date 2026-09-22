// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { resolveFamilyByIdOrTag, type FamilyContext } from "@/app/families/familyRegistry"
import { ownedKeysFromSources } from "@/app/families/ownedKeySources"
import { traceWitnessBeam, type WitnessBoard } from "../game/generateWitnessDoor"
import { witnessKeyId, witnessSite, WITNESS_SHRINES } from "../game/witnessKeys"
import { useMintShrine } from "./mintedShrines"
import "./plugin"

const roomCtx: FamilyContext = {
  journeyId: "junior_2",
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
  it("reaches the map's owned keys, and carries no shrine that was not opened", async () => {
    const site = witnessSite("junior_2", 2)
    const { result } = renderHook(() => useMintShrine())
    await act(async () => {
      result.current(witnessKeyId(site, "east"))
    })
    const owned = ownedKeysFromSources(floorCtx)
    expect(owned.has("witness:junior_2#2:east")).toBe(true)
    expect(owned.has("witness:junior_2#2:north")).toBe(false)
    // A door on another floor of the same journey mints its own ids, and this one opens none of them.
    expect(owned.has(witnessKeyId(witnessSite("junior_2", 3), "east"))).toBe(false)
  })
})
