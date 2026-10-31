import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { revealAll } from "@/game/gridNavigation"
import { EDGE_NODE, PREFAB_FORK, edgePrefabFloor, madeUpPrefab, prefabForkFloor } from "./floorFixtures.testing"
import { PrefabRoomPreview } from "./PrefabRoomPreview"
import { SiteMapView } from "./SiteMapView"
import "@/mods/registerModApps"

// A made-up floor: a fork with arms west, east and south, laid over by a made-up hall — a niche and a jar rack on the
// north wall, two pillars, the actor's place in the north-east corner and the stop south of the east pillar — and a
// fourth arm north to a room behind it. The explorer stands outside the west door, on the stop, in the east room or in
// the room north of the hall; a tap anywhere walks him there, and "Walk west → stop" walks him round the west pillar.

const SPOTS = {
  west: [4, 1],
  stop: PREFAB_FORK,
  east: [4, 12],
  north: [0, 6],
  south: [9, 6],
} as const

type Spot = keyof typeof SPOTS

const PrefabRoom = ({ explorerAt }: { explorerAt: Spot }) => {
  const [grid] = useState(() => revealAll(prefabForkFloor({}, true)))
  const [pos, setPos] = useState<readonly [number, number]>(SPOTS[explorerAt])
  return (
    <div>
      <div className="flex gap-4 p-2 text-sm">
        <button type="button" onClick={() => setPos(SPOTS.west)}>
          To the west door
        </button>
        <button type="button" onClick={() => setPos(SPOTS.stop)}>
          Walk west → stop
        </button>
        <button type="button" onClick={() => setPos(SPOTS.north)}>
          To the north room
        </button>
      </div>
      <SiteMapView grid={grid} explorerPos={pos} onCellClick={(r, c) => setPos([r, c])} className="h-160 w-full" />
    </div>
  )
}

const meta = {
  title: "Topology/Prefab room",
  component: PrefabRoom,
  parameters: { layout: "fullscreen" },
  argTypes: { explorerAt: { control: "inline-radio", options: Object.keys(SPOTS) } },
} satisfies Meta<typeof PrefabRoom>

export default meta
type Story = StoryObj<typeof meta>

export const West: Story = { args: { explorerAt: "west" } }
export const Stop: Story = { args: { explorerAt: "stop" } }
export const East: Story = { args: { explorerAt: "east" } }
export const North: Story = { args: { explorerAt: "north" } }

/** From the west door round the west pillar to the stop. */
export const WalkWestToStop: Story = {
  args: { explorerAt: "west" },
  play: async ({ canvasElement }) => {
    const walk = Array.from(canvasElement.querySelectorAll("button")).find(b => b.textContent?.includes("stop"))
    walk?.click()
  },
}

// Rooms whose node stands next to the ring: the L chamber from its north door to its east room, the T fork between
// its south, west and east exits. Each button walks him there; none of the walks calls at the stop or crosses the
// skeleton lying in the room.
const EDGE_SPOTS = {
  L: { north: [1, 2], east: [3, 8], stop: EDGE_NODE.L },
  T: { west: [3, 0], south: [6, 3], east: [3, 9], stop: EDGE_NODE.T },
} as const

const EdgeRoom = ({ shape, explorerAt }: { shape: keyof typeof EDGE_NODE; explorerAt: string }) => {
  const spots: Record<string, readonly [number, number]> = EDGE_SPOTS[shape]
  const [grid] = useState(() => revealAll(edgePrefabFloor(shape)))
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

// Made-up halls on a floor of their own (PrefabRoomPreview): every door a straight arm reaches is in use, and the
// explorer walks between two of them. Variant 1 of a mirror prefab is its mirror image; the fill picks which of a
// room's optional or grouped places stand.
const DAIS = { cols: 2, rows: 2, tall: 0 }

const HALL = madeUpPrefab(
  `room hall
mirror
layout
# # # # # d # # # # #
# . . . . . . . . . #
# . p . p . p t t . #
d . . . s . . t t . #
# . p . p . p . . . #
# . . . . . . . . . #
# # # # # d # # # # #
p floor pillar
t floor sarcophagus
s stop`,
  { sarcophagus: DAIS }
)

const RUINED_HALL = madeUpPrefab(`room ruinedHall
layout
# # # # d # # # #
# . . . . . . . #
# r q r . r q r #
d . r . . . r . d
# . . s . . . . #
# # # # d # # # #
q floor pillar
r floor? rubblePile 1 of 3 per q
s stop`)

const STEPS_ROOM = madeUpPrefab(
  `room stepsRoom
mirror
layout
# # # # d # # # #
# . . . . . . . #
d . s . . g g . d
# . . . . . . . #
# # # # d # # # #
g ground mat
s stop`,
  { mat: { cols: 2, rows: 1, tall: 0, ground: true } }
)

const STOREROOM = madeUpPrefab(`room storeroom
layout
# # # # # # # # #
d . . . . . . . d
# g . g . g . g #
# . . . s . . . #
# # # # # # # # #
gift = jarRack | basin | basketStack
g floor gift 3 of 4
s stop`)

const preview = (args: React.ComponentProps<typeof PrefabRoomPreview>): StoryObj<typeof PrefabRoomPreview> => ({
  render: props => <PrefabRoomPreview {...props} />,
  argTypes: {
    prefab: { control: false },
    variant: { control: { type: "number", min: 0, max: 3 } },
    fill: { control: { type: "number", min: 0, max: 20 } },
    from: { control: "inline-radio", options: ["n", "s", "e", "w"] },
    to: { control: "inline-radio", options: ["n", "s", "e", "w"] },
  },
  args,
})

/** Two rows of pillars with the aisle between, a 2×2 dais clear of the far wall: from the west door up the aisle. */
export const HallWithDais = preview({ prefab: HALL, from: "w", to: "n" })
/** The same hall mirrored: the dais at the west end, the steps and the walk the other way round. */
export const HallMirrored = preview({ prefab: HALL, variant: 1, from: "e", to: "n" })
/** Stumps on the pillar places, a fallen top lying at one of three places beside each. */
export const RuinedHall = preview({ prefab: RUINED_HALL, from: "w", to: "e" })
export const RuinedHallOtherFill = preview({ prefab: RUINED_HALL, fill: 1, from: "w", to: "e" })
/** Ground steps drawn under the player; the mirror flips them. */
export const GroundSteps = preview({ prefab: STEPS_ROOM, from: "w", to: "e" })
export const GroundStepsMirrored = preview({ prefab: STEPS_ROOM, variant: 1, from: "e", to: "w" })
/** Three of the four gift places hold a gift, different ones per fill. */
export const StoreroomGifts = preview({ prefab: STOREROOM, from: "w", to: "e" })
export const StoreroomGiftsOtherFill = preview({ prefab: STOREROOM, fill: 2, from: "w", to: "e" })
