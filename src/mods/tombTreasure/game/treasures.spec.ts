import { describe, expect, it } from "vitest"
import { TOMB_PERK_IDS } from "@/data/treasurePerks"
import { TOMB_TREASURES, keyIdByTreasureId, treasureByKeyId, allTreasures } from "./treasures"
import { TREASURE_PERKS } from "./treasurePerks"

// The Collection section derives "collected" from a treasure's keyId (a tombKey), so the zip of
// each tomb's ordered treasures with its ordered keyId list must be 1:1 and total (all 40).
describe("tomb treasure ↔ keyId mapping", () => {
  it("zips every tomb's treasures 1:1 with its keyIds", () => {
    for (const [tombId, treasures] of Object.entries(TOMB_TREASURES)) {
      expect(TOMB_PERK_IDS[tombId], `${tombId} has a keyId list`).toBeDefined()
      expect(treasures.length, `${tombId} treasure count matches keyIds`).toBe(TOMB_PERK_IDS[tombId].length)
    }
  })

  it("maps all 40 treasures to a keyId with a known perk, and back", () => {
    expect(allTreasures.length).toBe(40)
    for (const treasure of allTreasures) {
      const keyId = keyIdByTreasureId[treasure.id]
      expect(keyId, `${treasure.id} has a keyId`).toBeDefined()
      expect(TREASURE_PERKS[keyId], `${keyId} has a perk`).toBeDefined()
      expect(treasureByKeyId[keyId].id, `${keyId} maps back to ${treasure.id}`).toBe(treasure.id)
    }
  })

  it("covers every authored keyId (no orphan perks)", () => {
    for (const keyId of Object.keys(TREASURE_PERKS)) {
      expect(treasureByKeyId[keyId], `${keyId} has a treasure`).toBeDefined()
    }
  })
})
