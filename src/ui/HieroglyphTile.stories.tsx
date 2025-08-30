import type { Meta, StoryObj } from "@storybook/react-vite"
import { HieroglyphTile } from "./HieroglyphTile"

const meta = {
  title: "UI/HieroglyphTile",
  component: HieroglyphTile,
  parameters: {
    layout: "centered",
    backgrounds: {
      default: "light",
      values: [
        { name: "light", value: "#f3f4f6" },
        { name: "dark", value: "#1f2937" },
      ],
    },
  },
  tags: ["autodocs"],
  argTypes: {
    symbol: {
      control: "text",
      description: "The hieroglyphic symbol to display",
    },
    difficulty: {
      control: "select",
      options: ["starter", "junior", "expert", "master", "wizard"],
      description: "Difficulty level that determines the tile color",
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Size variant of the tile",
    },
    selected: {
      control: "boolean",
      description: "Whether the tile is selected",
    },
    disabled: {
      control: "boolean",
      description: "Whether the tile is disabled",
    },
    empty: {
      control: "boolean",
      description: "Whether to show an empty placeholder tile",
    },
    onClick: {
      action: "clicked",
      description: "Click handler function",
    },
  },
} satisfies Meta<typeof HieroglyphTile>

export default meta
type Story = StoryObj<typeof meta>

export const Starter: Story = {
  args: {
    symbol: "𓁧",
    difficulty: "starter",
    size: "md",
    selected: false,
    disabled: false,
  },
}

export const Junior: Story = {
  args: {
    symbol: "𓃯",
    difficulty: "junior",
    size: "md",
    selected: false,
    disabled: false,
  },
}

export const Expert: Story = {
  args: {
    symbol: "𓁝",
    difficulty: "expert",
    size: "md",
    selected: false,
    disabled: false,
  },
}

export const Master: Story = {
  args: {
    symbol: "𓅃",
    difficulty: "master",
    size: "md",
    selected: false,
    disabled: false,
  },
}

export const Wizard: Story = {
  args: {
    symbol: "𓆉",
    difficulty: "wizard",
    size: "md",
    selected: false,
    disabled: false,
  },
}

export const Selected: Story = {
  args: {
    symbol: "𓁧",
    difficulty: "expert",
    size: "md",
    selected: true,
    disabled: false,
  },
}

export const Disabled: Story = {
  args: {
    symbol: "𓃯",
    difficulty: "master",
    size: "md",
    selected: false,
    disabled: true,
  },
}

export const SmallSize: Story = {
  args: {
    symbol: "𓁝",
    difficulty: "junior",
    size: "sm",
    selected: false,
    disabled: false,
  },
}

export const LargeSize: Story = {
  args: {
    symbol: "𓅃",
    difficulty: "wizard",
    size: "lg",
    selected: false,
    disabled: false,
  },
}

export const EmptyPlaceholder: Story = {
  args: {
    empty: true,
    size: "md",
  },
}

export const EmptyPlaceholderSmall: Story = {
  args: {
    empty: true,
    size: "sm",
  },
}

export const EmptyPlaceholderLarge: Story = {
  args: {
    empty: true,
    size: "lg",
  },
}

// Collection showcase
export const DifficultyShowcase: Story = {
  args: {
    symbol: "𓁧",
    difficulty: "starter",
  },
  render: () => (
    <div className="flex flex-wrap gap-4 p-4">
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-medium text-gray-600">Starter</span>
        <HieroglyphTile symbol="𓁧" difficulty="starter" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-medium text-gray-600">Junior</span>
        <HieroglyphTile symbol="𓃯" difficulty="junior" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-medium text-gray-600">Expert</span>
        <HieroglyphTile symbol="𓁝" difficulty="expert" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-medium text-gray-600">Master</span>
        <HieroglyphTile symbol="𓅃" difficulty="master" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-medium text-gray-600">Wizard</span>
        <HieroglyphTile symbol="𓆉" difficulty="wizard" />
      </div>
    </div>
  ),
}

export const SizeShowcase: Story = {
  args: {
    symbol: "𓁧",
    difficulty: "expert",
  },
  render: () => (
    <div className="flex items-end gap-4 p-4">
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-medium text-gray-600">Small</span>
        <HieroglyphTile symbol="𓁧" difficulty="expert" size="sm" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-medium text-gray-600">Medium</span>
        <HieroglyphTile symbol="𓁧" difficulty="expert" size="md" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-medium text-gray-600">Large</span>
        <HieroglyphTile symbol="𓁧" difficulty="expert" size="lg" />
      </div>
    </div>
  ),
}

export const InteractiveStates: Story = {
  args: {
    symbol: "𓃯",
    difficulty: "junior",
  },
  render: () => (
    <div className="flex flex-wrap gap-4 p-4">
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-medium text-gray-600">Normal</span>
        <HieroglyphTile symbol="𓃯" difficulty="junior" onClick={() => {}} />
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-medium text-gray-600">Selected</span>
        <HieroglyphTile symbol="𓃯" difficulty="junior" selected onClick={() => {}} />
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-medium text-gray-600">Disabled</span>
        <HieroglyphTile symbol="𓃯" difficulty="junior" disabled />
      </div>
    </div>
  ),
}
