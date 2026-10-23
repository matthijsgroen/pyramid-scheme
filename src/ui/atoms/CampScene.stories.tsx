import type { Decorator, Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"
import { CampScene, type CampSceneProps } from "./CampScene"
import { CAMP_CATALOGUE } from "./campScene/campCatalogue"
import { fullSteps } from "./campScene/campLayout"
import type { CampSpotId } from "./campScene/campTypes"

/** Frames the scene in a fixed device-sized box; without `box` it fills the canvas. */
const sizedBox: Decorator = (Story, { parameters }) => {
  const box = parameters.box as { width: number; height: number } | undefined
  return (
    <div className="flex min-h-screen items-start justify-center bg-neutral-900">
      <div style={box ?? { width: "100vw", height: "100vh" }}>
        <Story />
      </div>
    </div>
  )
}

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
  },
  args: {
    chapter: "wizard",
    steps: fullSteps(CAMP_CATALOGUE, "wizard"),
    insets: INSETS,
    className: "w-full h-full",
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
  render: ({ chapter, insets, className, entrances, ...rest }) => {
    const steps = Object.fromEntries(CAMP_CATALOGUE.spots.map(spot => [spot.id, rest[spot.id] ?? 0]))
    return <CampScene chapter={chapter} steps={steps} insets={insets} entrances={entrances} className={className} />
  },
}

export const StarterEmpty: Story = {
  args: { chapter: "starter", steps: {} },
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
  parameters: { box: { width: 390, height: 844 } },
}

export const Tablet: Story = {
  parameters: { box: { width: 820, height: 1180 } },
}

export const DesktopPane: Story = {
  parameters: { box: { width: 1000, height: 836 } },
}

export const Ultrawide: Story = {
  parameters: { box: { width: 1600, height: 700 } },
}

export const WithBadges: Story = {
  args: {
    entrances: {
      chest: { badge: 3, onOpen: fn() },
      window: { label: "61/252", onOpen: fn() },
      mapTable: { onOpen: fn() },
    },
  },
}
