import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { ExplorerDot } from "./ExplorerDot"

const meta = {
  title: "App/SiteMap/ExplorerDot",
  component: ExplorerDot,
  parameters: { layout: "centered" },
} satisfies Meta<typeof ExplorerDot>

export default meta
type Story = StoryObj<typeof meta>

export const AtEntrance: Story = {
  render: () => (
    <svg width={200} height={80}>
      <line x1={40} y1={40} x2={160} y2={40} stroke="#9ca3af" strokeWidth={2} />
      <circle cx={40} cy={40} r={18} fill="#60a5fa" />
      <circle cx={160} cy={40} r={18} fill="#e5e7eb" />
      <ExplorerDot from={{ x: 40, y: 40 }} to={{ x: 40, y: 40 }} />
    </svg>
  ),
  args: { from: { x: 40, y: 40 }, to: { x: 40, y: 40 } },
}

export const MidGlide: Story = {
  render: () => {
    const [snapped, setSnapped] = useState(false)

    const [moving, setMoving] = useState(false)
    const to = moving ? { x: 160, y: 40 } : { x: 40, y: 40 }
    return (
      <div>
        <svg width={200} height={80} onClick={() => setSnapped(true)}>
          <line x1={40} y1={40} x2={160} y2={40} stroke="#9ca3af" strokeWidth={2} />
          <circle cx={40} cy={40} r={18} fill="#34d399" />
          <circle cx={160} cy={40} r={18} fill="#60a5fa" />
          <ExplorerDot from={{ x: 40, y: 40 }} to={to} duration={2000} snap={snapped} />
        </svg>
        <div className="mt-2 flex gap-2">
          <button
            className="rounded bg-blue-100 px-2 py-1 text-sm"
            onClick={() => {
              setSnapped(false)
              setMoving(true)
            }}
          >
            Start glide
          </button>
          <button className="rounded bg-yellow-100 px-2 py-1 text-sm" onClick={() => setSnapped(true)}>
            Snap
          </button>
          <button
            className="rounded bg-gray-100 px-2 py-1 text-sm"
            onClick={() => {
              setSnapped(false)
              setMoving(false)
            }}
          >
            Reset
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-400">Click SVG or Snap button to jump to destination</p>
      </div>
    )
  },
  args: { from: { x: 40, y: 40 }, to: { x: 160, y: 40 } },
}
