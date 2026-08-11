import { render, cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { FamilyContext } from "@/app/families/familyRegistry"
import { registerKeyDisplay } from "@/app/SiteMap/keyProviders"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

// Stands in for the tomb-treasure mod: it owns the ward keys, so it is what knows a key's sign.
const WARD_SYMBOL = "𓈖"
registerKeyDisplay(() => keyId => (keyId === "starter_a_1" ? { symbol: WARD_SYMBOL } : undefined))

const { getFamilyPlugin } = await import("@/app/families/familyRegistry")
await import("./plugin")

const plugin = getFamilyPlugin("key-gate")!

const ctx = (overrides: Partial<FamilyContext>): FamilyContext =>
  ({
    journeyId: "starter_1",
    edgeId: "0:1,1",
    sectionHash: "",
    freshArrival: true,
    difficulty: "starter",
    gateVariant: "tomb-key",
    ...overrides,
  }) as FamilyContext

const renderGate = (overrides: Partial<FamilyContext>) => {
  const context = ctx(overrides)
  return render(
    <plugin.Component
      puzzle={plugin.generate(1, context)}
      ctx={context}
      // The gate reads none of these; it has no state of its own beyond the key precondition.
      progression={undefined as never}
      journeys={undefined as never}
      inventory={undefined as never}
      applyReward={() => {}}
      onSolved={() => {}}
      onCancel={() => {}}
    />
  )
}

afterEach(cleanup)

describe("ward gate", () => {
  it("shows the sign of the key that opens it, so a locked door says which key it wants", () => {
    const { queryByText } = renderGate({ requiredKeyId: "starter_a_1", ownedKeys: new Set() })

    expect(queryByText("gate.markedWith")).not.toBeNull()
    expect(queryByText(WARD_SYMBOL)).not.toBeNull()
    expect(queryByText("gate.locked")).not.toBeNull()
  })

  it("keeps showing the sign once the key is held, so the door still reads as that treasure's", () => {
    const { queryByText } = renderGate({ requiredKeyId: "starter_a_1", ownedKeys: new Set(["starter_a_1"]) })

    expect(queryByText(WARD_SYMBOL)).not.toBeNull()
    expect(queryByText("gate.unlocked")).not.toBeNull()
  })

  it("shows no mark for a key nobody has a sign for", () => {
    const { queryByText } = renderGate({ requiredKeyId: "floor_key_red", ownedKeys: new Set() })

    expect(queryByText("gate.markedWith")).toBeNull()
  })

  it("carries no key colour — a ward is identified by its treasure, not by a hue", () => {
    const { queryByText } = renderGate({ requiredKeyId: "starter_a_1", ownedKeys: new Set() })

    expect(queryByText("gate.needsKey")).toBeNull()
  })
})

describe("floor-key door", () => {
  const floorGate = (overrides: Partial<FamilyContext> = {}) =>
    renderGate({ gateVariant: "floor-key", keyColor: "red", requiredKeyId: "site-3-4", ...overrides })

  it("names the colour of the key it wants, so the player knows what to hunt for", () => {
    const { queryByText } = floorGate({ ownedKeys: new Set() })

    expect(queryByText("gate.needsKey")).not.toBeNull()
    expect(queryByText("keys.red")).not.toBeNull()
  })

  it("says the key is missing from THIS floor, not just that some key is missing", () => {
    const { queryByText } = floorGate({ ownedKeys: new Set() })

    expect(queryByText("gate.lockedColor")).not.toBeNull()
    expect(queryByText("gate.locked")).toBeNull()
  })

  it("keeps naming the colour once the key is held, and reads as unlocked", () => {
    const { queryByText } = floorGate({ ownedKeys: new Set(["site-3-4"]) })

    expect(queryByText("keys.red")).not.toBeNull()
    expect(queryByText("gate.unlocked")).not.toBeNull()
  })

  it("falls back to blue when world-gen left the colour unset — the same default the map draws", () => {
    const { queryByText } = floorGate({ keyColor: undefined, ownedKeys: new Set() })

    expect(queryByText("keys.blue")).not.toBeNull()
  })
})
