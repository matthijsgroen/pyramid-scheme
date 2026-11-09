import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState, type FC } from "react"
import { difficulties } from "@/data/difficultyLevels"
import type { Direction, FloorGrid, GridCell, Tileset } from "@/game/siteTypes"
import { SiteMapView } from "./SiteMapView"

// A back wall rises above its own gap, so where a passage runs right behind a chamber the chamber's north
// wall stands in front of it. Walk behind that wall and the whole run fades out of the way; walk back into
// the chamber and it comes back. The button walks the explorer between the two, so the fade is seen as it
// happens on the map, not only at either end. A doorway in that wall carries its arch in the full height
// of the wall, and a chest standing in the passage stands behind the wall.

const TILESETS: Tileset[] = [...difficulties, "cave", "sphinx"]

const BEHIND = [1, 4] as const
const IN_FRONT = [3, 3] as const

/** A passage along row 1, right behind the north wall of a chamber standing at (3, 3), joined to it round
 * the west side and through a doorway in that wall, with a chest standing in it at (1, 2). */
const behindAWall = (tier: Tileset): FloorGrid => {
  const rank = tier === "cave" || tier === "sphinx" ? "starter" : tier
  const cells: GridCell[][] = Array.from({ length: 6 }, () =>
    Array.from({ length: 7 }, (): GridCell => ({ type: "empty" }))
  )
  const corridor = (r: number, c: number, dirs: Direction[]) => {
    cells[r][c] = { type: "corridor", dirs: new Set(dirs), state: "reachable" }
  }
  corridor(1, 1, ["e", "s"])
  cells[1][2] = {
    type: "room",
    roomType: "encounter",
    family: "tableau",
    tags: ["treasure"],
    dirs: new Set<Direction>(["e", "w"]),
    state: "reachable",
    difficulty: rank,
    reward: { type: "money", amount: 10 },
  }
  corridor(1, 3, ["e", "w", "s"])
  corridor(2, 3, ["n", "s"])
  corridor(1, 4, ["w"])
  corridor(2, 1, ["n", "s"])
  corridor(3, 1, ["n", "e"])
  corridor(3, 2, ["w", "e"])
  cells[3][3] = {
    type: "room",
    roomType: "fork",
    dirs: new Set<Direction>(["w", "n"]),
    state: "reachable",
    difficulty: rank,
    decoration: "statue",
    wallDecoration: "stela",
  }
  return {
    siteId: `behind-a-wall-${tier}`,
    difficulty: rank,
    ...(tier === "cave" || tier === "sphinx" ? { tileset: tier } : {}),
    rows: 6,
    cols: 7,
    cells,
    entrancePos: [3, 3],
    exitPos: [1, 4],
    staircases: {},
  }
}

const BehindAWall: FC<{ tier: Tileset; startBehind: boolean }> = ({ tier, startBehind }) => {
  const [behind, setBehind] = useState(startBehind)
  return (
    <div className="flex h-screen flex-col bg-neutral-900">
      <button
        type="button"
        className="m-2 self-start rounded bg-neutral-700 px-3 py-1 text-sm text-white"
        onClick={() => setBehind(b => !b)}
      >
        {behind ? "walk into the chamber" : "walk behind its wall"}
      </button>
      <SiteMapView
        grid={behindAWall(tier)}
        explorerPos={behind ? BEHIND : IN_FRONT}
        revealAllCells
        className="min-h-0 flex-1"
      />
    </div>
  )
}

const meta = {
  component: BehindAWall,
  parameters: { layout: "fullscreen" },
  argTypes: { tier: { control: "select", options: TILESETS } },
  args: { tier: "junior", startBehind: true },
} satisfies Meta<typeof BehindAWall>

export default meta
type Story = StoryObj<typeof meta>

export const Behind: Story = { name: "behind a wall" }
export const InFront: Story = { name: "in front of it", args: { startBehind: false } }
