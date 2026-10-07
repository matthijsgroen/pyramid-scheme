import type { ComponentProps, FC } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import type { GateFace } from "@/game/gateFace"
import { GateFaceComponent } from "./GateFaceComponent"
import "@/mods/registerModApps"

// EVERY LOOK A DOOR'S FACE HAS: plates (a stone where the door wants one, bare where it wants none), a sequence's
// symbols, empty hands, and owners of every kind on one door. The face reads only `ctx.gateFace`; the rest of the
// family props are inert here.
const DoorFace: FC<{ face: GateFace }> = ({ face }) => {
  const props = {
    ctx: { gateFace: face },
    journeys: { setMechanismState: () => {} },
    onCancel: () => {},
  } as unknown as ComponentProps<typeof GateFaceComponent>
  return <GateFaceComponent {...props} />
}

const stone = (id: string, lit: boolean) => ({ id, icon: { kind: "plate", wants: "stone" } as const, lit })

const meta = {
  title: "Topology/Door faces",
  component: DoorFace,
  parameters: { layout: "centered" },
} satisfies Meta<typeof DoorFace>

export default meta
type Story = StoryObj<typeof meta>

export const TwoPlatesOneHeld: Story = {
  args: { face: { markers: [stone("stones.e1", true), stone("stones.e2", false)] } },
}

export const PlateLeftEmpty: Story = {
  args: {
    face: {
      markers: [stone("stones.a", false), { id: "stones.b", icon: { kind: "plate", wants: "empty" }, lit: true }],
    },
  },
}

export const EmptyHands: Story = {
  args: { face: { markers: [stone("stones.p", true), { id: "unladen", icon: { kind: "hands" }, lit: false }] } },
}

export const SequenceSymbols: Story = {
  args: {
    face: {
      markers: [],
      sequences: [
        {
          id: "run",
          tiles: [
            { glyph: 0x13000, status: "inOrder" },
            { glyph: 0x13050, status: "unwalked" },
            { glyph: 0x13080, status: "unwalked" },
          ],
        },
      ],
    },
  },
}

export const Mixed: Story = {
  args: {
    face: {
      markers: [
        { id: "L", icon: { kind: "mechanism", family: "handle" }, lit: true },
        { id: "T", icon: { kind: "mechanism", family: "torch" }, lit: false },
        stone("stones.p", true),
        { id: "unladen", icon: { kind: "hands" }, lit: false },
        { id: "k", icon: { kind: "key" }, lit: false },
      ],
      sequences: [
        {
          id: "run",
          tiles: [
            { glyph: 0x13000, status: "inOrder" },
            { glyph: 0x13050, status: "outOfOrder" },
          ],
        },
      ],
    },
  },
}
