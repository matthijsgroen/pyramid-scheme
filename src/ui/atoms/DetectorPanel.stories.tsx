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

const COMPASS_HITS = [
  { journeyId: "starter_1", levelIdx: 0, floorIdx: 0, hieroglyphId: "p10", pieceIndex: 0, cell: { row: 3, col: 4 } },
  { journeyId: "starter_1", levelIdx: 0, floorIdx: 0, hieroglyphId: "p10", pieceIndex: 1, cell: { row: 5, col: 2 } },
  { journeyId: "starter_2", levelIdx: 1, floorIdx: 2, hieroglyphId: "p10", pieceIndex: 2, cell: { row: 1, col: 6 } },
]

const CONSUMABLE_HITS = [
  { journeyId: "starter_1", edgeId: "0:3,4", floorIdx: 0, cell: { row: 3, col: 4 } },
  { journeyId: "starter_1", edgeId: "0:5,1", floorIdx: 0, cell: { row: 5, col: 1 } },
  { journeyId: "junior_1", edgeId: "1:2,5", floorIdx: 1, cell: { row: 2, col: 5 } },
]

// L1 collapses every hit to its pyramid (one line per journey).
export const CompassLevel1: Story = {
  args: { compassLevel: 1, activeDetector: "compass", compassTarget: "p10", compassResults: COMPASS_HITS },
}

// L3 shows each exact cell (no collapsing).
export const CompassLevel3: Story = {
  args: { compassLevel: 3, activeDetector: "compass", compassTarget: "p10", compassResults: COMPASS_HITS },
}

export const ConsumableLevel1: Story = {
  args: { consumableDetectorLevel: 1, activeDetector: "consumable", consumableResults: CONSUMABLE_HITS },
}

export const ConsumableLevel3: Story = {
  args: { consumableDetectorLevel: 3, activeDetector: "consumable", consumableResults: CONSUMABLE_HITS },
}

export const AllModes: Story = {
  args: {
    compassLevel: 2,
    consumableDetectorLevel: 2,
    detectionLevel: 2,
    activeDetector: "hiddenPassageway",
  },
}

// Corridor detector widens outward (§7.2): L2 adds a floor indicator, L3 the pyramid-wide count.
export const CorridorLevel2: Story = {
  args: { detectionLevel: 2, activeDetector: "hiddenPassageway", floorHasHiddenCorridor: true },
}

export const CorridorLevel3: Story = {
  args: {
    detectionLevel: 3,
    activeDetector: "hiddenPassageway",
    floorHasHiddenCorridor: true,
    pyramidHiddenCorridorCount: 3,
  },
}
