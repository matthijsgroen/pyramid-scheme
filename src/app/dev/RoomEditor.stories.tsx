import type { Meta, StoryObj } from "@storybook/react-vite"
import { RoomEditor } from "./RoomEditor"
import "@/mods/registerModApps"

const meta = {
  title: "Develop/Room editor",
  component: RoomEditor,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof RoomEditor>

export default meta
type Story = StoryObj<typeof meta>

// A made-up hall with a pillar and a basin, one door south; pick another tier to draw it with that tier's art.
export const Hall: Story = {
  args: {
    initialText: `// designed by: nobody
room hall
tier starter
layout
# # # # # # # #
# . . . . . . #
# . p . . b . #
# . . . . . . #
# . . . s . . #
# # # # d # # #
p floor pillar
b floor basin
s stop
`,
  },
}
