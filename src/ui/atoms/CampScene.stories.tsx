import type { Decorator, Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { CampScene, type CampSceneProps } from "./CampScene"
import { CAMP_CATALOGUE } from "./campScene/campCatalogue"
import { foundUpTo, fullFound } from "./campScene/campLayout"
import type { CampFound, CampSpot, CampSpotId } from "./campScene/campTypes"

/** Frames the scene in a box of its `width` x `height` args, the size a caller would have measured. */
const sizedBox: Decorator<CampSceneProps> = (Story, { args }) => (
  <div className="flex min-h-screen items-start justify-center bg-neutral-900">
    <div style={{ width: args.width, height: args.height }}>
      <Story />
    </div>
  </div>
)

const PHONE = { width: 390, height: 844 }

const INSETS = { top: 56, bottom: 96 }

const meta = {
  component: CampScene,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [sizedBox],
  argTypes: {
    chapter: {
      options: ["starter", "junior", "expert", "master", "wizard"],
      control: { type: "select" },
    },
    width: { control: { type: "number", min: 0, step: 10 } },
    height: { control: { type: "number", min: 0, step: 10 } },
  },
  args: {
    ...PHONE,
    chapter: "wizard",
    found: fullFound(CAMP_CATALOGUE, "wizard"),
    insets: INSETS,
  },
} satisfies Meta<typeof CampScene>

export default meta
type Story = StoryObj<typeof meta>

type PieceArg = `${CampSpotId}_${string}`
type PlaygroundArgs = CampSceneProps & Partial<Record<CampSpotId, number>> & Partial<Record<PieceArg, boolean>>

/** Bought in a fixed order: one slider for how far along the chain the spot is. */
const isChain = (spot: CampSpot) => spot.steps.every(step => !step.layer)

const pieceArg = (spot: CampSpot, piece: string): PieceArg => `${spot.id}_${piece}`

/** The pieces a player can find: a given step comes with them. */
const piecesOf = (spot: CampSpot) => spot.steps.flatMap(step => (step.given ? [] : step.pieces.map(p => p.id)))

/** A slider per chain spot, a checkbox per piece of a spot found in any order. */
const spotControls = Object.fromEntries(
  CAMP_CATALOGUE.spots.flatMap((spot): [string, object][] =>
    isChain(spot)
      ? [
          [
            spot.id,
            { control: { type: "range", min: 0, max: spot.steps.length, step: 1 }, table: { category: "chains" } },
          ],
        ]
      : piecesOf(spot).map(piece => [
          pieceArg(spot, piece),
          { name: piece, control: { type: "boolean" }, table: { category: spot.id } },
        ])
  )
)

const playgroundArgs = (found: CampFound) =>
  Object.fromEntries(
    CAMP_CATALOGUE.spots.flatMap((spot): [string, number | boolean][] =>
      isChain(spot)
        ? [[spot.id, (found[spot.id] ?? []).length]]
        : piecesOf(spot).map(piece => [pieceArg(spot, piece), (found[spot.id] ?? []).includes(piece)])
    )
  ) as Partial<PlaygroundArgs>

export const Playground: StoryObj<PlaygroundArgs> = {
  argTypes: { ...spotControls, found: { table: { disable: true } } },
  args: { chapter: "expert", ...playgroundArgs(fullFound(CAMP_CATALOGUE, "expert")) },
  render: ({ width, height, chapter, insets, className, entrances, ...rest }) => {
    const counts = Object.fromEntries(
      CAMP_CATALOGUE.spots.filter(isChain).map(spot => [spot.id, Number(rest[spot.id] ?? 0)])
    )
    const found: CampFound = {
      ...foundUpTo(CAMP_CATALOGUE, counts),
      ...Object.fromEntries(
        CAMP_CATALOGUE.spots
          .filter(spot => !isChain(spot))
          .map(spot => [spot.id, piecesOf(spot).filter(piece => rest[pieceArg(spot, piece)] === true)])
      ),
    }
    return (
      <CampScene
        width={width}
        height={height}
        chapter={chapter}
        found={found}
        insets={insets}
        entrances={entrances}
        className={className}
      />
    )
  },
}

export const StarterEmpty: Story = {
  args: { chapter: "starter", found: {} },
}

export const JuniorEmpty: Story = {
  args: { chapter: "junior", found: {} },
}

export const ExpertEmpty: Story = {
  args: { chapter: "expert", found: {} },
}

export const MasterEmpty: Story = {
  args: { chapter: "master", found: {} },
}

export const WizardEmpty: Story = {
  args: { chapter: "wizard", found: {} },
}

export const StarterFull: Story = {
  args: { chapter: "starter", found: fullFound(CAMP_CATALOGUE, "starter") },
}

export const JuniorFull: Story = {
  args: { chapter: "junior", found: fullFound(CAMP_CATALOGUE, "junior") },
}

export const ExpertFull: Story = {
  args: { chapter: "expert", found: fullFound(CAMP_CATALOGUE, "expert") },
}

export const MasterFull: Story = {
  args: { chapter: "master", found: fullFound(CAMP_CATALOGUE, "master") },
}

export const WizardFull: Story = {
  args: { chapter: "wizard", found: fullFound(CAMP_CATALOGUE, "wizard") },
}

export const PartlyBuilt: Story = {
  args: {
    chapter: "expert",
    found: {
      ...fullFound(CAMP_CATALOGUE, "junior"),
      ...foundUpTo(CAMP_CATALOGUE, { fire: 2, sleeping: 4, cooking: 1, camel: 2, mapTable: 1, palmGarden: 1 }),
    },
  },
}

/** Finds out of the painted order: a compass with no table waits in the chest, and the pot waits for the fire. */
export const FoundInAnyOrder: Story = {
  args: {
    chapter: "master",
    found: {
      fire: ["stoneRing", "pot", "seatingStones", "seatCushions"],
      sleeping: ["reedMat", "tent", "tentFlag"],
      water: ["jar", "well"],
      cooking: ["tripod", "feast"],
      mapTable: ["map", "compass", "starMap"],
    },
  },
}

export const Phone: Story = {
  args: { width: 390, height: 844 },
}

export const Tablet: Story = {
  args: { width: 820, height: 1180 },
}

export const DesktopPane: Story = {
  args: { width: 1000, height: 836 },
}

export const Ultrawide: Story = {
  args: { width: 1600, height: 700 },
}

export const WithBadges: Story = {
  args: {
    entrances: {
      chest: { label: "Collection", badge: 3, onOpen: fn() },
      window: { label: "Mosaic 61/252", onOpen: fn() },
      mapTable: { label: "Journeys", onOpen: fn() },
    },
  },
}
