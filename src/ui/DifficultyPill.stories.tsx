import type { Meta, StoryObj } from "@storybook/react-vite"
import { DifficultyPill } from "./DifficultyPill"

const meta = {
  title: "UI/DifficultyPill",
  component: DifficultyPill,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    difficulty: {
      control: "select",
      options: ["starter", "junior", "expert", "master", "wizard"],
    },
    disabled: {
      control: "boolean",
    },
    label: {
      control: "text",
    },
  },
} satisfies Meta<typeof DifficultyPill>

export default meta
type Story = StoryObj<typeof meta>

export const Starter: Story = {
  args: {
    difficulty: "starter",
    label: "starter",
  },
}

export const Junior: Story = {
  args: {
    difficulty: "junior",
    label: "junior",
  },
}

export const Expert: Story = {
  args: {
    difficulty: "expert",
    label: "expert",
  },
}

export const Master: Story = {
  args: {
    difficulty: "master",
    label: "master",
  },
}

export const Wizard: Story = {
  args: {
    difficulty: "wizard",
    label: "wizard",
  },
}

export const Disabled: Story = {
  args: {
    difficulty: "expert",
    label: "expert",
    disabled: true,
  },
}

export const AllDifficulties: Story = {
  args: {
    difficulty: "starter",
    label: "starter",
  },
  render: () => (
    <div className="flex flex-wrap gap-2">
      <DifficultyPill difficulty="starter" label="starter" />
      <DifficultyPill difficulty="junior" label="junior" />
      <DifficultyPill difficulty="expert" label="expert" />
      <DifficultyPill difficulty="master" label="master" />
      <DifficultyPill difficulty="wizard" label="wizard" />
    </div>
  ),
}
