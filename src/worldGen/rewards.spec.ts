import { describe, expect, it } from "vitest"
import { hashStr, hintToReward, pathEndToReward, rollConsumable, specToGate, specToReward } from "./rewards"

// ── hashStr ────────────────────────────────────────────────────────────────────

describe("hashStr", () => {
  it("is deterministic for the same input", () => {
    expect(hashStr("starter_1:0")).toBe(hashStr("starter_1:0"))
  })

  it("differs for different input", () => {
    expect(hashStr("starter_1:0")).not.toBe(hashStr("starter_1:1"))
  })
})

// ── rollConsumable ─────────────────────────────────────────────────────────────

describe("rollConsumable", () => {
  it("only ever returns bandage, oil, or trapTool", () => {
    const rates = { bandage: 3, oil: 1, trapTool: 1 }
    for (let i = 0; i < 20; i++) {
      expect(["bandage", "oil", "trapTool"]).toContain(rollConsumable(`seed:${i}`, rates))
    }
  })

  it("is deterministic for the same seed and rates", () => {
    const rates = { bandage: 3, oil: 1, trapTool: 1 }
    expect(rollConsumable("seed", rates)).toBe(rollConsumable("seed", rates))
  })

  it("a zero-weighted type is never rolled", () => {
    const rates = { bandage: 1, oil: 0, trapTool: 0 }
    for (let i = 0; i < 20; i++) {
      expect(rollConsumable(`seed:${i}`, rates)).toBe("bandage")
    }
  })
})

// ── hintToReward / specToReward ─────────────────────────────────────────────────

describe("hintToReward", () => {
  it("mosaicPiece → { type: mosaicPiece }", () => {
    expect(hintToReward("mosaicPiece", "starter")).toEqual({ type: "mosaicPiece" })
  })

  it("mapPiece → tombId derived from tier", () => {
    expect(hintToReward("mapPiece", "expert")).toEqual({ type: "mapPiece", tombId: "expert_treasure_tomb" })
  })

  it("hieroglyphFragment → first tier symbol", () => {
    const reward = hintToReward("hieroglyphFragment", "starter")
    expect(reward.type).toBe("hieroglyphFragment")
  })
})

describe("specToReward", () => {
  it("string hint resolves via hintToReward", () => {
    expect(specToReward("mosaicPiece", "starter")).toEqual({ type: "mosaicPiece" })
  })

  it("structured object passes through unchanged", () => {
    const reward = { type: "mapPiece", tombId: "starter_treasure_tomb" } as const
    expect(specToReward(reward, "starter")).toEqual(reward)
  })
})

// ── specToGate ────────────────────────────────────────────────────────────────

describe("specToGate", () => {
  it("null → undefined (no gate)", () => {
    expect(specToGate(null)).toBeUndefined()
  })

  it("undefined → undefined", () => {
    expect(specToGate(undefined)).toBeUndefined()
  })

  it('"floor-key" → { type: "floor-key", color: "blue" }', () => {
    expect(specToGate("floor-key")).toEqual({ type: "floor-key", color: "blue" })
  })

  it('"tomb-key" string (ambiguous) → undefined (no keyId resolvable)', () => {
    expect(specToGate("tomb-key")).toBeUndefined()
  })

  it("structured tombId+index resolves to runtime wardKeyId", () => {
    expect(specToGate({ type: "tomb-key", tombId: "expert_treasure_tomb", index: 1 })).toEqual({
      type: "tomb-key",
      wardKeyId: "expert_a_2",
    })
    expect(specToGate({ type: "tomb-key", tombId: "wizard_treasure_tomb_b", index: 1 })).toEqual({
      type: "tomb-key",
      wardKeyId: "wizard_b_2",
    })
  })

  it("out-of-bounds index → undefined", () => {
    expect(specToGate({ type: "tomb-key", tombId: "starter_treasure_tomb", index: 99 })).toBeUndefined()
  })
})

// ── pathEndToReward ──────────────────────────────────────────────────────────────

describe("pathEndToReward", () => {
  it('"mosaic" → mosaicPiece', () => {
    expect(pathEndToReward("mosaic", "starter")).toEqual({ type: "mosaicPiece" })
  })

  it('"fragment" → fragmentSlot', () => {
    expect(pathEndToReward("fragment", "starter")).toEqual({ type: "fragmentSlot" })
  })

  it('"junk" → a sellable reward', () => {
    const reward = pathEndToReward("junk", "starter", "seed-0")
    expect(reward?.type).toBe("sellable")
  })

  it('"treasure" → undefined (no specific reward)', () => {
    expect(pathEndToReward("treasure", "starter")).toBeUndefined()
  })
})
