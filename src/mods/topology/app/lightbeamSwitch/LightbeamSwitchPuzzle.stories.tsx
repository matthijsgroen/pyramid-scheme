import type { Meta, StoryObj } from "@storybook/react-vite"
import type { Direction as WayOut, RoomCell } from "@/game/siteTypes"
import type { Difficulty } from "@/data/difficultyLevels"
import type { ForkShape } from "@/game/forkShape"
import type { MirrorAngle } from "@/mods/core/game/beam/physics"
import { generateLightbeamSwitch, type LightbeamSwitchBoard } from "../../game/lightbeamSwitch/generateLightbeamSwitch"
import { quarterTurnsToFace, rotateBoard } from "../../game/lightbeamSwitch/rotateBoard"
import { routesTo } from "../../game/shrineBeam/shrineBeam"
import { LightbeamSwitchPuzzle } from "./LightbeamSwitchPuzzle"

/** A fork's ways out as the assembler reports them: shut ones carry the id they were shut with. */
const fork = (ways: readonly WayOut[]): RoomCell["exits"] =>
  ways.map(dir => ({ dir, kind: "side" as const, gateKeyId: `switch:story#0#0#0:${dir}` }))

const facing = (shape: ForkShape, ways: readonly WayOut[], seed = 1, difficulty: Difficulty = "junior") =>
  rotateBoard(generateLightbeamSwitch(seed, difficulty, shape), quarterTurnsToFace(shape, ways) ?? 0)

/** The mirrors a player who routed the light to `way` would have left the board at — the only honest
 * way to hand `openWayOut` and `savedAngles` to a story together, since several arrangements can light
 * the same shrine and a mismatched pair would just restage the bug this pair exists to show fixed. */
const angledFor = (board: LightbeamSwitchBoard, way: WayOut): MirrorAngle[] => {
  const shrine = board.shrines.findIndex(candidate => candidate.canonicalDir === way)
  const routes = routesTo(
    board.grid,
    board.shrines.map(spot => spot.at),
    shrine
  )
  const angles = [...board.grid.initial]
  for (const { at, angle } of routes[0]) {
    const mirror = board.grid.mirrors.findIndex(candidate => candidate.row === at.row && candidate.col === at.col)
    angles[mirror] = angle
  }
  return angles
}

const meta = {
  title: "LightbeamSwitch/LightbeamSwitchPuzzle",
  component: LightbeamSwitchPuzzle,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dungeon", values: [{ name: "dungeon", value: "#110d08" }] },
  },
  args: { onSolved: () => {}, onRoute: () => {}, onAngles: () => {} },
} satisfies Meta<typeof LightbeamSwitchPuzzle>

export default meta
type Story = StoryObj<typeof meta>

/** Two ways out at right angles — the junction nearly every carve offers. */
export const TwoWaysAtRightAngles: Story = {
  args: { board: facing("adjacent", ["e", "s"]), exits: fork(["e", "s"]) },
}

/** Two ways out facing each other: a corridor the switch decides the direction of. */
export const TwoWaysFacing: Story = {
  args: { board: facing("opposite", ["e", "w"]), exits: fork(["e", "w"]) },
}

/** Three ways out, with the way the switch was last left open already standing so — and the mirrors at
 * exactly the arrangement that opened it, the way a real save now remembers them. */
export const ThreeWaysOneStandingOpen: Story = {
  args: (() => {
    const board = facing("three", ["n", "e", "w"])
    return { board, exits: fork(["n", "e", "w"]), openWayOut: "e", savedAngles: angledFor(board, "e") }
  })(),
}

/** The widest board, where a cell is at its smallest and the tap targets reach furthest past it. */
export const Wizard: Story = {
  args: { board: facing("three", ["n", "e", "w"], 3, "wizard"), exits: fork(["n", "e", "w"]) },
}
