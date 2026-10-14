import { encounterFromMeta } from "./siteAssembler"
import { describe, expect, it } from "vitest"

describe(encounterFromMeta, () => {
  const meta = { id: "sumplete", ownerMod: "puzzle", tags: ["puzzle"], icon: "?", color: "gray", rewardPriority: 60 }

  it("carries the resolved family's id, tags and owning mod", () => {
    expect(encounterFromMeta(meta, "puzzle")).toEqual({ familyId: "sumplete", tags: ["puzzle"], ownerMod: "puzzle" })
  })

  it("sets reEnterable only when the meta claims it", () => {
    expect(encounterFromMeta({ ...meta, reEnterable: true }, "puzzle")).toEqual({
      familyId: "sumplete",
      tags: ["puzzle"],
      ownerMod: "puzzle",
      reEnterable: true,
    })
  })

  it("falls back to the query id/tag with no tags and no owning mod when no family matched", () => {
    expect(encounterFromMeta(undefined, "puzzle")).toEqual({ familyId: "puzzle", tags: [] })
  })

  it("joins an array fallback so an AND-query still resolves to one id", () => {
    expect(encounterFromMeta(undefined, ["sky", "light"])).toEqual({ familyId: "sky+light", tags: [] })
  })
})
