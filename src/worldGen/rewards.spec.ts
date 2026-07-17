import { describe, expect, it } from "vitest"
import { hashStr, hintToReward, pathEndToReward, specToGate, specToReward } from "./rewards"

// ── hashStr ────────────────────────────────────────────────────────────────────

describe("hashStr", () => {
  it("is deterministic for the same input", () => {
    expect(hashStr("starter_1:0")).toBe(hashStr("starter_1:0"))
  })

  it("differs for different input", () => {
    expect(hashStr("starter_1:0")).not.toBe(hashStr("starter_1:1"))
  })
})

// (rollConsumable moved to the trap mod — see src/mods/trap/game/consumableTypes.spec.ts)

// ── hintToReward / specToReward ─────────────────────────────────────────────────

describe("hintToReward", () => {
  it("mosaicPiece → a preference-tagged open slot (mosaic is a mod-owned capped currency)", () => {
    expect(hintToReward("mosaicPiece", "starter")).toEqual({ type: "fragmentSlot", prefers: "mosaicPiece" })
  })

  it("mapPiece → a preference-tagged open slot, not a baked literal", () => {
    expect(hintToReward("mapPiece", "expert")).toEqual({
      type: "fragmentSlot",
      prefers: "mapPiece:expert_treasure_tomb",
    })
  })

  it("hieroglyph → a preference-tagged open slot (any hieroglyph), never a baked literal", () => {
    expect(hintToReward("hieroglyph", "starter")).toEqual({ type: "fragmentSlot", prefers: "hieroglyph" })
  })
})

describe("specToReward", () => {
  it("string hint resolves via hintToReward", () => {
    expect(specToReward("mosaicPiece", "starter")).toEqual({ type: "fragmentSlot", prefers: "mosaicPiece" })
  })

  it("structured mapPiece object also becomes a preference-tagged open slot", () => {
    const reward = { type: "mapPiece", tombId: "starter_treasure_tomb" } as const
    expect(specToReward(reward, "starter")).toEqual({ type: "fragmentSlot", prefers: "mapPiece:starter_treasure_tomb" })
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
  it('"mosaic" → a preference-tagged open slot', () => {
    expect(pathEndToReward("mosaic")).toEqual({ type: "fragmentSlot", prefers: "mosaicPiece" })
  })

  it('"fragment" → fragmentSlot', () => {
    expect(pathEndToReward("fragment")).toEqual({ type: "fragmentSlot" })
  })

  it('"junk" → a preference-tagged open slot (the shop mod fills it, not a baked literal)', () => {
    expect(pathEndToReward("junk")).toEqual({ type: "fragmentSlot", prefers: "junk" })
  })

  it('"treasure" → an untagged fragmentSlot (a loot slot with no preference)', () => {
    // A treasure room gives loot (pyramid-interior-design.md §10); the slot has no `prefers`, so the
    // solver fills it with whatever's spare. Same as "fragment".
    expect(pathEndToReward("treasure")).toEqual({ type: "fragmentSlot" })
  })
})
