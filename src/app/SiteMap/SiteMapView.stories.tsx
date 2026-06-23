import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import type { SiteLayout } from "../../game/siteTypes"
import { SiteMapView } from "./SiteMapView"

const meta = {
  title: "App/SiteMap/SiteMapView",
  component: SiteMapView,
  parameters: { layout: "centered" },
} satisfies Meta<typeof SiteMapView>

export default meta
type Story = StoryObj<typeof meta>

const linear3: SiteLayout = {
  siteId: "story-1",
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

export const AllFogged: Story = {
  args: {
    layout: linear3,
    completedNodeIds: [],
    currentNodeId: null,
  },
}

export const EntranceCompleted: Story = {
  args: {
    layout: linear3,
    completedNodeIds: ["n0"],
    currentNodeId: "n0",
  },
}

export const MidProgress: Story = {
  args: {
    layout: linear3,
    completedNodeIds: ["n0", "n1"],
    currentNodeId: "n1",
  },
}

export const AllCompleted: Story = {
  args: {
    layout: linear3,
    completedNodeIds: ["n0", "n1", "n2", "n3"],
    currentNodeId: "n3",
  },
}

const forkLayout: SiteLayout = {
  siteId: "story-fork",
  nodes: [
    { id: "entrance", type: "puzzle", floor: 0, gridX: 1 },
    { id: "fork", type: "fork", floor: 0, gridX: 2 },
    { id: "branch-puzzle", type: "puzzle", floor: 1, gridX: 3 },
    { id: "branch-treasure", type: "treasure", floor: 0, gridX: 3, reward: { type: "hieroglyphs" } },
    { id: "main-puzzle", type: "puzzle", floor: 0, gridX: 4 },
    { id: "mosaic", type: "treasure", floor: 0, gridX: 5, reward: { type: "mosaicPiece" } },
    { id: "exit", type: "exit", floor: 0, gridX: 6 },
  ],
  edges: [
    { id: "e0", fromNodeId: "entrance", toNodeId: "fork" },
    { id: "e1", fromNodeId: "fork", toNodeId: "branch-puzzle" },
    { id: "e2", fromNodeId: "fork", toNodeId: "branch-treasure" },
    { id: "e3", fromNodeId: "fork", toNodeId: "main-puzzle", gateType: "seal", requiredKeyId: "branch-treasure" },
    { id: "e4", fromNodeId: "main-puzzle", toNodeId: "mosaic" },
    { id: "e5", fromNodeId: "mosaic", toNodeId: "exit" },
  ],
  entranceNodeId: "entrance",
  exitNodeId: "exit",
  criticalPath: ["entrance", "fork", "main-puzzle", "mosaic", "exit"],
}

export const ForkWithWard: Story = {
  args: {
    layout: forkLayout,
    completedNodeIds: ["entrance"],
    currentNodeId: "entrance",
  },
}

// Multi-floor layout with forks, a seal gate, a ward gate, a stairhead, and treasures.
//
// Floor 0: entrance(0) ──► fork1(1) ──[seal]──────────────► puzzle-c(4) ──► mosaic(5) ──► exit(6)
//                              └──► key-chest(2)                 ↑
//                              └──► stairhead(3) ──────────────► ┘ (also reachable from below)
// Floor 1:                          stairhead(3) ──► fork2(3) ──► puzzle-b(4) ──► tomb-key(5)
//                                                        └──► puzzle-a(2)
//                                   ward-room(5) ◄──[ward]── puzzle-c(4) (optional loot)
const complexLayout: SiteLayout = {
  siteId: "story-complex",
  nodes: [
    { id: "entrance", type: "puzzle", floor: 0, gridX: 0 },
    { id: "fork1", type: "fork", floor: 0, gridX: 1 },
    { id: "key-chest", type: "treasure", floor: 0, gridX: 2, reward: { type: "hieroglyphs" } },
    { id: "stairhead", type: "stairhead", floor: 0, gridX: 3 },
    { id: "puzzle-a", type: "puzzle", floor: 1, gridX: 2, family: "sumplete" },
    { id: "fork2", type: "fork", floor: 1, gridX: 3 },
    { id: "puzzle-b", type: "puzzle", floor: 1, gridX: 4 },
    { id: "tomb-key", type: "treasure", floor: 1, gridX: 5, reward: { type: "tombKey", keyId: "key-ward" } },
    { id: "puzzle-c", type: "puzzle", floor: 0, gridX: 4 },
    { id: "ward-room", type: "treasure", floor: 0, gridX: 5, reward: { type: "hieroglyphs" } },
    { id: "mosaic", type: "treasure", floor: 0, gridX: 5, reward: { type: "mosaicPiece" } },
    { id: "exit", type: "exit", floor: 0, gridX: 6 },
  ],
  edges: [
    { id: "e0", fromNodeId: "entrance", toNodeId: "fork1" },
    { id: "e1", fromNodeId: "fork1", toNodeId: "key-chest" },
    { id: "e2", fromNodeId: "fork1", toNodeId: "stairhead" },
    { id: "e3", fromNodeId: "fork1", toNodeId: "puzzle-c", gateType: "seal", requiredKeyId: "key-chest" },
    { id: "e4", fromNodeId: "stairhead", toNodeId: "fork2" },
    { id: "e5", fromNodeId: "fork2", toNodeId: "puzzle-a" },
    { id: "e6", fromNodeId: "fork2", toNodeId: "puzzle-b" },
    { id: "e7", fromNodeId: "puzzle-b", toNodeId: "tomb-key" },
    { id: "e8", fromNodeId: "fork2", toNodeId: "puzzle-c" },
    { id: "e9", fromNodeId: "puzzle-c", toNodeId: "ward-room", gateType: "ward", requiredKeyId: "key-ward" },
    { id: "e10", fromNodeId: "puzzle-c", toNodeId: "mosaic" },
    { id: "e11", fromNodeId: "mosaic", toNodeId: "exit" },
  ],
  entranceNodeId: "entrance",
  exitNodeId: "exit",
  criticalPath: ["entrance", "fork1", "puzzle-c", "mosaic", "exit"],
}

export const ComplexDungeon: Story = {
  args: {
    layout: complexLayout,
    completedNodeIds: [],
    currentNodeId: null,
  },
}

export const ComplexDungeonMidProgress: Story = {
  args: {
    layout: complexLayout,
    completedNodeIds: ["entrance", "fork1", "key-chest", "stairhead", "puzzle-a", "fork2"],
    currentNodeId: "fork2",
  },
}

export const Interactive: Story = {
  args: { layout: linear3 },
  render: () => {
    const [completed, setCompleted] = useState<string[]>([])

    const [current, setCurrent] = useState<string | null>(null)
    return (
      <div>
        <SiteMapView
          layout={linear3}
          completedNodeIds={completed}
          currentNodeId={current}
          onNodeClick={id => {
            setCurrent(id)
            setCompleted(prev => (prev.includes(id) ? prev : [...prev, id]))
          }}
        />
        <p className="mt-2 text-sm text-gray-500">Click reachable nodes to complete them</p>
      </div>
    )
  },
}
