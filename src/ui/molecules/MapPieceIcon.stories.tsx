import type { Meta, StoryObj } from "@storybook/react-vite"
import { MapPieceIcon } from "./MapPieceIcon"

const meta = {
  component: MapPieceIcon,
  parameters: {
    layout: "centered",
    backgrounds: {
      default: "dark",
      values: [
        { name: "dark", value: "#1f2937" },
        { name: "light", value: "#f3f4f6" },
      ],
    },
  },
  argTypes: {
    size: { control: "select", options: ["md", "lg"] },
  },
} satisfies Meta<typeof MapPieceIcon>

export default meta
type Story = StoryObj<typeof meta>

export const FirstPiece: Story = {
  args: { progress: { found: 1, required: 4 } },
}

export const NearlyThere: Story = {
  args: { progress: { found: 3, required: 4 } },
}

export const Complete: Story = {
  args: { progress: { found: 4, required: 4 } },
}

// The tomb thresholds in the world data: 2, 3 or 4 pieces (src/data/journeys.ts).
export const EveryThreshold: Story = {
  args: { progress: { found: 1, required: 4 } },
  render: () => (
    <div className="flex items-center gap-6">
      {[
        [1, 2],
        [1, 3],
        [2, 3],
        [1, 4],
        [2, 4],
        [3, 4],
      ].map(([found, required]) => (
        <div key={`${found}/${required}`} className="flex flex-col items-center gap-2">
          <MapPieceIcon progress={{ found, required }} />
          <span className="text-xs text-gray-400">
            {found} of {required}
          </span>
        </div>
      ))}
    </div>
  ),
}

export const Small: Story = {
  args: { progress: { found: 1, required: 3 }, size: "md" },
}
