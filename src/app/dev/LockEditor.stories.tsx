import type { Meta, StoryObj } from "@storybook/react-vite"
import { LockEditor } from "./LockEditor"
import "@/mods/registerModApps"

const meta = {
  title: "Develop/Lock editor",
  component: LockEditor,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof LockEditor>

export default meta
type Story = StoryObj<typeof meta>

// A made-up lock: a lever opens the door out.
export const Sound: Story = { args: { initialText: "in -[L]- out\nL toggle @in\nin ?\nout ?\n" } }

// A made-up lock whose key lies behind its own door: the checks say which region is never reached.
export const CutOff: Story = { args: { initialText: "in -[K]- out\nK activator @out\nin ?\nout ?\n" } }
