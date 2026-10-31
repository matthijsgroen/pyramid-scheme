import type { Meta, StoryObj } from "@storybook/react-vite"
import { CampHomeLayout } from "./CampHomeLayout"
import { CampHud } from "@/ui/molecules/CampHud"
import { ContinueCard } from "@/ui/molecules/ContinueCard"

const meta = {
  component: CampHomeLayout,
  parameters: { layout: "fullscreen" },
  args: {
    sceneRef: () => {},
    hud: <CampHud title="Kamp" onTitleTap={() => {}} settingsLabel="Instellingen" onSettings={() => {}} />,
    scene: <div className="size-full bg-ink-500" />,
    card: (
      <ContinueCard
        heading="Verder met"
        journeyName="Vallei van de Ambachtslieden"
        detail="Piramide 3 van 5 · Junior"
        setOffLabel="Op pad"
      />
    ),
    aside: <div className="flex-1 rounded-[10px] border-2 border-dashed border-camp-dashed p-3">Aside</div>,
  },
} satisfies Meta<typeof CampHomeLayout>

export default meta
type Story = StoryObj<typeof meta>

export const Phone: Story = { globals: { viewport: { value: "phone" } } }
export const Desktop: Story = { globals: { viewport: { value: "desktop" } } }
export const DesktopQuiet: Story = { args: { quiet: true }, globals: { viewport: { value: "desktop" } } }
