import type { Meta, StoryObj } from "@storybook/react-vite"
import { Formula } from "./Formula"

const meta = {
  component: Formula,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Formula>

export default meta
type Story = StoryObj<typeof meta>

const resolveTile = (symbolId: string) => ({
  symbol: symbolId === "d1" ? "𓇳" : "𓃥",
  difficulty: "starter" as const,
})

export const Unfilled: Story = {
  args: {
    formula: { left: { symbol: 0 }, right: 3, operation: "+", result: 7 },
    showResult: true,
    symbolMapping: { 0: "d1" },
    filledState: { symbolCounts: {}, filledPositions: {} },
    resolveTile,
    formulaIndex: 0,
  },
}

export const Filled: Story = {
  args: {
    formula: { left: { symbol: 0 }, right: 3, operation: "+", result: 7 },
    showResult: true,
    symbolMapping: { 0: "d1" },
    filledState: { symbolCounts: { d1: 1 }, filledPositions: { "formula-0-left": 1 } },
    resolveTile,
    formulaIndex: 0,
  },
}
