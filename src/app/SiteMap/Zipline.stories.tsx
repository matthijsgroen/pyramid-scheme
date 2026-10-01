import type { Meta, StoryObj } from "@storybook/react-vite"
import type { CellState } from "@/game/siteTypes"
import { AXES, DROP_AT, addressed, dropGrid } from "./floorFixtures.testing"
import { SiteMapView } from "./SiteMapView"
import "@/mods/registerModApps"

// A zipline is a one-way drop: a launch, 3 obstacle cells, a landing, with `dropEast`
// drawn across the obstacle. These stories stage it on the real `SiteMapView` path, in a bare corridor, so
// the art is judged where it lives. The grid is `dropGrid`, the fixture the specs use (`dropArt.spec.ts`).
//
// Real scale: the map draws at 1 unit to 1 CSS px, so the 196px run (3 cells of 56 + 2 side walls of 14)
// holds a tile drawn 170 x 81 (`DROP_W` x `DROP_H`, 340 x 162 art pixels at 2px to a unit). The tile's
// bottom edge is the corridor floor's bottom edge; the rest of it stands proud above the corridor.

const FRAME = "h-[26rem] w-full"

const stage = (travel: "e" | "w" | "n" | "s", obstacle: CellState) => {
  const axis = AXES.find(a => a.travel === travel)!
  const { grid, at } = dropGrid(axis, "room", "room", obstacle)
  // Both feet of the drop are lit and walked into, whatever the obstacle's own state: the explorer stands
  // at one or the other. The fixture names its own indexes, so neither is counted by hand here.
  const lit = addressed({ ...grid, difficulty: "expert" })
  return { grid: lit, launch: at(DROP_AT.launch), landing: at(DROP_AT.landing) }
}

const meta = {
  title: "Topology/Zipline",
  component: SiteMapView,
  parameters: { layout: "fullscreen" },
  args: { className: FRAME },
} satisfies Meta<typeof SiteMapView>

export default meta
type Story = StoryObj<typeof meta>

const east = stage("e", "visible")
const west = stage("w", "visible")

/** East-going drop, obstacle revealed, explorer at the launch: `dropEast` as painted, for scale. */
export const EastAtLaunch: Story = { args: { grid: east.grid, explorerPos: east.launch } }

/** West-going drop: the same asset, mirrored. */
export const WestAtLaunch: Story = { args: { grid: west.grid, explorerPos: west.launch } }

/** The same drop from its far foot: whichever end the player stands at, the art is the one tile between them. */
export const EastAtLanding: Story = { args: { grid: east.grid, explorerPos: east.landing } }

/** West-going, at the landing. */
export const WestAtLanding: Story = { args: { grid: west.grid, explorerPos: west.landing } }

/** Obstacle revealed with nobody on the map: the art alone against the corridor. */
export const EastRevealed: Story = { args: { grid: east.grid, revealAllCells: true, explorerHidden: true } }

/** Obstacle still fogged: the drop draws nothing until its cells are lit. */
export const EastFogged: Story = { args: { grid: stage("e", "fogged").grid, explorerPos: stage("e", "fogged").launch } }

/** Fogged, west-going. */
export const WestFogged: Story = { args: { grid: stage("w", "fogged").grid, explorerPos: stage("w", "fogged").launch } }

/** NO ART YET: `DROP_ART.n` and `.s` are null, so a vertical drop draws the plain corridor. This story is
 * the unpainted case and must not be read as a design; it is not a rotated `dropEast`. */
export const SouthHasNoArtYet: Story = {
  args: { grid: stage("s", "visible").grid, explorerPos: stage("s", "visible").launch, className: "h-[40rem] w-full" },
}

/** NO ART YET, north-going. */
export const NorthHasNoArtYet: Story = {
  args: { grid: stage("n", "visible").grid, explorerPos: stage("n", "visible").launch, className: "h-[40rem] w-full" },
}
