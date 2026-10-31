import type { Meta, StoryObj } from "@storybook/react-vite"
import { ComingHomeScreen } from "./ComingHomeScreen"
import { campArt } from "@/ui/atoms/campScene/campArt"
import { MapPieceIcon } from "@/ui/molecules/MapPieceIcon"

const fireUrl = campArt("campfire")?.url
const fire = fireUrl ? <img src={fireUrl} alt="" className="h-full object-contain" /> : <span>🔥</span>

const meta = {
  component: ComingHomeScreen,
  parameters: { layout: "fullscreen" },
  args: {
    title: "Terug in het kamp",
    fire,
    rest: (
      <>
        <span aria-label="3 van 3 hartjes">♥ ♥ ♥</span>
        <span>Uitgerust bij het vuur — weer helemaal fit</span>
      </>
    ),
    haulTitle: "Je buit van deze tocht",
    lines: [
      {
        key: "a",
        visual: <span className="size-full bg-[#B45309]" />,
        title: "Bronzen waterkruik",
        note: "Nieuw in je kamp — krijgt een plekje",
        badge: "NIEUW",
      },
      {
        key: "b",
        visual: <span className="size-full bg-[#2F5D7C]" />,
        title: "3 mozaïekstukjes",
        note: "Naar het glas-in-loodraam",
      },
      {
        key: "c",
        visual: <span className="size-full bg-ember-500" />,
        title: "+85 munten",
        note: "Losse munten onderweg",
      },
    ],
    buttonLabel: "Uitpakken",
    onDone: () => {},
  },
} satisfies Meta<typeof ComingHomeScreen>

export default meta
type Story = StoryObj<typeof meta>

export const ThreeLines: Story = {}
export const Empty: Story = { args: { lines: [] } }
export const OversizedVisuals: Story = {
  args: {
    lines: [
      {
        key: "coins",
        visual: <span className="text-6xl">🪙</span>,
        title: "+85 munten",
        note: "Losse munten onderweg",
      },
      { key: "pieces", visual: <span className="text-6xl">🔷</span>, title: "3 mozaïekstukjes" },
      { key: "map", visual: <MapPieceIcon progress={{ found: 1, required: 4 }} />, title: "Kaartdeel" },
      ...(fireUrl
        ? [{ key: "fire", visual: <img src={fireUrl} alt="" className="size-24 object-contain" />, title: "Kampvuur" }]
        : []),
    ],
  },
}
