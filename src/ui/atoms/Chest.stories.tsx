import type { Meta, StoryObj } from "@storybook/react-vite"
import { Chest } from "./Chest"

const meta = {
  title: "UI/Chest",
  component: Chest,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    state: { control: "select", options: ["empty", "open", "error"] },
    variant: { control: "select", options: ["vibrant", "muted", "wooden"] },
    allowInteraction: { control: "boolean" },
  },
} satisfies Meta<typeof Chest>

export default meta
type Story = StoryObj<typeof meta>

export const Vibrant: Story = {
  args: { state: "empty", variant: "vibrant", allowInteraction: true, onClick: () => {} },
}

export const VibrantOpen: Story = {
  args: { state: "open", variant: "vibrant", allowInteraction: false, onClick: () => {} },
}

export const Wooden: Story = {
  args: { state: "empty", variant: "wooden", allowInteraction: true, onClick: () => {} },
}

export const WoodenOpen: Story = {
  args: { state: "open", variant: "wooden", allowInteraction: false, onClick: () => {} },
}

export const Muted: Story = {
  args: { state: "empty", variant: "muted", allowInteraction: true, onClick: () => {} },
}

export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-12 bg-stone-900 p-8">
      {(["vibrant", "wooden", "muted"] as const).map(variant => (
        <div key={variant} className="flex flex-col items-center gap-8">
          <span className="text-sm text-stone-400">{variant}</span>
          {(["empty", "open", "error"] as const).map(state => (
            <Chest key={state} state={state} variant={variant} allowInteraction={false} onClick={() => {}} />
          ))}
        </div>
      ))}
    </div>
  ),
  args: { allowInteraction: false, onClick: () => {} },
}
