import type { Meta, StoryObj } from "@storybook/react-vite"
import { AXES, DROP_AT, addressed, dropGrid } from "./floorFixtures.testing"
import { SiteMapView } from "./SiteMapView"
import "@/mods/registerModApps"

// A zipline is a one-way drop: a launch, 3 obstacle cells, a landing, with `dropEast`,
// `dropNorth` or `dropSouth` drawn across the obstacle. These stories stage it on the real `SiteMapView` path, in a bare corridor, so
// the art is judged where it lives. The grid is `dropGrid`, the fixture the specs use (`dropArt.spec.ts`).
//
// Real scale: the map draws at 1 unit to 1 CSS px, so the 196px run (3 cells of 56 + 2 side walls of 14)
// holds a tile drawn 170 x 81 (`DROP_W` x `DROP_H`, 340 x 162 art pixels at 2px to a unit). The tile's
// bottom edge is the corridor floor's bottom edge; the rest of it stands proud above the corridor.
//
// A vertical run is 224 units down the page. `dropNorth` (56 x 74.5) and `dropSouth` (56 x 67) are drawn at
// the same scale, centred on it and never stretched, so the plain corridor shows at both ends of them.

const FRAME = "h-[26rem] w-full"

// Every story stands the player at one foot of a lit drop, because that is the only way a drop is ever
// seen: a fogged one draws nothing (`dropArt.spec.ts` freezes that) and the map is never drawn with
// nobody on it. The fixture names its own indexes, so neither foot is counted by hand here.
const stage = (travel: "e" | "w" | "n" | "s") => {
  const axis = AXES.find(a => a.travel === travel)!
  const { grid, at } = dropGrid(axis, "room", "room", "visible")
  return {
    grid: addressed({ ...grid, difficulty: "expert" }),
    launch: at(DROP_AT.launch),
    landing: at(DROP_AT.landing),
  }
}

const meta = {
  title: "Topology/Zipline",
  component: SiteMapView,
  parameters: { layout: "fullscreen" },
  args: { className: FRAME },
} satisfies Meta<typeof SiteMapView>

export default meta
type Story = StoryObj<typeof meta>

const east = stage("e")
const west = stage("w")
const south = stage("s")
const north = stage("n")

/** A vertical drop needs a taller frame than an east-west one to show both its feet. */
const TALL = "h-[40rem] w-full"

/** East-going drop, obstacle revealed, explorer at the launch: `dropEast` as painted, for scale. */
export const EastAtLaunch: Story = { args: { grid: east.grid, explorerPos: east.launch } }

/** West-going drop: the same asset, mirrored. */
export const WestAtLaunch: Story = { args: { grid: west.grid, explorerPos: west.launch } }

/** The same drop from its far foot: whichever end the player stands at, the art is the one tile between them. */
export const EastAtLanding: Story = { args: { grid: east.grid, explorerPos: east.landing } }

/** West-going, at the landing. */
export const WestAtLanding: Story = { args: { grid: west.grid, explorerPos: west.landing } }

/** South-going drop: `dropSouth`, its own render (not a flip), steps at the far lip, line coming toward the viewer. */
export const SouthAtLaunch: Story = {
  args: { grid: south.grid, explorerPos: south.launch, className: TALL },
}

/** North-going drop: `dropNorth`, its own render, steps near the viewer, line running up and away. */
export const NorthAtLaunch: Story = {
  args: { grid: north.grid, explorerPos: north.launch, className: TALL },
}

/** South-going, from the landing foot. */
export const SouthAtLanding: Story = {
  args: { grid: south.grid, explorerPos: south.landing, className: TALL },
}

/** North-going, from the landing foot. */
export const NorthAtLanding: Story = {
  args: { grid: north.grid, explorerPos: north.landing, className: TALL },
}
