import type { SiteLayout } from "../../game/siteTypes"

export type NodeState = "fogged" | "revealed-unreachable" | "reachable" | "completed"

export type NavState = {
  nodeStates: Record<string, NodeState>
  currentNodeId: string | null
}

// Returns the direct successors of a node in the layout.
const successors = (layout: SiteLayout, nodeId: string): string[] =>
  layout.edges.filter(e => e.fromNodeId === nodeId).map(e => e.toNodeId)

// Pure computation — no storage, no context.
// completedNodeIds: set of node ids the player has finished.
// currentNodeId: where the player currently is (null = not yet entered).
export const computeNavState = (
  layout: SiteLayout,
  completedNodeIds: string[],
  currentNodeId: string | null
): NavState => {
  const completed = new Set(completedNodeIds)
  const nodeStates: Record<string, NodeState> = {}

  // Reveal grammar: the entrance is always reachable.
  // Completing a node reveals the TYPE (not details) of the next node one step ahead.
  // Beyond that: fogged.

  const revealed = new Set<string>()
  revealed.add(layout.entranceNodeId)

  // Entrance successors are always visible (you can see the corridor ahead)
  for (const next of successors(layout, layout.entranceNodeId)) {
    revealed.add(next)
  }

  // Completing a node reveals its successors + one-step-ahead (silhouettes)
  for (const nodeId of completed) {
    for (const next of successors(layout, nodeId)) {
      revealed.add(next)
      for (const oneMore of successors(layout, next)) {
        revealed.add(oneMore)
      }
    }
  }

  for (const node of layout.nodes) {
    if (completed.has(node.id)) {
      nodeStates[node.id] = "completed"
    } else if (!revealed.has(node.id)) {
      nodeStates[node.id] = "fogged"
    } else {
      // Revealed — check if reachable (no locked gates blocking the path)
      // For Phase 1 (no gates) all revealed nodes are reachable.
      // A gate-blocked node would be "revealed-unreachable" — shows silhouette.
      const incomingEdges = layout.edges.filter(e => e.toNodeId === node.id)
      const allGated = incomingEdges.length > 0 && incomingEdges.every(e => e.gateType)
      nodeStates[node.id] = allGated ? "revealed-unreachable" : "reachable"
    }
  }

  return { nodeStates, currentNodeId }
}
