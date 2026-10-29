import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { revealAll } from "@/game/gridNavigation"
import { EDGE_NODE, GROWN_FORK, edgeGrownFloor, grownForkFloor } from "./floorFixtures.testing"
import { SiteMapView } from "./SiteMapView"
import "@/mods/registerModApps"

// A made-up floor: a fork with arms west, east and south, grown round a 2×1 stand-in basin, and a fourth arm north to a
// room behind it. The explorer stands outside the west door, on the stop, in the east room or in the room behind the
// piece; a tap anywhere walks him there, and "Walk west → east" walks him through the room from one door to the other.

const SPOTS = {
  west: [2, 1],
  stop: GROWN_FORK,
  east: [2, 7],
  north: [0, 4],
} as const

type Spot = keyof typeof SPOTS

const GrownRoom = ({ explorerAt }: { explorerAt: Spot }) => {
  const [grid] = useState(() => revealAll(grownForkFloor({}, true)))
  const [pos, setPos] = useState<readonly [number, number]>(SPOTS[explorerAt])
  return (
    <div>
      <div className="flex gap-4 p-2 text-sm">
        <button type="button" onClick={() => setPos(SPOTS.west)}>
          To the west door
        </button>
        <button type="button" onClick={() => setPos(SPOTS.east)}>
          Walk west → east
        </button>
      </div>
      <SiteMapView grid={grid} explorerPos={pos} onCellClick={(r, c) => setPos([r, c])} className="h-160 w-full" />
    </div>
  )
}

const meta = {
  title: "Topology/Grown room",
  component: GrownRoom,
  parameters: { layout: "fullscreen" },
  argTypes: { explorerAt: { control: "inline-radio", options: Object.keys(SPOTS) } },
} satisfies Meta<typeof GrownRoom>

export default meta
type Story = StoryObj<typeof meta>

export const West: Story = { args: { explorerAt: "west" } }
export const Stop: Story = { args: { explorerAt: "stop" } }
export const East: Story = { args: { explorerAt: "east" } }
export const North: Story = { args: { explorerAt: "north" } }

/** From the west door through the room to the east one. */
export const WalkWestToEast: Story = {
  args: { explorerAt: "west" },
  play: async ({ canvasElement }) => {
    const walk = Array.from(canvasElement.querySelectorAll("button")).find(b => b.textContent?.includes("east"))
    walk?.click()
  },
}

// Rooms whose node stands on the rect's edge: the L chamber from its north door to its east room, the T fork between
// its south, west and east exits. Each button walks him there; none of the walks calls at the stop or crosses the piece.
const EDGE_SPOTS = {
  L: { north: [0, 2], east: [1, 6], stop: EDGE_NODE.L },
  T: { west: [3, 0], south: [5, 2], east: [3, 6], stop: EDGE_NODE.T },
} as const

const EdgeRoom = ({ shape, explorerAt }: { shape: keyof typeof EDGE_NODE; explorerAt: string }) => {
  const spots: Record<string, readonly [number, number]> = EDGE_SPOTS[shape]
  const [grid] = useState(() => revealAll(edgeGrownFloor(shape)))
  const [pos, setPos] = useState<readonly [number, number]>(spots[explorerAt])
  return (
    <div>
      <div className="flex gap-4 p-2 text-sm">
        {Object.keys(spots).map(spot => (
          <button key={spot} type="button" onClick={() => setPos(spots[spot])}>
            To {spot}
          </button>
        ))}
      </div>
      <SiteMapView grid={grid} explorerPos={pos} onCellClick={(r, c) => setPos([r, c])} className="h-160 w-full" />
    </div>
  )
}

export const LChamber: StoryObj<typeof EdgeRoom> = {
  render: args => <EdgeRoom {...args} />,
  args: { shape: "L", explorerAt: "north" },
}
export const TFork: StoryObj<typeof EdgeRoom> = {
  render: args => <EdgeRoom {...args} />,
  args: { shape: "T", explorerAt: "south" },
}
