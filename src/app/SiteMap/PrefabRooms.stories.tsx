import type { Meta, StoryObj } from "@storybook/react-vite"
import { parsePrefab } from "@/game/prefabNotation"
import type { Prefab } from "@/game/prefabTypes"
import { PrefabRoomPreview } from "./PrefabRoomPreview"
import "@/mods/registerModApps"

// Every designed room in src/game/rooms, each drawn on a floor of its own with every door a straight arm reaches in
// use. The browser cannot read the folder, so the .room texts come in through the bundler.
const ROOMS: Record<string, Prefab> = {}
const FAILED: Record<string, string> = {}
for (const [path, text] of Object.entries(
  import.meta.glob("../../game/rooms/**/*.room", { query: "?raw", import: "default", eager: true }) as Record<
    string,
    string
  >
)) {
  if (path.endsWith("-blocked.room")) continue
  const name = path.slice(path.lastIndexOf("/") + 1, -".room".length)
  try {
    ROOMS[name] = parsePrefab(text, name)
  } catch (error) {
    FAILED[name] = error instanceof Error ? error.message : String(error)
  }
}

const NAMES = Object.keys(ROOMS)

const Catalogue = ({
  room,
  ...rest
}: { room: string } & Omit<React.ComponentProps<typeof PrefabRoomPreview>, "prefab">) => (
  <div>
    {Object.entries(FAILED).map(([name, error]) => (
      <p key={name} className="p-2 text-sm text-red-700">
        {name}.room: {error}
      </p>
    ))}
    {ROOMS[room] ? (
      <PrefabRoomPreview prefab={ROOMS[room]} {...rest} />
    ) : (
      <p className="p-4 text-sm">No rooms yet: a .room file under src/game/rooms/&lt;tier&gt; shows up here.</p>
    )}
  </div>
)

const meta = {
  title: "Topology/Prefab rooms",
  component: Catalogue,
  parameters: { layout: "fullscreen" },
  argTypes: {
    room: { control: "select", options: NAMES },
    variant: { control: { type: "number", min: 0, max: 7 } },
    fill: { control: { type: "number", min: 0, max: 99 } },
    from: { control: "inline-radio", options: ["n", "s", "e", "w"] },
    to: { control: "inline-radio", options: ["n", "s", "e", "w"] },
  },
} satisfies Meta<typeof Catalogue>

export default meta
type Story = StoryObj<typeof meta>

/** The first room of the catalogue; pick another with the room control. */
export const Room: Story = { args: { room: NAMES[0] ?? "" } }
