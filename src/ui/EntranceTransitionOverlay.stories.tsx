import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { EntranceTransitionOverlay } from "./EntranceTransitionOverlay"

const meta = {
  title: "UI/EntranceTransitionOverlay",
  component: EntranceTransitionOverlay,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof EntranceTransitionOverlay>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: args => {
    const [key, setKey] = useState(0)
    const [running, setRunning] = useState(false)
    return (
      <div className="flex h-screen items-center justify-center bg-amber-200">
        <p className="font-pyramid text-xl">Inner pyramid map goes here</p>
        <button
          onClick={() => {
            setKey(k => k + 1)
            setRunning(true)
          }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded bg-black/40 px-4 py-2 text-sm text-white hover:bg-black/60"
        >
          Replay
        </button>
        {running && <EntranceTransitionOverlay key={key} {...args} onComplete={() => setRunning(false)} />}
      </div>
    )
  },
  args: {
    origin: "50% 65%",
  },
}

export const FromCenter: Story = {
  ...Default,
  args: { origin: "50% 50%" },
}

export const FromBottomLeft: Story = {
  ...Default,
  args: { origin: "20% 80%" },
}
