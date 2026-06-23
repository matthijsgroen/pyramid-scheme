import type { SiteLayout, SiteNode, ValidationReason, ValidationResult } from "./siteTypes"

// BFS from startId, traversing only edges that pass the gate check.
// excludeEdgeId lets the caller hypothetically remove one edge (for keyBeforeGate).
const reachableFrom = (
  layout: SiteLayout,
  startId: string,
  availableKeys: { tombKeys: Record<string, number>; sealKeys: string[] } = { tombKeys: {}, sealKeys: [] },
  excludeEdgeId?: string
): Set<string> => {
  const visited = new Set<string>([startId])
  const queue = [startId]

  while (queue.length > 0) {
    const current = queue.shift()!
    for (const edge of layout.edges) {
      if (edge.fromNodeId !== current) continue
      if (edge.id === excludeEdgeId) continue
      if (visited.has(edge.toNodeId)) continue

      if (edge.gateType === "seal" && edge.requiredKeyId && !availableKeys.sealKeys.includes(edge.requiredKeyId)) {
        continue
      }
      if (edge.gateType === "ward" && edge.requiredKeyId && (availableKeys.tombKeys[edge.requiredKeyId] ?? 0) <= 0) {
        continue
      }

      visited.add(edge.toNodeId)
      queue.push(edge.toNodeId)
    }
  }

  return visited
}

// Find the treasure node that grants a given seal key (by searching onComplete / reward conventions).
// A seal key treasure node is a treasure node whose id matches the requiredKeyId convention:
// requiredKeyId === node.id (the node IS the key).
const findKeyNode = (layout: SiteLayout, keyId: string): SiteNode | undefined =>
  layout.nodes.find(n => n.type === "treasure" && n.id === keyId)

// Per-site invariant checks.
export const validateSite = (layout: SiteLayout): ValidationResult => {
  const reasons: ValidationReason[] = []

  // completable: for each seal gate on the critical path, the key must be reachable without
  // traversing that gate (player can collect keys on free branches first).
  for (let i = 0; i < layout.criticalPath.length - 1; i++) {
    const fromId = layout.criticalPath[i]
    const toId = layout.criticalPath[i + 1]
    const gateEdge = layout.edges.find(
      e => e.fromNodeId === fromId && e.toNodeId === toId && e.gateType === "seal" && e.requiredKeyId
    )
    if (!gateEdge?.requiredKeyId) continue
    const reachableWithoutGate = reachableFrom(
      layout,
      layout.entranceNodeId,
      { tombKeys: {}, sealKeys: [] },
      gateEdge.id
    )
    if (!reachableWithoutGate.has(gateEdge.requiredKeyId)) {
      reasons.push({ type: "criticalPathBlocked", nodeId: toId, missingKeyId: gateEdge.requiredKeyId })
    }
  }

  // keyBeforeGate: for every seal gate edge, the key node must be reachable WITHOUT traversing that edge.
  for (const edge of layout.edges) {
    if (edge.gateType !== "seal" || !edge.requiredKeyId) continue
    const keyNode = findKeyNode(layout, edge.requiredKeyId)
    if (!keyNode) continue

    const reachableWithoutGate = reachableFrom(layout, layout.entranceNodeId, { tombKeys: {}, sealKeys: [] }, edge.id)
    if (!reachableWithoutGate.has(keyNode.id)) {
      reasons.push({ type: "keyAfterGate", gateEdgeId: edge.id, keyNodeId: keyNode.id })
    }
  }

  // noAllBlandFork: every fork node must have ≥1 branch end that is treasure, gate, or stairhead.
  const interestingTypes = new Set(["treasure", "gate", "stairhead"])
  for (const node of layout.nodes) {
    if (node.type !== "fork") continue
    const branchEdges = layout.edges.filter(e => e.fromNodeId === node.id)
    const hasBranchWithInterest = branchEdges.some(edge => {
      const target = layout.nodes.find(n => n.id === edge.toNodeId)
      return target && interestingTypes.has(target.type)
    })
    if (!hasBranchWithInterest) {
      reasons.push({ type: "allBlandFork", forkNodeId: node.id })
    }
  }

  // mosaicReachable: if a mosaic node exists, it must be reachable (possibly behind wards — ok).
  // We check reachability with all keys hypothetically available (wards are always eventually openable).
  const mosaicNode = layout.nodes.find(n => n.type === "treasure" && n.reward?.type === "mosaicPiece")
  if (mosaicNode) {
    // Reachable with no keys = also reachable with ward keys (wards only gate optional branches).
    // If not reachable even with no non-ward gates, something is wrong with the graph structure.
    const allReachable = reachableFrom(layout, layout.entranceNodeId, {
      tombKeys: Object.fromEntries(
        layout.edges.filter(e => e.gateType === "ward" && e.requiredKeyId).map(e => [e.requiredKeyId!, 1])
      ),
      sealKeys: layout.edges.filter(e => e.gateType === "seal" && e.requiredKeyId).map(e => e.requiredKeyId!),
    })
    if (!allReachable.has(mosaicNode.id)) {
      reasons.push({ type: "mosaicMissing" })
    }
  }

  return reasons.length === 0 ? { valid: true } : { valid: false, reasons }
}

// Journey-level checks across all site layouts.
export const validateJourney = (layouts: SiteLayout[]): ValidationResult => {
  const reasons: ValidationReason[] = []

  // mapPieceCoverage: exactly one layout must have a mapPiece treasure node,
  // and that node must be seal-reachable (not behind a ward).
  const mapPieceSites = layouts.filter(l => l.nodes.some(n => n.type === "treasure" && n.reward?.type === "mapPiece"))

  if (mapPieceSites.length === 0) {
    reasons.push({ type: "mapPieceMissing" })
  } else if (mapPieceSites.length > 1) {
    reasons.push({ type: "mapPieceDuplicate", siteIds: mapPieceSites.map(l => l.siteId) })
  } else {
    const site = mapPieceSites[0]
    const mapPieceNode = site.nodes.find(n => n.type === "treasure" && n.reward?.type === "mapPiece")!
    // Must be reachable WITHOUT any ward keys (seal-reachable only).
    const sealReachable = reachableFrom(site, site.entranceNodeId, {
      tombKeys: {},
      sealKeys: site.edges.filter(e => e.gateType === "seal" && e.requiredKeyId).map(e => e.requiredKeyId!),
    })
    if (!sealReachable.has(mapPieceNode.id)) {
      reasons.push({ type: "mapPieceNotSealReachable", nodeId: mapPieceNode.id })
    }
  }

  // mosaicCoverage: every layout must have exactly one mosaicPiece treasure node.
  for (const layout of layouts) {
    const mosaicNodes = layout.nodes.filter(n => n.type === "treasure" && n.reward?.type === "mosaicPiece")
    if (mosaicNodes.length === 0) {
      reasons.push({ type: "mosaicMissing" })
    } else if (mosaicNodes.length > 1) {
      reasons.push({ type: "mosaicDuplicate", siteId: layout.siteId })
    }
  }

  return reasons.length === 0 ? { valid: true } : { valid: false, reasons }
}
