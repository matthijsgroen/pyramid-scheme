import type { Meta, StoryObj } from "@storybook/react-vite"
import { RevealPlaceholder } from "./RevealPlaceholder"
import { revealMaskStyle } from "./revealMask"

// A stand-in host, showing the pair as the real hosts use it: the placeholder behind, the host's own
// content masked to the collected fraction. The chipped silhouette mirrors one of HieroglyphTile's,
// so the clip-path stories show what the real tile does.
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
    <div className="relative inline-flex h-20 w-20">
      <RevealPlaceholder progress={progress} clipPath={clipPath} />
      <div
        className="flex h-20 w-20 items-center justify-center bg-amber-300 text-3xl"
        style={{ clipPath, ...revealMaskStyle(progress) }}
      >
        𓂀
      </div>
    </div>
    <span className="text-xs text-gray-600">{label}</span>
  </div>
)

const meta = {
  title: "UI/RevealPlaceholder",
  component: RevealPlaceholder,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
} satisfies Meta<typeof RevealPlaceholder>

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
      <Host progress={{ found: 3, required: 3 }} label="3 of 3 (whole)" />
    </div>
  ),
}

// A host with a silhouette of its own gets a faint fill of that shape instead of a dashed ring, so a
// chipped stone tile's ghost matches its own edge.
export const FollowsAClipPath: Story = {
  args: { progress: { found: 1, required: 3 } },
  render: () => (
    <div className="flex flex-wrap items-start gap-6">
      <Host progress={{ found: 1, required: 3 }} label="1 of 3, dashed ring" />
      <Host progress={{ found: 1, required: 3 }} clipPath={CHIPPED} label="1 of 3, chipped ghost" />
      <Host progress={{ found: 2, required: 3 }} clipPath={CHIPPED} label="2 of 3, chipped ghost" />
    </div>
  ),
}
