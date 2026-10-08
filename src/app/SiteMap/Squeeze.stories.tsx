import { StrictMode, useEffect, useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { revealAll } from "@/game/gridNavigation"
import type { Direction, GridCell } from "@/game/siteTypes"
import { floorFrom } from "./floorFixtures.testing"
import { prefersReducedMotion } from "./reducedMotion"
import { SiteMapView } from "./SiteMapView"
import { SQUEEZE_MS_PER_LEG, useSqueeze } from "./useSqueeze"
import "@/mods/registerModApps"

// The squeeze on the real `SiteMapView` path, one wall per direction: the explorer goes into the crack, out on the
// far side, waits, and is put back, over and over. North-south walls are `narrowAcross`, east-west ones `narrowAlong`.
// `useSqueeze` holds the crossing and `SiteMapView`'s `squeeze` prop draws it, as in play.

const PAUSE_MS = 900

// A narrow passage's own cell: a gate, open with empty hands, in the wall between two stretches of floor.
const crack = (dirs: Direction[]): GridCell => ({
  type: "room",
  roomType: "encounter",
  dirs: new Set(dirs),
  state: "fogged",
  tags: ["gate"],
  passage: { realisation: "narrowPassage" },
})

const ACROSS = ["  E  ", "  .  ", "  P  ", "  .  ", "  R  "]
const ALONG = ["     ", "     ", "E.P.R", "     ", "     "]

const STAGES = {
  s: { rows: ACROSS, from: [1, 2], via: [2, 2], to: [3, 2] },
  n: { rows: ACROSS, from: [3, 2], via: [2, 2], to: [1, 2] },
  e: { rows: ALONG, from: [2, 1], via: [2, 2], to: [2, 3] },
  w: { rows: ALONG, from: [2, 3], via: [2, 2], to: [2, 1] },
} as const

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

const Squeeze = ({ travel }: { travel: Direction }) => {
  const { rows, from, via, to } = STAGES[travel]
  const [grid] = useState(() => revealAll(floorFrom(rows, { P: dirs => crack(dirs) })))
  const [reduced] = useState(prefersReducedMotion)
  const { squeeze, playTraversal } = useSqueeze({ reducedMotion: reduced })
  const [pos, setPos] = useState<readonly [number, number]>(from)
  const [round, setRound] = useState(0)
  const [rounds, setRounds] = useState(0)
  useEffect(() => {
    let live = true
    void (async () => {
      setPos(from)
      await sleep(PAUSE_MS)
      while (live) {
        await playTraversal({ kind: "narrowPassage", from, via, to, dir: travel })
        if (!live) return
        setPos(to)
        setRounds(n => n + 1)
        await sleep(PAUSE_MS)
        if (!live) return
        setPos(from)
        await sleep(PAUSE_MS)
      }
    })()
    return () => {
      live = false
    }
  }, [round, playTraversal, travel, from, via, to])
  const tall = travel === "n" || travel === "s"
  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 p-2 text-sm">
        <button type="button" disabled={!!squeeze} onClick={() => setRound(n => n + 1)}>
          Squeeze
        </button>
        <span data-timing="">
          {SQUEEZE_MS_PER_LEG} ms per leg: into the crack, then out of it, {SQUEEZE_MS_PER_LEG * 2} ms in all, then{" "}
          {PAUSE_MS} ms pauses
        </span>
        <span>{reduced ? "reduced motion: the crossing is at once" : `squeezed ${rounds} times`}</span>
      </div>
      <SiteMapView
        grid={grid}
        explorerPos={pos}
        explorerHidden={!!squeeze}
        squeeze={squeeze}
        className={tall ? "h-160 w-full" : "h-104 w-full"}
      />
    </div>
  )
}

const meta = {
  title: "Topology/Squeeze",
  component: Squeeze,
  parameters: { layout: "fullscreen" },
  // The app renders in StrictMode; so does the squeeze here, or a mount-time cleanup would go unseen.
  decorators: [
    Story => (
      <StrictMode>
        <Story />
      </StrictMode>
    ),
  ],
} satisfies Meta<typeof Squeeze>

export default meta
type Story = StoryObj<typeof meta>

export const North: Story = { args: { travel: "n" } }
export const South: Story = { args: { travel: "s" } }
export const East: Story = { args: { travel: "e" } }
export const West: Story = { args: { travel: "w" } }
