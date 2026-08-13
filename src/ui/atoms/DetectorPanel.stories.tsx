import type { Meta, StoryObj } from "@storybook/react-vite"
import type { CompassHit } from "@/game/siteTypes"
import { DetectorPanel } from "./DetectorPanel"

const meta = {
  component: DetectorPanel,
  args: {
    labels: {
      pickTarget: "Pick a hieroglyph to hunt in your Collection",
      lookingFor: symbol => `Looking for ${symbol}`,
      allCollected: "All pieces collected",
      access: {
        open: "Nothing known blocking this one",
        locked: "Locked — you don't hold the key for this one yet",
        hidden: "In a hidden corridor — needs the passageway detector",
        unknown: "Might not be reachable yet — it's inside a tomb or for sale",
      },
      more: count => `+${count} more`,
      noSkippedChests: "No skipped chests",
      corridorNearby: "A hidden corridor is close by",
      corridorNoneNearby: "No hidden corridor close by",
      corridorOnFloor: "A hidden corridor waits on this floor",
      corridorNoneOnFloor: "No hidden corridor on this floor",
      corridorOtherFloor: "A hidden corridor waits on another floor",
      corridorNoneInPyramid: "No hidden corridors found so far in this pyramid",
    },
    activeDetector: null,
    compassLevel: 0,
    consumableDetectorLevel: 0,
    detectionLevel: 0,
    compassTarget: null,
    compassResults: [],
    consumableResults: [],
    journeyName: (id: string) => ({ starter_1: "Sphinx Dawn", starter_2: "Papyrus Route" })[id] ?? id,
    compassTargetLabel: () => "𓎗",
  },
} satisfies Meta<typeof DetectorPanel>

export default meta
type Story = StoryObj<typeof meta>

// Readout only — the mode buttons live in DetectorToggles, so with no mode active this renders
// nothing at all rather than an empty card.
export const NoModeActive: Story = {}

// Compass active but no target picked yet — the HUD points the player at the Collection picker (§3C).
export const CompassNoTarget: Story = {
  args: { compassLevel: 1, activeDetector: "compass", compassTarget: null },
}

// One hit of each access verdict, so the stories show the full marker vocabulary (§7.2): reachable
// (no badge), key-locked, and not-determinable.
const COMPASS_HITS: CompassHit[] = [
  {
    journeyId: "starter_1",
    levelIdx: 0,
    floorIdx: 0,
    hieroglyphId: "p10",
    pieceIndex: 0,
    cell: { row: 3, col: 4 },
    access: "open",
  },
  {
    journeyId: "starter_1",
    levelIdx: 0,
    floorIdx: 0,
    hieroglyphId: "p10",
    pieceIndex: 1,
    cell: { row: 5, col: 2 },
    access: "locked",
    missingKeys: ["junior_a_1"],
  },
  {
    journeyId: "starter_2",
    levelIdx: 1,
    floorIdx: 2,
    hieroglyphId: "p10",
    pieceIndex: 2,
    cell: { row: 1, col: 6 },
    access: "unknown",
    inShop: true,
  },
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
    corridorNearby: true,
    floorHasHiddenCorridor: true,
    hiddenCorridorOnOtherFloor: true,
  },
}

// The point of the rework: every unlocked scope answers, so an empty floor is stated rather than
// leaving the panel looking broken.
export const CorridorLevel3NothingFound: Story = {
  args: {
    detectionLevel: 3,
    activeDetector: "hiddenPassageway",
    corridorNearby: false,
    floorHasHiddenCorridor: false,
    hiddenCorridorOnOtherFloor: false,
  },
}
