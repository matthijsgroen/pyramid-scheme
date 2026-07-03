import type { Meta, StoryObj } from "@storybook/react-vite"
import { DetectorPanel } from "./DetectorPanel"

const meta = {
  title: "UI/DetectorPanel",
  component: DetectorPanel,
  tags: ["autodocs"],
  args: {
    activeDetector: null,
    compassLevel: 0,
    consumableDetectorLevel: 0,
    detectionLevel: 0,
    compassTarget: null,
    compassResults: [],
    consumableResults: [],
    onSetDetector: () => {},
    onSetCompassTarget: () => {},
    availableHieroglyphs: [
      { id: "p10", label: "Owl" },
      { id: "p8", label: "Vulture" },
    ],
  },
} satisfies Meta<typeof DetectorPanel>

export default meta
type Story = StoryObj<typeof meta>

export const NoPerks: Story = {}

export const CompassOnly: Story = {
  args: { compassLevel: 1 },
}

export const CompassActive: Story = {
  args: {
    compassLevel: 1,
    activeDetector: "compass",
    compassTarget: "p10",
    compassResults: [
      { journeyId: "starter_1", levelIdx: 0, floorIdx: 0, hieroglyphId: "p10", pieceIndex: 0 },
      { journeyId: "starter_2", levelIdx: 1, floorIdx: 2, hieroglyphId: "p10", pieceIndex: 1 },
    ],
  },
}

export const ConsumableActive: Story = {
  args: {
    consumableDetectorLevel: 1,
    activeDetector: "consumable",
    consumableResults: [
      { journeyId: "starter_1", edgeId: "0:3,4" },
      { journeyId: "junior_1", edgeId: "1:2,5" },
    ],
  },
}

export const AllModes: Story = {
  args: {
    compassLevel: 2,
    consumableDetectorLevel: 2,
    detectionLevel: 2,
    activeDetector: "hiddenPassageway",
  },
}
