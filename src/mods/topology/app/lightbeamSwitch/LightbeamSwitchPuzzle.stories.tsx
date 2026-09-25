import type { Meta, StoryObj } from "@storybook/react-vite"
import type { Direction as WayOut, RoomCell } from "@/game/siteTypes"
import type { Difficulty } from "@/data/difficultyLevels"
import type { ForkShape } from "@/game/forkShape"
import { generateLightbeamSwitch } from "../../game/lightbeamSwitch/generateLightbeamSwitch"
import { quarterTurnsToFace, rotateBoard } from "../../game/lightbeamSwitch/rotateBoard"
import { LightbeamSwitchPuzzle } from "./LightbeamSwitchPuzzle"

/** A fork's ways out as the assembler reports them: shut ones carry the id they were shut with. */
const fork = (ways: readonly WayOut[]): RoomCell["exits"] =>
  ways.map(dir => ({ dir, kind: "side" as const, gateKeyId: `switch:story#0#0#0:${dir}` }))

const facing = (shape: ForkShape, ways: readonly WayOut[], seed = 1, difficulty: Difficulty = "junior") =>
  rotateBoard(generateLightbeamSwitch(seed, difficulty, shape), quarterTurnsToFace(shape, ways) ?? 0)

const meta = {
  title: "LightbeamSwitch/LightbeamSwitchPuzzle",
  component: LightbeamSwitchPuzzle,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dungeon", values: [{ name: "dungeon", value: "#110d08" }] },
  },
  args: { onSolved: () => {}, onCancel: () => {}, onRoute: () => {} },
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

/** Three ways out, with the way the switch was last left open already standing so. */
export const ThreeWaysOneStandingOpen: Story = {
  args: { board: facing("three", ["n", "e", "w"]), exits: fork(["n", "e", "w"]), openWayOut: "e" },
}

/** The widest board, where a cell is at its smallest and the tap targets reach furthest past it. */
export const Wizard: Story = {
  args: { board: facing("three", ["n", "e", "w"], 3, "wizard"), exits: fork(["n", "e", "w"]) },
}
