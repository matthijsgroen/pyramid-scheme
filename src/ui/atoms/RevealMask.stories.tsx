import type { Meta, StoryObj } from "@storybook/react-vite"
import { RevealMask } from "./RevealMask"

// A stand-in host: the mask renders inside a `relative` parent and covers it. The chipped silhouette
// mirrors the one HieroglyphTile uses, so the clip-path stories show what the real tile does.
const CHIPPED = "polygon(0% 0%, 85% 0%, 100% 15%, 100% 100%, 0% 100%)"

const Host = ({
  progress,
  clipPath,
  label,
}: {
  progress: { found: number; required: number }
  clipPath?: string
  label: string
}) => (
  <div className="flex flex-col items-center gap-2">
    <div className="relative flex h-20 w-20 items-center justify-center bg-amber-300 text-3xl" style={{ clipPath }}>
      𓂀
      <RevealMask progress={progress} clipPath={clipPath} />
    </div>
    <span className="text-xs text-gray-600">{label}</span>
  </div>
)

const meta = {
  title: "UI/RevealMask",
  component: RevealMask,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof RevealMask>

export default meta
type Story = StoryObj<typeof meta>

export const Fractions: Story = {
  args: { progress: { found: 1, required: 3 } },
  render: () => (
    <div className="flex flex-wrap items-start gap-6">
      <Host progress={{ found: 0, required: 3 }} label="0 of 3" />
      <Host progress={{ found: 1, required: 3 }} label="1 of 3" />
      <Host progress={{ found: 2, required: 3 }} label="2 of 3" />
      <Host progress={{ found: 3, required: 4 }} label="3 of 4" />
      <Host progress={{ found: 3, required: 3 }} label="3 of 3 (no mask)" />
    </div>
  ),
}

// The wedge has to stop at the host's own edge rather than spilling over it — a chipped stone tile
// passes its clip-path down for exactly this.
export const FollowsAClipPath: Story = {
  args: { progress: { found: 1, required: 3 } },
  render: () => (
    <div className="flex flex-wrap items-start gap-6">
      <Host progress={{ found: 1, required: 3 }} label="1 of 3, square" />
      <Host progress={{ found: 1, required: 3 }} clipPath={CHIPPED} label="1 of 3, chipped" />
      <Host progress={{ found: 2, required: 3 }} clipPath={CHIPPED} label="2 of 3, chipped" />
    </div>
  ),
}
