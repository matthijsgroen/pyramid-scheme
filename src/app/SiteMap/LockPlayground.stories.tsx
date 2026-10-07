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
