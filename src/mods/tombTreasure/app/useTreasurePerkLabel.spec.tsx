import { describe, it, expect, vi } from "vitest"
import { renderHook } from "@testing-library/react"

// A perk with an owning mod describes itself through that mod's i18n; the merged describe is that
// seam. Only `compass` has an owner here, so the other branches are exercised for real.
vi.mock("@/app/SiteMap/perkContributions", () => ({
  useMergedPerkContributions: () => ({
    grant: () => {},
    describe: (perk: { type: string; level?: number }) =>
      perk.type === "compass" ? { label: `owned compass ${perk.level}` } : undefined,
  }),
}))

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const { ns, ...values } = opts ?? {}
      void ns
      return Object.keys(values).length > 0 ? `${key}:${JSON.stringify(values)}` : key
    },
  }),
}))

const { useTreasurePerkLabel } = await import("./useTreasurePerkLabel")

const labelFor = (keyId: string) => renderHook(() => useTreasurePerkLabel()).result.current(keyId)

describe(useTreasurePerkLabel, () => {
  it("lets the owning mod word its own perk", () => {
    expect(labelFor("starter_a_2")).toBe("owned compass 1") // starter_a_2 = compass level 1
  })

  it("names the tier a tier-unlock treasure opens", () => {
    expect(labelFor("starter_a_1")).toBe('perks.tier-unlock:{"tier":"difficulty.junior"}')
  })

  it("describes a location-key treasure as revealing another tomb", () => {
    expect(labelFor("expert_a_2")).toBe("perks.location-key")
  })

  it("has nothing to say about a treasure that is a pure ward key", () => {
    expect(labelFor("junior_a_2")).toBeUndefined() // perk: none
  })

  it("has nothing to say about a keyId that isn't a treasure", () => {
    expect(labelFor("not_a_treasure")).toBeUndefined()
  })
})
