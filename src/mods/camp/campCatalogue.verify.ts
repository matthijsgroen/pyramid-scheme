import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { CAMP_CATALOGUE } from "@/ui/atoms/campScene/campCatalogue"
import { CAMP_STEPS, campStepProblems } from "./game/campSteps"
import { campCatalogueMismatches } from "./app/campCatalogueAgreement"

describe("the camp's step table", () => {
  it("is sound", () => {
    expect(campStepProblems(CAMP_STEPS)).toEqual([])
  })

  it("agrees with the ui catalogue on every step's spot, tier and given-ness", () => {
    expect(campCatalogueMismatches(CAMP_STEPS, CAMP_CATALOGUE)).toEqual([])
  })

  it("has an arrival string in every language for each purchase's arrival", () => {
    const arrivals = CAMP_STEPS.flatMap(step => (step.arrival === undefined ? [] : [step.arrival]))
    for (const language of ["en", "nl"]) {
      const strings = JSON.parse(readFileSync(`public/locales/${language}/camp.json`, "utf8")) as {
        arrivals: Record<string, string>
      }
      expect(arrivals.filter(arrival => !strings.arrivals[arrival])).toEqual([])
    }
  })
})
