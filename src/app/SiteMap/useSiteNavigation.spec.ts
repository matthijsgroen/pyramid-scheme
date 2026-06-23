import { describe, expect, it } from "vitest"
import { computeNavState } from "./useSiteNavigation"
import type { SiteLayout } from "../../game/siteTypes"

const linearLayout: SiteLayout = {
  siteId: "site-1",
  nodes: [
    { id: "n0", type: "puzzle", floor: 0, gridX: 0 },
    { id: "n1", type: "puzzle", floor: 0, gridX: 1, family: "sumplete" },
    { id: "n2", type: "treasure", floor: 0, gridX: 2, reward: { type: "mosaicPiece" } },
    { id: "n3", type: "exit", floor: 0, gridX: 3 },
  ],
  edges: [
    { id: "e0", fromNodeId: "n0", toNodeId: "n1" },
    { id: "e1", fromNodeId: "n1", toNodeId: "n2" },
    { id: "e2", fromNodeId: "n2", toNodeId: "n3" },
  ],
  entranceNodeId: "n0",
  exitNodeId: "n3",
  criticalPath: ["n0", "n1", "n2", "n3"],
}

describe(computeNavState, () => {
  it("entrance is reachable with no completions", () => {
    const { nodeStates } = computeNavState(linearLayout, [], null)
    expect(nodeStates["n0"]).toBe("reachable")
  })

  it("nodes beyond entrance+1 are fogged initially", () => {
    const { nodeStates } = computeNavState(linearLayout, [], null)
    // n1 is one step ahead — revealed
    expect(nodeStates["n1"]).toBe("reachable")
    // n2 is two steps ahead — fogged
    expect(nodeStates["n2"]).toBe("fogged")
    expect(nodeStates["n3"]).toBe("fogged")
  })

  it("completing entrance reveals n1 and n2", () => {
    const { nodeStates } = computeNavState(linearLayout, ["n0"], "n0")
    expect(nodeStates["n0"]).toBe("completed")
    expect(nodeStates["n1"]).toBe("reachable")
    expect(nodeStates["n2"]).toBe("reachable")
    expect(nodeStates["n3"]).toBe("fogged")
  })

  it("completing n0 and n1 reveals n2 and n3", () => {
    const { nodeStates } = computeNavState(linearLayout, ["n0", "n1"], "n1")
    expect(nodeStates["n1"]).toBe("completed")
    expect(nodeStates["n2"]).toBe("reachable")
    expect(nodeStates["n3"]).toBe("reachable")
  })

  it("completed nodes are marked completed", () => {
    const { nodeStates } = computeNavState(linearLayout, ["n0", "n1", "n2", "n3"], "n3")
    expect(nodeStates["n0"]).toBe("completed")
    expect(nodeStates["n1"]).toBe("completed")
    expect(nodeStates["n2"]).toBe("completed")
    expect(nodeStates["n3"]).toBe("completed")
  })

  it("gate-blocked node is revealed-unreachable", () => {
    const layoutWithGate: SiteLayout = {
      ...linearLayout,
      edges: [
        { id: "e0", fromNodeId: "n0", toNodeId: "n1" },
        { id: "e1", fromNodeId: "n1", toNodeId: "n2", gateType: "seal", requiredKeyId: "key-x" },
        { id: "e2", fromNodeId: "n2", toNodeId: "n3" },
      ],
    }
    const { nodeStates } = computeNavState(layoutWithGate, ["n0", "n1"], "n1")
    // n2 has only one incoming edge and it's gated → revealed-unreachable
    expect(nodeStates["n2"]).toBe("revealed-unreachable")
  })
})
