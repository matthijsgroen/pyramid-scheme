import type { Decorator, Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { CampScene, type CampSceneProps } from "./CampScene"
import { CAMP_CATALOGUE } from "./campScene/campCatalogue"
import { fullSteps } from "./campScene/campLayout"
import type { CampSpotId } from "./campScene/campTypes"

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
    steps: fullSteps(CAMP_CATALOGUE, "wizard"),
    insets: INSETS,
  },
} satisfies Meta<typeof CampScene>

export default meta
type Story = StoryObj<typeof meta>

type PlaygroundArgs = CampSceneProps & Partial<Record<CampSpotId, number>>

/** One number control per spot, bounded by how many steps the catalogue gives it. */
const spotControls = Object.fromEntries(
  CAMP_CATALOGUE.spots.map(spot => [
    spot.id,
    { control: { type: "range", min: 0, max: spot.steps.length, step: 1 }, table: { category: "steps" } },
  ])
)

export const Playground: StoryObj<PlaygroundArgs> = {
  argTypes: { ...spotControls, steps: { table: { disable: true } } },
  args: { chapter: "expert", ...fullSteps(CAMP_CATALOGUE, "expert") },
  render: ({ width, height, chapter, insets, className, entrances, ...rest }) => {
    const steps = Object.fromEntries(CAMP_CATALOGUE.spots.map(spot => [spot.id, rest[spot.id] ?? 0]))
    return (
      <CampScene
        width={width}
        height={height}
        chapter={chapter}
        steps={steps}
        insets={insets}
        entrances={entrances}
        className={className}
      />
    )
  },
}

export const StarterEmpty: Story = {
  args: { chapter: "starter", steps: {} },
}

export const JuniorEmpty: Story = {
  args: { chapter: "junior", steps: {} },
}

export const ExpertEmpty: Story = {
  args: { chapter: "expert", steps: {} },
}

export const MasterEmpty: Story = {
  args: { chapter: "master", steps: {} },
}

export const WizardEmpty: Story = {
  args: { chapter: "wizard", steps: {} },
}

export const StarterFull: Story = {
  args: { chapter: "starter", steps: fullSteps(CAMP_CATALOGUE, "starter") },
}

export const JuniorFull: Story = {
  args: { chapter: "junior", steps: fullSteps(CAMP_CATALOGUE, "junior") },
}

export const ExpertFull: Story = {
  args: { chapter: "expert", steps: fullSteps(CAMP_CATALOGUE, "expert") },
}

export const MasterFull: Story = {
  args: { chapter: "master", steps: fullSteps(CAMP_CATALOGUE, "master") },
}

export const WizardFull: Story = {
  args: { chapter: "wizard", steps: fullSteps(CAMP_CATALOGUE, "wizard") },
}

export const PartlyBuilt: Story = {
  args: {
    chapter: "expert",
    steps: {
      ...fullSteps(CAMP_CATALOGUE, "junior"),
      fire: 2,
      sleeping: 4,
      cooking: 1,
      camel: 2,
      mapTable: 1,
      palmGarden: 1,
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
