import { StrictMode } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { LockPlayground } from "./lockPlayground.testing"
import "@/mods/registerModApps"

// Every catalogue lock, read the way `yarn lock` reads it: the file is the lock. Named by its path under
// src/game/locks, so a lesson reads as "lessons/torch".
const LOCKS = Object.fromEntries(
  Object.entries(
    import.meta.glob("../../game/locks/**/*.lock", { query: "?raw", import: "default", eager: true }) as Record<
      string,
      string
    >
  ).map(([path, text]) => [path.replace(/^.*\/locks\//, "").replace(/\.lock$/, ""), text])
)

const meta = {
  title: "Topology/Lock playground",
  component: LockPlayground,
  parameters: { layout: "fullscreen" },
  // The app renders in StrictMode; so does the playground, or a mount-time cleanup would go unseen.
  decorators: [
    Story => (
      <StrictMode>
        <Story />
      </StrictMode>
    ),
  ],
  // `initial` because the first lock alphabetically (cellar) takes seconds per seed to carve on the bench floor,
  // which would freeze the story on load; a lesson carves at once.
  args: { locks: LOCKS, initial: "lessons/leverOpensADoor" },
} satisfies Meta<typeof LockPlayground>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

// A made-up lock for looking at the explorer's weight: the door beyond the entrance waits for a stone on `p`, so it
// draws swung open while he stands on `p` and shut again once he steps off.
export const WeightOpensTheDoor: Story = {
  args: {
    locks: { doorByPlate: "in -[p]- out\np plate @in\nshelf plate @in stone\nin ?\nout ?" },
    initial: "doorByPlate",
  },
}

// The water locks: a region gate bars a hall, dressed as water (pick sand in the region-barrier picker).
export const WaterMoves: Story = { args: { initial: "lessons/waterMoves" } }
export const Sluice: Story = { args: { initial: "sluice" } }
export const Tide: Story = { args: { initial: "tide" } }

// A made-up lock for the narrow passage: a stone on a shelf by the way in, and a crack in a wall on to the way out.
// With empty hands, tap the wall to squeeze through; lift the stone first and the explorer stops beside the wall.
export const SqueezeThrough: Story = {
  args: {
    locks: { crack: "in -[unladen]- out\nshelf plate @in stone\nin ?\nout ?" },
    initial: "crack",
  },
}

// MADE-UP LOCKS NESTED IN EACH OTHER, one story per stone case (stones spec, "Nested locks"). The picked lock is the
// host; `nest` is spliced into its nest spot (`-&>`).
const HOST_STONES =
  "in -- yard\nyard -&> hall\nhall -[p]- out\np plate @hall\nshelf plate @in stone\nin ?\nyard ?\nhall ?\nout ?"
const LEVER = "in -&> hall\nhall -[L]- out\nL toggle @in\nin ?\nhall ?\nout ?"
const CELL = "in -- hall\nhall -[p]- out\np plate @hall\nshelf plate @in stone\nin ?\nhall ?\nout ?"
const GATED = "in -[s]- hall\nhall -- out\ns plate @in\nt plate @hall stone\nin ?\nhall ?\nout ?"

// Park the stone, solve the lever inside, fetch the stone and carry it through to the door beyond.
export const StonePassesThrough: Story = {
  args: { locks: { host: HOST_STONES, lever: LEVER }, initial: "host", nest: "lever" },
}

// The stone lock inside keeps its stones by its own design: its door out opens only with the stone set on `p`, so
// nothing is carried out by its way out; a stone may be carried back out by its way in.
export const StoneStaysInside: Story = {
  args: { locks: { lever: LEVER, cell: CELL }, initial: "lever", nest: "cell" },
}

// One pool: carry the host's stone in, set it on `s`, take the inner's own stone out to the door beyond.
export const StonesShared: Story = {
  args: { locks: { host: HOST_STONES, gated: GATED }, initial: "host", nest: "gated" },
}
