import { describe, expect, it } from "vitest"
import { validateJourney, validateSite } from "./siteValidator"
import type { SiteEdge, SiteLayout, SiteNode } from "./siteTypes"

// ─── Layout builders ────────────────────────────────────────────────────────

const node = (partial: Partial<SiteNode> & { id: string; type: SiteNode["type"] }): SiteNode => ({
  floor: 0,
  gridX: 0,
  ...partial,
})

const edge = (id: string, fromNodeId: string, toNodeId: string, extra?: Partial<SiteEdge>): SiteEdge => ({
  id,
  fromNodeId,
  toNodeId,
  ...extra,
})

const linearLayout = (siteId = "site-1"): SiteLayout => ({
  siteId,
  nodes: [
    node({ id: "entrance", type: "puzzle", gridX: 0 }),
    node({ id: "puzzle-1", type: "puzzle", gridX: 1 }),
    node({ id: "treasure-mosaic", type: "treasure", gridX: 2, reward: { type: "mosaicPiece" } }),
    node({ id: "exit", type: "exit", gridX: 3 }),
  ],
  edges: [
    edge("e0", "entrance", "puzzle-1"),
    edge("e1", "puzzle-1", "treasure-mosaic"),
    edge("e2", "treasure-mosaic", "exit"),
  ],
  entranceNodeId: "entrance",
  exitNodeId: "exit",
  criticalPath: ["entrance", "puzzle-1", "treasure-mosaic", "exit"],
})

// ─── validateSite ────────────────────────────────────────────────────────────

describe(validateSite, () => {
  it("passes a valid linear layout", () => {
    expect(validateSite(linearLayout())).toEqual({ valid: true })
  })

  it("completable: fails when critical path is blocked by a seal with no key", () => {
    const layout: SiteLayout = {
      siteId: "site-1",
      nodes: [node({ id: "entrance", type: "puzzle", gridX: 0 }), node({ id: "exit", type: "exit", gridX: 1 })],
      edges: [edge("e0", "entrance", "exit", { gateType: "seal", requiredKeyId: "key-chest" })],
      entranceNodeId: "entrance",
      exitNodeId: "exit",
      criticalPath: ["entrance", "exit"],
    }
    const result = validateSite(layout)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reasons.some(r => r.type === "criticalPathBlocked")).toBe(true)
    }
  })

  it("keyBeforeGate: fails when key node is behind the gate it unlocks", () => {
    // entrance → [seal gate needing key-chest] → key-chest → exit
    // key is unreachable without traversing the gate it opens
    const layout: SiteLayout = {
      siteId: "site-1",
      nodes: [
        node({ id: "entrance", type: "puzzle", gridX: 0 }),
        node({ id: "key-chest", type: "treasure", gridX: 1, reward: { type: "hieroglyphs" } }),
        node({ id: "exit", type: "exit", gridX: 2 }),
      ],
      edges: [
        edge("e0", "entrance", "key-chest", { gateType: "seal", requiredKeyId: "key-chest" }),
        edge("e1", "key-chest", "exit"),
      ],
      entranceNodeId: "entrance",
      exitNodeId: "exit",
      criticalPath: ["entrance", "key-chest", "exit"],
    }
    const result = validateSite(layout)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reasons.some(r => r.type === "keyAfterGate")).toBe(true)
    }
  })

  it("keyBeforeGate: passes when key is reachable on a branch before the gate", () => {
    // entrance → key-branch (no gate)
    //          ↘ [seal] → gated-room → exit
    const layout: SiteLayout = {
      siteId: "site-1",
      nodes: [
        node({ id: "entrance", type: "fork", gridX: 0 }),
        node({ id: "key-branch", type: "treasure", gridX: 0, floor: 1, reward: { type: "hieroglyphs" } }),
        node({ id: "gated-room", type: "puzzle", gridX: 1 }),
        node({ id: "exit", type: "exit", gridX: 2 }),
      ],
      edges: [
        edge("e0", "entrance", "key-branch"),
        edge("e1", "entrance", "gated-room", { gateType: "seal", requiredKeyId: "key-branch" }),
        edge("e2", "gated-room", "exit"),
      ],
      entranceNodeId: "entrance",
      exitNodeId: "exit",
      criticalPath: ["entrance", "gated-room", "exit"],
    }
    expect(validateSite(layout)).toEqual({ valid: true })
  })

  it("noAllBlandFork: fails when a fork leads only to puzzle nodes", () => {
    const layout: SiteLayout = {
      siteId: "site-1",
      nodes: [
        node({ id: "entrance", type: "puzzle", gridX: 0 }),
        node({ id: "fork", type: "fork", gridX: 1 }),
        node({ id: "branch-a", type: "puzzle", gridX: 2 }),
        node({ id: "branch-b", type: "puzzle", gridX: 2, floor: 1 }),
        node({ id: "exit", type: "exit", gridX: 3 }),
      ],
      edges: [
        edge("e0", "entrance", "fork"),
        edge("e1", "fork", "branch-a"),
        edge("e2", "fork", "branch-b"),
        edge("e3", "branch-a", "exit"),
      ],
      entranceNodeId: "entrance",
      exitNodeId: "exit",
      criticalPath: ["entrance", "fork", "branch-a", "exit"],
    }
    const result = validateSite(layout)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reasons.some(r => r.type === "allBlandFork")).toBe(true)
    }
  })

  it("noAllBlandFork: passes when a fork has at least one treasure branch", () => {
    const layout: SiteLayout = {
      siteId: "site-1",
      nodes: [
        node({ id: "entrance", type: "puzzle", gridX: 0 }),
        node({ id: "fork", type: "fork", gridX: 1 }),
        node({ id: "branch-puzzle", type: "puzzle", gridX: 2 }),
        node({ id: "branch-treasure", type: "treasure", gridX: 2, floor: 1, reward: { type: "hieroglyphs" } }),
        node({ id: "exit", type: "exit", gridX: 3 }),
      ],
      edges: [
        edge("e0", "entrance", "fork"),
        edge("e1", "fork", "branch-puzzle"),
        edge("e2", "fork", "branch-treasure"),
        edge("e3", "branch-puzzle", "exit"),
      ],
      entranceNodeId: "entrance",
      exitNodeId: "exit",
      criticalPath: ["entrance", "fork", "branch-puzzle", "exit"],
    }
    expect(validateSite(layout)).toEqual({ valid: true })
  })
})

// ─── validateJourney ─────────────────────────────────────────────────────────

describe(validateJourney, () => {
  const layoutWithMapPiece = (siteId: string): SiteLayout => ({
    siteId,
    nodes: [
      node({ id: `${siteId}-entrance`, type: "puzzle", gridX: 0 }),
      node({
        id: `${siteId}-map`,
        type: "treasure",
        gridX: 1,
        reward: { type: "mapPiece" },
      }),
      node({ id: `${siteId}-mosaic`, type: "treasure", gridX: 2, reward: { type: "mosaicPiece" } }),
      node({ id: `${siteId}-exit`, type: "exit", gridX: 3 }),
    ],
    edges: [
      edge(`${siteId}-e0`, `${siteId}-entrance`, `${siteId}-map`),
      edge(`${siteId}-e1`, `${siteId}-map`, `${siteId}-mosaic`),
      edge(`${siteId}-e2`, `${siteId}-mosaic`, `${siteId}-exit`),
    ],
    entranceNodeId: `${siteId}-entrance`,
    exitNodeId: `${siteId}-exit`,
    criticalPath: [`${siteId}-entrance`, `${siteId}-map`, `${siteId}-mosaic`, `${siteId}-exit`],
  })

  const layoutWithoutMapPiece = (siteId: string): SiteLayout => {
    const l = linearLayout(siteId)
    return {
      ...l,
      nodes: l.nodes.map(n => ({
        ...n,
        id: n.id.startsWith("entrance")
          ? `${siteId}-entrance`
          : n.id.startsWith("exit")
            ? `${siteId}-exit`
            : `${siteId}-${n.id}`,
      })),
      entranceNodeId: `${siteId}-entrance`,
      exitNodeId: `${siteId}-exit`,
    }
  }

  it("passes when exactly one site has a map piece and all have mosaic", () => {
    const layouts = [layoutWithMapPiece("site-1"), layoutWithoutMapPiece("site-2")]
    expect(validateJourney(layouts)).toEqual({ valid: true })
  })

  it("mapPieceMissing: fails when no site has a map piece", () => {
    const layouts = [layoutWithoutMapPiece("site-1"), layoutWithoutMapPiece("site-2")]
    const result = validateJourney(layouts)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reasons.some(r => r.type === "mapPieceMissing")).toBe(true)
    }
  })

  it("mapPieceDuplicate: fails when two sites have a map piece", () => {
    const layouts = [layoutWithMapPiece("site-1"), layoutWithMapPiece("site-2")]
    const result = validateJourney(layouts)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reasons.some(r => r.type === "mapPieceDuplicate")).toBe(true)
    }
  })

  it("mapPieceNotSealReachable: fails when map piece is behind a ward", () => {
    const layout: SiteLayout = {
      siteId: "site-1",
      nodes: [
        node({ id: "entrance", type: "puzzle", gridX: 0 }),
        node({ id: "map", type: "treasure", gridX: 1, reward: { type: "mapPiece" } }),
        node({ id: "mosaic", type: "treasure", gridX: 0, floor: 1, reward: { type: "mosaicPiece" } }),
        node({ id: "exit", type: "exit", gridX: 2 }),
      ],
      edges: [
        edge("e0", "entrance", "map", { gateType: "ward", requiredKeyId: "tomb-key" }),
        edge("e1", "entrance", "mosaic"),
        edge("e2", "mosaic", "exit"),
      ],
      entranceNodeId: "entrance",
      exitNodeId: "exit",
      criticalPath: ["entrance", "mosaic", "exit"],
    }
    const result = validateJourney([layout])
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reasons.some(r => r.type === "mapPieceNotSealReachable")).toBe(true)
    }
  })

  it("mosaicMissing: fails when a site has no mosaic node", () => {
    const noMosaic: SiteLayout = {
      siteId: "site-1",
      nodes: [
        node({ id: "entrance", type: "puzzle", gridX: 0 }),
        node({ id: "map", type: "treasure", gridX: 1, reward: { type: "mapPiece" } }),
        node({ id: "exit", type: "exit", gridX: 2 }),
      ],
      edges: [edge("e0", "entrance", "map"), edge("e1", "map", "exit")],
      entranceNodeId: "entrance",
      exitNodeId: "exit",
      criticalPath: ["entrance", "map", "exit"],
    }
    const result = validateJourney([noMosaic])
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reasons.some(r => r.type === "mosaicMissing")).toBe(true)
    }
  })

  it("mosaicDuplicate: fails when a site has two mosaic nodes", () => {
    const twoMosaics: SiteLayout = {
      siteId: "site-1",
      nodes: [
        node({ id: "entrance", type: "puzzle", gridX: 0 }),
        node({ id: "map", type: "treasure", gridX: 1, reward: { type: "mapPiece" } }),
        node({ id: "mosaic-1", type: "treasure", gridX: 2, reward: { type: "mosaicPiece" } }),
        node({ id: "mosaic-2", type: "treasure", gridX: 3, reward: { type: "mosaicPiece" } }),
        node({ id: "exit", type: "exit", gridX: 4 }),
      ],
      edges: [
        edge("e0", "entrance", "map"),
        edge("e1", "map", "mosaic-1"),
        edge("e2", "mosaic-1", "mosaic-2"),
        edge("e3", "mosaic-2", "exit"),
      ],
      entranceNodeId: "entrance",
      exitNodeId: "exit",
      criticalPath: ["entrance", "map", "mosaic-1", "mosaic-2", "exit"],
    }
    const result = validateJourney([twoMosaics])
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reasons.some(r => r.type === "mosaicDuplicate")).toBe(true)
    }
  })
})
