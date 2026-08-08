import { describe, it, expect, vi, beforeAll } from "vitest"
import { renderHook } from "@testing-library/react"
import { createInstance, type i18n as I18n } from "i18next"
import type { RewardDisplay } from "@/app/SiteMap/rewardDisplayRegistry"
import commonEn from "../../../../public/locales/en/common.json"
import commonNl from "../../../../public/locales/nl/common.json"
import journeysEn from "../../../../public/locales/en/journeys.json"
import journeysNl from "../../../../public/locales/nl/journeys.json"

// Controlled map-piece progress — the branch under test is "how much of this tomb's map is held".
let progress = { found: 1, required: 3 }
vi.mock("./useTombTreasureProgress", () => ({
  useTombTreasureProgress: () => ({ mapPieceProgress: () => progress }),
}))

// Stands in for the perk line; its own wording is covered in useTreasurePerkLabel.spec.
vi.mock("./useTreasurePerkLabel", () => ({
  useTreasurePerkLabel: () => (keyId: string) => (keyId === "junior_a_2" ? undefined : "perk:" + keyId),
}))

// Identity `t`, with the interpolation payload appended so the assertions can see which tomb string
// was asked for and with what values.
const t = (key: string, opts?: Record<string, unknown>) => {
  if (!opts) return key
  const { ns, defaultValue, ...values } = opts
  const suffix = Object.keys(values).length > 0 ? `:${JSON.stringify(values)}` : ""
  void ns
  void defaultValue
  return `${key}${suffix}`
}

const { registerTombTreasureRewardDisplay } = await import("./rewardDisplay")
const { useMergedRewardDisplays } = await import("@/app/SiteMap/rewardDisplayRegistry")

registerTombTreasureRewardDisplay()

const mapPieceDisplay = (tombId = "expert_treasure_tomb_b", translate = t): RewardDisplay => {
  const { result } = renderHook(() => useMergedRewardDisplays())
  const build = result.current.mapPiece
  if (!build) throw new Error("no mapPiece display registered")
  return build({ type: "mapPiece", tombId }, translate)
}

describe("map-piece reward display", () => {
  it("hints at the destination without naming the tomb while the map is incomplete", () => {
    progress = { found: 1, required: 3 }
    const display = mapPieceDisplay()
    expect(display.itemDescription).toBe("expert_treasure_tomb_b.mapHint")
    expect(display.itemEffectDescription).toBe('chest.mapPieceProgress:{"found":1,"required":3}')
    expect(display.rarity).toBe("common")
  })

  it("climbs to rare part-way through the set", () => {
    progress = { found: 2, required: 3 }
    expect(mapPieceDisplay().rarity).toBe("rare")
  })

  it("names the tomb and turns legendary once the set is complete", () => {
    progress = { found: 3, required: 3 }
    const display = mapPieceDisplay()
    expect(display.itemDescription).toBe('chest.mapPieceComplete:{"name":"expert_treasure_tomb_b.name"}')
    expect(display.itemEffectDescription).toBe('chest.mapPieceProgress:{"found":3,"required":3}')
    expect(display.rarity).toBe("legendary")
  })

  it("never reports more pieces found than the tomb requires", () => {
    progress = { found: 5, required: 3 }
    expect(mapPieceDisplay().itemEffectDescription).toBe('chest.mapPieceProgress:{"found":3,"required":3}')
  })

  // The identity `t` above proves which keys are asked for; only the real i18next proves those keys
  // exist in the shipped locale files, in both languages, with the namespace RewardFlow loads.
  describe("against the real locale files", () => {
    let i18n: I18n

    beforeAll(async () => {
      i18n = createInstance()
      await i18n.init({
        lng: "en",
        fallbackLng: "en",
        defaultNS: "common",
        interpolation: { escapeValue: false },
        resources: {
          en: { common: commonEn, journeys: journeysEn },
          nl: { common: commonNl, journeys: journeysNl },
        },
      })
    })

    it("renders the tomb's own hint while the map is incomplete", () => {
      progress = { found: 1, required: 3 }
      const display = mapPieceDisplay("expert_treasure_tomb_b", i18n.getFixedT("en", "common"))
      expect(display.itemDescription).toBe(
        "Corridors run past the temple vaults to a sealed door — only the highest priests ever passed it."
      )
      expect(display.itemEffectDescription).toBe("1 of 3 map pieces gathered")
    })

    it("names the tomb once the map is complete", () => {
      progress = { found: 3, required: 3 }
      const display = mapPieceDisplay("expert_treasure_tomb_b", i18n.getFixedT("en", "common"))
      expect(display.itemDescription).toBe("The map is whole — it leads to Inner Sanctum.")
    })

    it("renders in Dutch too", () => {
      progress = { found: 2, required: 2 }
      const display = mapPieceDisplay("wizard_treasure_tomb_c", i18n.getFixedT("nl", "common"))
      expect(display.itemDescription).toBe("De kaart is compleet — hij leidt naar Troon der Eeuwigheid.")
      expect(display.itemEffectDescription).toBe("2 van 2 kaartdelen verzameld")
    })
  })

  it("keeps the generic scrap text in the synchronous handler (shop stock has no progress)", async () => {
    const { rewardText } = await import("@/app/SiteMap/rewardDisplay")
    const text = rewardText({ type: "mapPiece", tombId: "expert_treasure_tomb_b" }, t)
    expect(text.itemName).toBe("chest.mapPiece")
    expect(text.itemDescription).toBe("chest.mapPieceDescription")
  })
})

// The perk line's own wording is covered in useTreasurePerkLabel.spec; here it stands in for
// "whatever that treasure's perk reads as", so these cases are about what the popup does with it.
describe("tomb-treasure reward display", () => {
  const tombKeyDisplay = (keyId: string, translate = t): RewardDisplay => {
    const { result } = renderHook(() => useMergedRewardDisplays())
    const build = result.current.tombKey
    if (!build) throw new Error("no tombKey display registered")
    return build({ type: "tombKey", keyId }, translate)
  }

  it("says what the treasure does for you, alongside what it is", () => {
    const display = tombKeyDisplay("starter_a_2")
    expect(display.itemName).toBe("merchantCache.t2.name")
    expect(display.itemDescription).toBe("merchantCache.t2.description")
    expect(display.itemEffectDescription).toBe("perk:starter_a_2")
  })

  it("marks a treasure that opens a tier or another tomb as legendary", () => {
    expect(tombKeyDisplay("starter_a_1").rarity).toBe("legendary") // tier-unlock
    expect(tombKeyDisplay("expert_a_2").rarity).toBe("legendary") // location-key
  })

  it("keeps a plain perk treasure at epic", () => {
    expect(tombKeyDisplay("starter_a_3").rarity).toBe("epic")
  })

  it("falls back to the generic key label for a keyId with no catalog treasure", () => {
    expect(tombKeyDisplay("not_a_treasure").itemName).toBe("chest.tombKey")
  })
})
