import type { Meta, StoryObj } from "@storybook/react-vite"
import { DesertBackdrop } from "./DesertBackdrop"
import { skyTop, type DayNightCycleStep } from "./backdropSelection"

const meta = {
  title: "UI/DesertBackdrop",
  component: DesertBackdrop,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    levelNr: 1,
    start: "morning",
    timeStepSize: 1,
    showNile: true,
  },
  argTypes: {
    levelNr: {
      control: { type: "range", min: 1, max: skyTop.length * 2, step: 1 },
    },
    start: {
      control: "select",
      options: ["morning", "afternoon", "evening", "night"] as DayNightCycleStep[],
    },
  },
} satisfies Meta<typeof DesertBackdrop>

export default meta
type Story = StoryObj<typeof meta>

export const Morning: Story = {
  args: {
    levelNr: 1,
    start: "morning",
  },
  render: args => (
    <DesertBackdrop {...args}>
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-white">Morning</h1>
        <p className="text-xl text-white">Beautiful sunrise scene</p>
      </div>
    </DesertBackdrop>
  ),
}

export const Afternoon: Story = {
  args: {
    levelNr: 1,
    start: "afternoon",
  },
  render: args => (
    <DesertBackdrop {...args}>
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-white">Afternoon</h1>
        <p className="text-xl text-white">Bright sunny day</p>
      </div>
    </DesertBackdrop>
  ),
}

export const Evening: Story = {
  args: {
    levelNr: 1,
    start: "evening",
  },
  render: args => (
    <DesertBackdrop {...args}>
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-white">Evening</h1>
        <p className="text-xl text-white">Golden sunset</p>
      </div>
    </DesertBackdrop>
  ),
}

export const Night: Story = {
  args: {
    levelNr: 1,
    start: "night",
  },
  render: args => (
    <DesertBackdrop {...args}>
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-white">Night</h1>
        <p className="text-xl text-white">Starry night with crescent moon</p>
      </div>
    </DesertBackdrop>
  ),
}

export const CycleProgression: Story = {
  args: {
    levelNr: 10,
    start: "morning",
  },
  render: args => (
    <DesertBackdrop {...args}>
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-white">Level 10</h1>
        <p className="text-xl text-white">Day/night cycle progression</p>
      </div>
    </DesertBackdrop>
  ),
}

export const WithGameContent: Story = {
  args: {
    levelNr: 1,
    start: "afternoon",
  },
  render: args => (
    <DesertBackdrop {...args}>
      <div className="flex flex-col items-center justify-center">
        <div className="rounded-lg bg-white/90 p-8 shadow-lg">
          <h2 className="mb-4 text-2xl font-bold">Pyramid Game</h2>
          <p className="mb-4">This is how game content would appear over the backdrop</p>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }, (_, i) => (
              <div
                key={i}
                className="flex h-12 w-12 items-center justify-center rounded border-2 border-amber-400 bg-amber-200"
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      </div>
    </DesertBackdrop>
  ),
}

export const Empty: Story = {
  args: {
    levelNr: 1,
    start: "morning",
  },
}
