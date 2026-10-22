import type { Meta, StoryObj } from "@storybook/react-vite"
import { LockEditor } from "./LockEditor"
import { inThreadEngine } from "./webEngine"
import { MADE_UP_WEB, madeUpTier, madeUpWebHost } from "./madeUpWeb"
import "@/mods/registerModApps"

const meta = {
  title: "Develop/Lock editor",
  component: LockEditor,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof LockEditor>

export default meta
type Story = StoryObj<typeof meta>

// A made-up lock: a lever opens the door out.
export const Sound: Story = { args: { initialText: "in -[L]- out\nL toggle @in\nin ?\nout ?\n", initialMode: "lock" } }

// A made-up lock whose key lies behind its own door: the checks say which region is never reached.
export const CutOff: Story = {
  args: { initialText: "in -[K]- out\nK activator @out\nin ?\nout ?\n", initialMode: "lock" },
}

// A made-up tier and web: levers in three journeys clear wizard_3 a stretch at a time, and keys open seals elsewhere.
// The checks and pulls run on the page against plain floors, not on the baked world.
export const Web: Story = {
  args: {
    initialMode: "web",
    initialWeb: MADE_UP_WEB,
    webEngine: inThreadEngine(madeUpWebHost(madeUpTier([4, 5, 6, 6]))),
  },
}
