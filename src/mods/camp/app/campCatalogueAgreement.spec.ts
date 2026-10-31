import { describe, expect, it } from "vitest"
import type { CampCatalogue, CampSpotId, CampStep } from "@/ui/atoms/campScene/campTypes"
import type { CampStepEntry } from "../game/campSteps"
import { campCatalogueMismatches } from "./campCatalogueAgreement"

const cat = (...spots: [CampSpotId, CampStep[]][]): CampCatalogue => ({
  spots: spots.map(([id, steps]) => ({ id, x: 0, y: 0, frame: 1, footprint: 1, steps })),
  fixed: [],
})
const cs = (id: string, chapter: CampStep["chapter"] = "starter", given?: true): CampStep => ({
  chapter,
  pieces: [{ id, dx: 0, dy: 0, width: 1, height: 1 }],
  ...(given && { given }),
})
const te = (id: string, over: Partial<CampStepEntry> = {}): CampStepEntry => ({
  id,
  spot: "fire",
  tier: "starter",
  source: "found",
  ...over,
})

const catalogue = cat(["fire", [cs("pot"), cs("bed", "junior", true)]], ["camel", [cs("camel", "expert")]])
const table = [
  te("pot"),
  te("bed", { tier: "junior", source: "given" }),
  te("camel", { spot: "camel", tier: "expert", source: "bought" }),
]

describe("campCatalogueMismatches", () => {
  it("is empty when catalogue and table agree", () => {
    expect(campCatalogueMismatches(table, catalogue)).toEqual([])
  })

  it("names a catalogue step the table lacks", () => {
    expect(campCatalogueMismatches(table.slice(1), catalogue)).toEqual(['catalogue step "pot" has no table entry'])
  })

  it("names a table step the catalogue lacks", () => {
    expect(campCatalogueMismatches([...table, te("extra")], catalogue)).toEqual([
      'table step "extra" has no catalogue step',
    ])
  })

  it("names a moved spot", () => {
    expect(campCatalogueMismatches([te("pot", { spot: "camel" }), ...table.slice(1)], catalogue)).toEqual([
      'step "pot" is in spot "camel" in the table, "fire" in the catalogue',
    ])
  })

  it("names a different tier", () => {
    expect(campCatalogueMismatches([te("pot", { tier: "wizard" }), ...table.slice(1)], catalogue)).toEqual([
      'step "pot" is wizard in the table, starter in the catalogue',
    ])
  })

  it("names a given disagreement either way", () => {
    expect(campCatalogueMismatches([table[0], te("bed", { tier: "junior" }), table[2]], catalogue)).toEqual([
      'step "bed" disagrees on being given',
    ])
    expect(campCatalogueMismatches([te("pot", { source: "given" }), ...table.slice(1)], catalogue)).toEqual([
      'step "pot" disagrees on being given',
    ])
  })
})
