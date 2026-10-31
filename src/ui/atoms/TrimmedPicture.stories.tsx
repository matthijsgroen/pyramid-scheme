import type { Meta, StoryObj } from "@storybook/react-vite"
import jar from "@/assets/camp/jar.webp"
import { TrimmedPicture } from "./TrimmedPicture"

const meta = {
  component: TrimmedPicture,
  parameters: { layout: "centered" },
  decorators: [
    Story => (
      <div className="flex gap-6 bg-slate-500 p-6">
        <img src={jar} alt="" className="size-40 object-contain" />
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TrimmedPicture>

export default meta
type Story = StoryObj<typeof meta>

/** Left: the scene art as painted, in its corner. Right: the same file cut to what is painted. */
export const SceneArt: Story = { args: { src: jar, className: "size-40" } }
