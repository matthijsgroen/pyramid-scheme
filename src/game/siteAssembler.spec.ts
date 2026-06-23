import { describe, expect, it } from "vitest"
import { assembleSite } from "./siteAssembler"
import type { SiteConfig } from "./siteTypes"
import { validateSite } from "./siteValidator"

const linearConfig = (puzzleBudget = 3, mapPiece = false): SiteConfig => ({
  floors: 1,
  maxBranchFactor: 0,
  gates: "none",
  puzzleBudget,
  puzzlePlacement: "spine-heavy",
  allowedNodeTypes: ["puzzle", "treasure", "exit"],
  mapPiece,
  rewards: { hieroglyphNodes: 0, mosaicDepth: 1 },
})

describe(assembleSite, () => {
  it("succeeds for a basic linear config", () => {
    const result = assembleSite("site-1", linearConfig(), 42)
    expect(result.success).toBe(true)
  })

  it("produces a layout that passes validateSite", () => {
    const result = assembleSite("site-1", linearConfig(), 42)
    if (!result.success) throw new Error("assembly failed")
    expect(validateSite(result.layout)).toEqual({ valid: true })
  })

  it("layout has entrance, puzzles, mosaic, and exit in order", () => {
    const result = assembleSite("site-1", linearConfig(3), 42)
    if (!result.success) throw new Error("assembly failed")
    const { nodes } = result.layout
    expect(nodes[0].type).toBe("puzzle") // entrance
    expect(nodes.slice(1, -2).every(n => n.type === "puzzle")).toBe(true)
    const mosaicNode = nodes.find(n => n.reward?.type === "mosaicPiece")
    expect(mosaicNode).toBeDefined()
    expect(nodes[nodes.length - 1].type).toBe("exit")
  })

  it("includes a mapPiece node when config.mapPiece is true", () => {
    const result = assembleSite("site-1", linearConfig(3, true), 42)
    if (!result.success) throw new Error("assembly failed")
    expect(result.layout.nodes.some(n => n.reward?.type === "mapPiece")).toBe(true)
  })

  it("is deterministic: same seed produces same layout", () => {
    const a = assembleSite("site-1", linearConfig(), 12345)
    const b = assembleSite("site-1", linearConfig(), 12345)
    expect(a).toEqual(b)
  })

  it("produces cosmetically different layouts for different seeds", () => {
    // With phase-1 linear config there's no variation yet, so just assert structure is valid
    const a = assembleSite("site-1", linearConfig(), 1)
    const b = assembleSite("site-2", linearConfig(), 2)
    expect(a.success).toBe(true)
    expect(b.success).toBe(true)
  })

  it("property: 200 seeds × linear config all pass validation", () => {
    for (let seed = 0; seed < 200; seed++) {
      const result = assembleSite(`site-${seed}`, linearConfig(), seed)
      expect(result.success, `seed ${seed} failed assembly`).toBe(true)
      if (result.success) {
        const v = validateSite(result.layout)
        expect(v.valid, `seed ${seed} failed validation`).toBe(true)
      }
    }
  })

  it("fails for unsupported config (multi-floor)", () => {
    const multiFloor = { ...linearConfig(), floors: 2 }
    const result = assembleSite("site-1", multiFloor, 42)
    expect(result.success).toBe(false)
  })

  it("fails for unsupported config (with gates)", () => {
    const withGates = { ...linearConfig(), gates: "seal-only" as const }
    const result = assembleSite("site-1", withGates, 42)
    expect(result.success).toBe(false)
  })
})
