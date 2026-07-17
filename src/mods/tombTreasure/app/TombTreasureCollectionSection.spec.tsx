import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import { difficultyTreasures, keyIdByTreasureId } from "../game/treasures"

afterEach(cleanup)

// Identity i18n — group titles render as their keys ("collection.treasureCategories.<category>").
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

// Controlled owned-key set drives the hide-until-first-collected condition per difficulty group.
let tombKeyIds: ReadonlySet<string> = new Set()
vi.mock("./useTombTreasureProgress", () => ({
  useTombTreasureProgress: () => ({ tombKeyIds }),
}))
vi.mock("@/app/SiteMap/perkContributions", () => ({
  useMergedPerkContributions: () => ({ describe: () => undefined, grant: () => {} }),
}))

const { TombTreasureCollectionSection } = await import("./TombTreasureCollectionSection")

const MERCHANT_CACHE = "collection.treasureCategories.merchantCache" // starter group
const NOBLE_VAULT = "collection.treasureCategories.nobleVault" // junior group
const starterKeyId = keyIdByTreasureId[difficultyTreasures.starter[0].id]

describe("TombTreasureCollectionSection hide-until-collected (per group)", () => {
  it("renders no groups when no tomb treasure is owned", () => {
    tombKeyIds = new Set()
    render(<TombTreasureCollectionSection selectedItem={null} onSelect={() => {}} />)
    expect(screen.queryByText(MERCHANT_CACHE)).toBeNull()
    expect(screen.queryByText(NOBLE_VAULT)).toBeNull()
  })

  it("shows only the group that has an owned treasure", () => {
    tombKeyIds = new Set([starterKeyId])
    render(<TombTreasureCollectionSection selectedItem={null} onSelect={() => {}} />)
    expect(screen.getByText(MERCHANT_CACHE)).toBeTruthy() // starter group revealed
    expect(screen.queryByText(NOBLE_VAULT)).toBeNull() // junior group still hidden
  })
})
