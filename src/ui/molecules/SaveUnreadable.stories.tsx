import type { Meta, StoryObj } from "@storybook/react-vite"
import { SaveUnreadable } from "./SaveUnreadable"

const meta = {
  component: SaveUnreadable,
  parameters: { layout: "fullscreen" },
  args: {
    mode: "notice",
    labels: {
      title: "Your progress can't be loaded",
      body: "The browser won't hand over your saved game right now. Your save isn't gone: reload the page to try again.",
      banner: "Progress isn't being saved. Tap to reload.",
      reload: "Reload",
      continue: "Play on without saving",
      reset: "Start over (delete save)",
      confirmReset: "This deletes your whole save, and it can't be undone. Start over?",
      confirmResetYes: "Yes, delete it",
      confirmResetNo: "No, go back",
    },
    onReload: () => {},
    onContinue: () => {},
    onConfirmReset: () => {},
    onCancelReset: () => {},
  },
} satisfies Meta<typeof SaveUnreadable>

export default meta
type Story = StoryObj<typeof meta>

export const Notice: Story = {}
export const AfterReloadsFailed: Story = { args: { onReset: () => {} } }
export const ConfirmReset: Story = { args: { mode: "confirmReset" } }
export const Banner: Story = { args: { mode: "banner" } }
