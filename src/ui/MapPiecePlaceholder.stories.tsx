import type { Meta, StoryObj } from "@storybook/react-vite"
import { MapPiecePlaceholder } from "./MapPiecePlaceholder"

const meta = {
  title: "UI/MapPiecePlaceholder",
  component: MapPiecePlaceholder,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    piecesFound: {
      control: { type: "range", min: 0, max: 5, step: 1 },
    },
    piecesNeeded: {
      control: { type: "range", min: 1, max: 5, step: 1 },
    },
    showAnimation: {
      control: "boolean",
    },
    index: {
      control: { type: "range", min: 0, max: 10, step: 1 },
    },
  },
} satisfies Meta<typeof MapPiecePlaceholder>

export default meta
type Story = StoryObj<typeof meta>

export const NoProgress: Story = {
  args: {
    piecesFound: 0,
    piecesNeeded: 3,
    showAnimation: false,
    name: "Merchants hideout",
    index: 0,
  },
}

export const PartialProgress: Story = {
  args: {
    piecesFound: 1,
    piecesNeeded: 3,
    showAnimation: false,
    name: "Merchants hideout",
    index: 0,
  },
}

export const AlmostComplete: Story = {
  args: {
    piecesFound: 2,
    piecesNeeded: 3,
    showAnimation: false,
    name: "Merchants hideout",
    index: 0,
  },
}

export const FourPieces: Story = {
  args: {
    piecesFound: 1,
    piecesNeeded: 4,
    showAnimation: false,
    name: "Merchants hideout",
    index: 0,
  },
}

export const WithAnimation: Story = {
  args: {
    piecesFound: 1,
    piecesNeeded: 3,
    showAnimation: true,
    name: "Merchants hideout",
    index: 1,
  },
}
