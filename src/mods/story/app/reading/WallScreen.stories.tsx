import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { EncounterModal } from "@/app/SiteMap/EncounterModal"
import type { Wall } from "@/mods/story/game/reading/walls"
import { WallScreen } from "./WallScreen"

const meta = {
  title: "Story/WallScreen",
  component: WallScreen,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof WallScreen>

export default meta
type Story = StoryObj<typeof meta>

// A made-up wall with its second sign cut wrong.
const wall: Wall = {
  at: { levelNr: 1, floor: 0 },
  cut: ["d1", "a1", "p1"],
  wrongAt: 1,
  answer: "a2",
  copy: "story.wall",
  after: "story.wallFixed",
  panel: { aspect: 1.3, signs: { x: 0.2, y: 0.3, width: 0.6, height: 0.4 }, flow: "row" },
}

const Reading = () => {
  const [picked, setPicked] = useState<string | null>(null)
  return (
    <EncounterModal tileset="junior">
      <WallScreen
        wall={wall}
        known={[true, true, true]}
        repairable
        owned={["d1", "a2", "p1", "s1"]}
        picked={picked}
        onPut={setPicked}
        onBack={() => {}}
      />
    </EncounterModal>
  )
}

/**
 * The wall as a keyboard or pad player meets it: the encounter frame is the input layer, so arrows or WASD
 * walk the tray (the focus is the cursor there, look C), Enter or Space puts the focused sign in, and Escape
 * is the way back.
 */
export const KeyboardCursor: Story = {
  args: {} as never,
  globals: { input: "keys" },
  parameters: { pageLayers: true },
  render: () => <Reading />,
}
