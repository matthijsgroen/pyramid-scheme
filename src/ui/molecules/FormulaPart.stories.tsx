import type { Meta, StoryObj } from "@storybook/react-vite"
import { FormulaPart } from "./FormulaPart"

const meta = {
  component: FormulaPart,
  parameters: { layout: "centered" },
} satisfies Meta<typeof FormulaPart>

export default meta
type Story = StoryObj<typeof meta>

const resolveTile = (symbolId: string) => ({
  symbol: symbolId === "d1" ? "𓇳" : "𓃥",
  difficulty: "starter" as const,
})

export const Nested: Story = {
  args: {
    formula: {
      left: { left: { symbol: 0 }, right: 2, operation: "*", result: 6 },
      right: { symbol: 1 },
      operation: "-",
      result: 4,
    },
    showResult: true,
    obfuscateResult: false,
    symbolMapping: { 0: "d1", 1: "d2" },
    filledState: { symbolCounts: {}, filledPositions: {} },
    resolveTile,
    positionPrefix: "formula-0",
  },
}
