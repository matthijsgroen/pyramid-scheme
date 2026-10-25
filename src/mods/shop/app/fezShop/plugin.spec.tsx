// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"
import type { FamilyPlugin } from "@/app/families/familyRegistry"
import { FezContext } from "@/app/fez/context"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock("@/mods/registeredMods", () => ({ isModEnabled: () => true }))
vi.mock("@/ui/organisms/FezShop", () => ({ FezShop: () => <p>stall</p> }))
vi.mock("@/app/SiteMap/rewardDisplay", () => ({ rewardText: () => ({}) }))
vi.mock("@/data/sellables", () => ({ getSellableById: () => undefined, sellValueForItemId: () => 0 }))
vi.mock("@/mods/shop/game/pricing", () => ({ priceFor: () => 1 }))

const report = vi.fn()
vi.mock("@/app/reactions/useReport", async () => {
  const { useEffect, useRef } = await import("react")
  // The real useReportOnce over the spy: one report per key while it holds.
  return {
    useReportOnce: (key: string | undefined, reaction: unknown) => {
      const reported = useRef<string | undefined>(undefined)
      useEffect(() => {
        if (key === undefined || reported.current === key) return
        reported.current = key
        report(reaction)
      }, [key, reaction])
    },
  }
})

let skipped = new Set<string>()
vi.mock("@/app/SiteMap/rewardContributions", () => ({
  useMergedRewardContributions: () => ({ skip: (reward: { id?: string }) => skipped.has(String(reward.id)) }),
}))

let plugin: FamilyPlugin | undefined
vi.mock("@/app/families/familyRegistry", () => ({
  registerFamily: (registered: FamilyPlugin) => {
    plugin = registered
  },
}))

await import("./plugin")

const stock = [
  { type: "purchase", id: "made-up-mule" },
  { type: "purchase", id: "made-up-flag" },
  { type: "sellable", id: "made-up-pot" },
]

const stall = (greeting: "complete" | "never", claimedSlots: string[] = []) => {
  const showConversation = vi.fn((_id: string, onDone?: (result: string) => void) => {
    if (greeting === "complete") onDone?.("complete")
  })
  const Component = plugin!.Component as unknown as React.FC<Record<string, unknown>>
  render(
    <FezContext value={{ showConversation } as unknown as React.ContextType<typeof FezContext>}>
      <Component
        ctx={{ journeyId: "made-up-tomb", address: "made-up-address", edgeId: "e", sectionHash: "h", stock }}
        progression={{ ledger: { get: () => 0 } }}
        journeys={{
          getPurchasedShopSlots: () => new Set(claimedSlots),
          markCellExplored: () => {},
        }}
        inventory={{ inventory: {} }}
        onCancel={() => {}}
      />
    </FezContext>
  )
}

describe("Fez's stall", () => {
  beforeEach(() => {
    report.mockClear()
    skipped = new Set()
  })

  it("reports what it shows for sale once, after Fez has greeted", () => {
    stall("complete")
    expect(report).toHaveBeenCalledTimes(1)
    expect(report).toHaveBeenCalledWith({ kind: "stockShown", journeyId: "made-up-tomb", rewards: stock })
  })

  it("reports nothing before the greeting is done", () => {
    stall("never")
    expect(report).not.toHaveBeenCalled()
  })

  it("leaves out a purchase the owning mod skips and a slot already bought", () => {
    skipped = new Set(["made-up-mule"])
    stall("complete", ["made-up-address!2"])
    expect(report).toHaveBeenCalledWith({
      kind: "stockShown",
      journeyId: "made-up-tomb",
      rewards: [{ type: "purchase", id: "made-up-flag" }],
    })
  })
})
