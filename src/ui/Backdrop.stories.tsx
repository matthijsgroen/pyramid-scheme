import type { Meta, StoryObj } from "@storybook/react"
import { Backdrop } from "./Backdrop"
import type { DayNightCycleStep } from "./backdropSelection"

const meta = {
  title: "UI/Backdrop",
  component: Backdrop,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    levelNr: {
      control: { type: "range", min: 1, max: 20, step: 1 },
    },
    start: {
      control: "select",
      options: [
        "morning",
        "afternoon",
        "evening",
        "night",
      ] as DayNightCycleStep[],
    },
  },
} satisfies Meta<typeof Backdrop>

export default meta
type Story = StoryObj<typeof meta>

export const Morning: Story = {
  args: {
    levelNr: 1,
    start: "morning",
    children: (
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Morning</h1>
        <p className="text-xl text-white">Beautiful sunrise scene</p>
      </div>
    ),
  },
}

export const Afternoon: Story = {
  args: {
    levelNr: 1,
    start: "afternoon",
    children: (
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Afternoon</h1>
        <p className="text-xl text-white">Bright sunny day</p>
      </div>
    ),
  },
}

export const Evening: Story = {
  args: {
    levelNr: 1,
    start: "evening",
    children: (
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Evening</h1>
        <p className="text-xl text-white">Golden sunset</p>
      </div>
    ),
  },
}

export const Night: Story = {
  args: {
    levelNr: 1,
    start: "night",
    children: (
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Night</h1>
        <p className="text-xl text-white">Starry night with crescent moon</p>
      </div>
    ),
  },
}

export const CycleProgression: Story = {
  args: {
    levelNr: 10,
    start: "morning",
    children: (
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Level 10</h1>
        <p className="text-xl text-white">Day/night cycle progression</p>
      </div>
    ),
  },
}

export const WithGameContent: Story = {
  args: {
    levelNr: 1,
    start: "afternoon",
    children: (
      <div className="flex flex-col items-center justify-center">
        <div className="bg-white/90 rounded-lg p-8 shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Pyramid Game</h2>
          <p className="mb-4">
            This is how game content would appear over the backdrop
          </p>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }, (_, i) => (
              <div
                key={i}
                className="w-12 h-12 bg-amber-200 border-2 border-amber-400 rounded flex items-center justify-center"
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
}

export const Empty: Story = {
  args: {
    levelNr: 1,
    start: "morning",
    children: null,
  },
}
