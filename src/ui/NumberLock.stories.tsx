import type { Meta, StoryObj } from "@storybook/react-vite"
import { NumberLock } from "./NumberLock"
import { useState } from "react"

const meta = {
  title: "UI/NumberLock",
  component: NumberLock,
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
    state: {
      control: "select",
      options: ["empty", "error", "open"],
      description: "Visual state of the lock",
    },
    value: {
      control: "text",
      description: "Current value in the input",
    },
    disabled: {
      control: "boolean",
      description: "Whether the lock is disabled",
    },
    placeholder: {
      control: "text",
      description: "Placeholder text for the input",
    },
    maxLength: {
      control: "number",
      description: "Maximum number of characters allowed",
    },
    onChange: {
      action: "changed",
      description: "Called when input value changes",
    },
    onSubmit: {
      action: "submitted",
      description: "Called when Enter is pressed",
    },
  },
} satisfies Meta<typeof NumberLock>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {
  args: {
    state: "empty",
    placeholder: "Enter code",
    maxLength: 4,
  },
}

export const Error: Story = {
  args: {
    state: "error",
    value: "1234",
    placeholder: "Enter code",
    maxLength: 4,
  },
}

export const Open: Story = {
  args: {
    state: "open",
    value: "7531",
    placeholder: "Enter code",
    maxLength: 4,
  },
}

export const Disabled: Story = {
  args: {
    state: "empty",
    disabled: true,
    placeholder: "Enter code",
    maxLength: 4,
  },
}

export const CustomLength: Story = {
  args: {
    state: "empty",
    placeholder: "6-digit code",
    maxLength: 6,
  },
}

// Interactive story that demonstrates state transitions
export const Interactive: Story = {
  args: {
    placeholder: "Try 1337",
    maxLength: 4,
  },
  render: (args) => {
    const InteractiveNumberLock = () => {
      const [value, setValue] = useState("")
      const [state, setState] = useState<"empty" | "error" | "open">("empty")
      const correctCode = "1337"

      const handleChange = (newValue: string) => {
        setValue(newValue)
        if (state !== "empty") {
          setState("empty")
        }
      }

      const handleSubmit = (submittedValue: string) => {
        if (submittedValue === correctCode) {
          setState("open")
        } else {
          setState("error")
          // Reset to empty after 2 seconds
          setTimeout(() => {
            setState("empty")
            setValue("")
          }, 2000)
        }
      }

      return (
        <div className="flex flex-col items-center gap-4">
          <NumberLock
            {...args}
            value={value}
            state={state}
            onChange={handleChange}
            onSubmit={handleSubmit}
          />
          <div className="text-center text-sm text-gray-600">
            <p>
              Try entering the code: <strong>1337</strong>
            </p>
            <p>Press Enter to submit</p>
          </div>
        </div>
      )
    }

    return <InteractiveNumberLock />
  },
}

// Different states showcase
export const StatesShowcase: Story = {
  render: () => (
    <div className="flex flex-wrap gap-8 p-4">
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-medium text-gray-600">Empty</span>
        <NumberLock state="empty" placeholder="Enter code" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-medium text-gray-600">With Value</span>
        <NumberLock state="empty" value="123" placeholder="Enter code" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-medium text-gray-600">Error</span>
        <NumberLock state="error" value="9999" placeholder="Enter code" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-medium text-gray-600">Open</span>
        <NumberLock state="open" value="1337" placeholder="Enter code" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-medium text-gray-600">Disabled</span>
        <NumberLock state="empty" disabled placeholder="Enter code" />
      </div>
    </div>
  ),
}

// Different lengths showcase
export const LengthVariations: Story = {
  render: () => (
    <div className="flex flex-wrap gap-8 p-4">
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-medium text-gray-600">3 digits</span>
        <NumberLock state="empty" maxLength={3} placeholder="PIN" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-medium text-gray-600">4 digits</span>
        <NumberLock state="empty" maxLength={4} placeholder="Code" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-medium text-gray-600">6 digits</span>
        <NumberLock state="empty" maxLength={6} placeholder="Security" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-medium text-gray-600">8 digits</span>
        <NumberLock state="empty" maxLength={8} placeholder="Password" />
      </div>
    </div>
  ),
}
