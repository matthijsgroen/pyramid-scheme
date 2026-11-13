import type { FC } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { KeyGlyph } from "./KeyGlyph"
import { arrows, key, pad, type Glyph, type PadBrand, type PadButton } from "./glyphs"

const KEYS: Glyph[] = [
  key("Enter"),
  key("Esc"),
  key("Shift"),
  key("Del"),
  key("Z"),
  key("H"),
  key("N"),
  key("1–6"),
  key("["),
  key("]"),
  arrows,
]
const PAD: PadButton[] = ["a", "b", "x", "y", "lb", "rb", "dpad", "start", "select"]

const Row: FC<{ label: string; glyphs: Glyph[]; brand?: PadBrand }> = ({ label, glyphs, brand }) => (
  <div className="flex items-center gap-4">
    <span className="w-28 text-sm text-stone-400">{label}</span>
    <div className="flex flex-wrap items-center gap-3">
      {glyphs.map((glyph, index) => (
        <KeyGlyph key={index} glyph={glyph} brand={brand} />
      ))}
    </div>
  </div>
)

const AllGlyphs: FC = () => (
  <div className="flex flex-col gap-5 bg-stone-900 p-6">
    <Row label="Keyboard" glyphs={KEYS} />
    <Row label="Xbox" glyphs={PAD.map(pad)} brand="xbox" />
    <Row label="PlayStation" glyphs={PAD.map(pad)} brand="playstation" />
  </div>
)

const meta = {
  component: KeyGlyph,
  args: { glyph: key("Enter") },
} satisfies Meta<typeof KeyGlyph>

export default meta
type Story = StoryObj<typeof meta>

export const Keycap: Story = {}

export const Arrows: Story = { args: { glyph: arrows } }

export const XboxA: Story = { args: { glyph: pad("a"), brand: "xbox" } }

export const PlayStationCross: Story = { args: { glyph: pad("a"), brand: "playstation" } }

/** Every glyph in both looks: keycaps, then the pad buttons as Xbox and as PlayStation. */
export const All: Story = { render: () => <AllGlyphs /> }
