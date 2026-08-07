import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { MosaicWindow } from "./MosaicWindow"
import { MOSAIC_TIERS, MOSAIC_STEPS_BY_TIER, type MosaicTier } from "@/mods/mosaic/game/mosaicCurrency"
import type { TierCounts } from "@/mods/mosaic/game/placementQueue"

// No `component` binding: every story drives the window through the harness below, which stands in
// for the ledger and the persisted slice, so there are no args to bind.
const meta: Meta = {
  title: "UI/MosaicWindow",
  parameters: { layout: "fullscreen" },
}

export default meta
type Story = StoryObj

const zero = (): TierCounts => Object.fromEntries(MOSAIC_TIERS.map(t => [t, 0])) as TierCounts

// Stands in for the ledger and the persisted slice: find pieces, then set them in. The cascade,
// the timing and the button are the component's own — this only supplies the counts.
const Harness = ({ initialOwned = zero() }: { initialOwned?: TierCounts }) => {
  const [owned, setOwned] = useState<TierCounts>(initialOwned)
  const [placed, setPlaced] = useState<TierCounts>(zero())

  const find = (tier: MosaicTier, n: number) => setOwned(o => ({ ...o, [tier]: o[tier] + n }))

  return (
    <div className="flex h-screen flex-col bg-stone-950">
      <MosaicWindow owned={owned} placed={placed} onPlace={tier => setPlaced(p => ({ ...p, [tier]: p[tier] + 1 }))} />
      <div className="flex flex-wrap items-center justify-center gap-2 bg-stone-900 p-3 text-xs text-white">
        {MOSAIC_TIERS.map(tier => (
          <button key={tier} onClick={() => find(tier, 5)} className="rounded bg-white/10 px-2 py-1">
            find 5 {tier}
          </button>
        ))}
        <button
          onClick={() =>
            setOwned(Object.fromEntries(MOSAIC_TIERS.map(t => [t, MOSAIC_STEPS_BY_TIER[t]])) as TierCounts)
          }
          className="rounded bg-amber-700 px-2 py-1"
        >
          find everything
        </button>
        <button onClick={() => setPlaced(zero())} className="rounded bg-white/10 px-2 py-1">
          reset placed
        </button>
        <span className="opacity-60">{MOSAIC_TIERS.map(t => `${t} ${placed[t]}/${owned[t]}`).join("  ·  ")}</span>
      </div>
    </div>
  )
}

// Nothing found yet: a dark window and no button.
export const Empty: Story = { render: () => <Harness /> }

// A handful in hand — tap "Place" and watch them cascade in, lowest register first.
export const PiecesInHand: Story = {
  render: () => <Harness initialOwned={{ ...zero(), starter: 6, junior: 3 }} />,
}

// One register short of complete: place the last few and the panel lights up.
export const AboutToFinishStarter: Story = {
  render: () => <Harness initialOwned={{ ...zero(), starter: MOSAIC_STEPS_BY_TIER.starter }} />,
}
