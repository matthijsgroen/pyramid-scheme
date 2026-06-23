import { mulberry32 } from "./random"
import type { AssemblerResult, SiteConfig, SiteEdge, SiteLayout, SiteNode } from "./siteTypes"
import { validateSite } from "./siteValidator"

// Phase 1 scope: floors:1, maxBranchFactor:0, gates:"none".
// Linear spine only — one entrance, one exit, puzzle nodes in between.

const makeId = (prefix: string, index: number) => `${prefix}-${index}`

const buildLinearLayout = (siteId: string, config: SiteConfig, random: () => number): SiteLayout => {
  const puzzleCount = Math.max(1, config.puzzleBudget)
  // ponytail: deterministic variation — just use puzzleBudget directly for now
  void random // consume one call for future variation seam

  const nodes: SiteNode[] = []
  const edges: SiteEdge[] = []

  // entrance node (index 0)
  nodes.push({ id: makeId(siteId, 0), type: "puzzle", floor: 0, gridX: 0 })

  // puzzle nodes
  for (let i = 1; i <= puzzleCount; i++) {
    nodes.push({ id: makeId(siteId, i), type: "puzzle", floor: 0, gridX: i, family: "sumplete" })
  }

  // mosaic treasure node
  const mosaicIdx = puzzleCount + 1
  nodes.push({
    id: makeId(siteId, mosaicIdx),
    type: "treasure",
    floor: 0,
    gridX: mosaicIdx,
    reward: { type: "mosaicPiece" },
  })

  // exit node
  const exitIdx = mosaicIdx + 1
  nodes.push({ id: makeId(siteId, exitIdx), type: "exit", floor: 0, gridX: exitIdx })

  // optional map piece: inject before mosaic if config.mapPiece
  if (config.mapPiece) {
    const mapIdx = mosaicIdx - 1
    // insert after last puzzle, before mosaic
    nodes.splice(mosaicIdx, 0, {
      id: makeId(siteId, mosaicIdx) + "-map",
      type: "treasure",
      floor: 0,
      gridX: mapIdx,
      reward: { type: "mapPiece" },
    })
  }

  // build linear edges in node order
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({ id: `${siteId}-e${i}`, fromNodeId: nodes[i].id, toNodeId: nodes[i + 1].id })
  }

  const criticalPath = nodes.map(n => n.id)

  return {
    siteId,
    nodes,
    edges,
    entranceNodeId: nodes[0].id,
    exitNodeId: nodes[nodes.length - 1].id,
    criticalPath,
  }
}

export const assembleSite = (siteId: string, config: SiteConfig, seed: number): AssemblerResult => {
  // Phase 1: only support linear (floors:1, maxBranchFactor:0, gates:"none")
  if (config.floors !== 1 || config.maxBranchFactor !== 0 || config.gates !== "none") {
    return {
      success: false,
      reasons: [{ type: "criticalPathBlocked", nodeId: "unsupported-config", missingKeyId: "phase1-only" }],
    }
  }

  const random = mulberry32(seed)
  const layout = buildLinearLayout(siteId, config, random)
  const validation = validateSite(layout)

  if (!validation.valid) {
    return { success: false, reasons: validation.reasons }
  }

  return { success: true, layout }
}
