import type { Meta, StoryObj } from "@storybook/react-vite"
import { SudokuPad } from "./SudokuPad"
import { skinFor } from "./skins"

const meta = {
  title: "Puzzle/SudokuPad",
  component: SudokuPad,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dungeon", values: [{ name: "dungeon", value: "#110d08" }] },
  },
  args: {
    size: 6,
    skin: skinFor(undefined, undefined),
    pencil: false,
    exhausted: new Set<number>(),
    disabled: false,
    onValue: () => {},
    onErase: () => {},
    onTogglePencil: () => {},
  },
} satisfies Meta<typeof SudokuPad>

export default meta
type Story = StoryObj<typeof meta>

export const Values: Story = {}

/** Pencil on: the keys turn sky, which is the mode showing itself where it acts. */
export const Pencil: Story = { args: { pencil: true } }

/** Values with every square of their own already spoken for are dimmed, never removed — the pad must
 *  not reshuffle under a finger mid-solve. */
export const SomeSpent: Story = { args: { exhausted: new Set([2, 5]) } }

/** Nothing is picked on the board, so a value has nowhere to go yet. */
export const NothingPicked: Story = { args: { disabled: true } }

/** The scribe's register types in signs: the pad wears the same face the board does. */
export const Papyrus: Story = { args: { skin: skinFor("scribe", undefined) } }

export const PapyrusPencil: Story = { args: { skin: skinFor("scribe", undefined), pencil: true } }
