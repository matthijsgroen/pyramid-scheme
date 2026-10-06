import { describe, expect, it } from "vitest"
import { resolveEncounterMeta } from "@/mods/allFamilyMeta"
import type { Control } from "../obstacles"
import { TOPOLOGY_OFF } from "@/game/testSupport/modOff"
import { realisationsMissing } from "./realisations"

const sequence = (encounter?: string): Control => ({
  id: "plates",
  control: "sequence",
  steps: [{ in: "a" }, { in: "b" }],
  resetAt: "grate",
  opens: { done: ["grate"] },
  ...(encounter === undefined ? {} : { encounter }),
})

describe("a sequence's realisation is asked of the build like any other control's", () => {
  it("is missing when the realisation its lock was bound to is one no registered mod provides", () => {
    expect(realisationsMissing({ controls: [sequence("nowhere")] }, resolveEncounterMeta)).toEqual([
      { type: "realisationMissing", mechanic: "plates", kind: "sequence", realisation: "nowhere" },
    ])
  })

  it("is answered when a registered mod provides the realisation it was bound to", () => {
    expect(realisationsMissing({ controls: [sequence("pressure-plate")] }, resolveEncounterMeta)).toEqual([])
  })

  it("asks nothing of a sequence authored longhand, which names no realisation", () => {
    expect(realisationsMissing({ controls: [sequence()] }, resolveEncounterMeta)).toEqual([])
  })
})

describe("the pressure plate that realises a sequence", () => {
  it("is refused by name once the mod that provides it is off, never stood in by another family", () => {
    expect(realisationsMissing({ controls: [sequence("pressure-plate")] }, TOPOLOGY_OFF.resolveEncounter)).toEqual([
      { type: "realisationMissing", mechanic: "plates", kind: "sequence", realisation: "pressure-plate" },
    ])
  })
})
