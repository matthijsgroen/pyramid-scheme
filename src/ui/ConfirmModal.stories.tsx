import type { Meta, StoryObj } from "@storybook/react-vite"
import { ConfirmModal } from "./ConfirmModal"

const meta = {
  title: "UI/ConfirmModal",
  component: ConfirmModal,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    isOpen: {
      control: "boolean",
    },
    title: {
      control: "text",
    },
    message: {
      control: "text",
    },
    confirmText: {
      control: "text",
    },
    cancelText: {
      control: "text",
    },
    confirmButtonClass: {
      control: "text",
    },
  },
} satisfies Meta<typeof ConfirmModal>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    isOpen: true,
    title: "Confirm Action",
    message: "Are you sure you want to perform this action?",
    confirmText: "Confirm",
    cancelText: "Cancel",
    onConfirm: () => console.log("Confirmed"),
    onCancel: () => console.log("Cancelled"),
  },
}

export const DeleteAction: Story = {
  args: {
    isOpen: true,
    title: "Delete Item",
    message:
      "Are you sure you want to delete this item? This action cannot be undone.",
    confirmText: "Delete",
    cancelText: "Cancel",
    confirmButtonClass: "bg-red-600 hover:bg-red-700",
    onConfirm: () => console.log("Deleted"),
    onCancel: () => console.log("Cancelled"),
  },
}

export const SaveAction: Story = {
  args: {
    isOpen: true,
    title: "Save Changes",
    message: "Do you want to save your changes before leaving?",
    confirmText: "Save",
    cancelText: "Discard",
    confirmButtonClass: "bg-green-600 hover:bg-green-700",
    onConfirm: () => console.log("Saved"),
    onCancel: () => console.log("Discarded"),
  },
}

export const LongMessage: Story = {
  args: {
    isOpen: true,
    title: "Important Notice",
    message:
      "This is a very long message that explains in detail what will happen when you confirm this action. It might span multiple lines and should be displayed properly in the modal without breaking the layout.",
    confirmText: "I Understand",
    cancelText: "Cancel",
    onConfirm: () => console.log("Understood"),
    onCancel: () => console.log("Cancelled"),
  },
}

export const Closed: Story = {
  args: {
    isOpen: false,
    title: "Hidden Modal",
    message: "This modal is not visible",
    confirmText: "Confirm",
    cancelText: "Cancel",
    onConfirm: () => console.log("Confirmed"),
    onCancel: () => console.log("Cancelled"),
  },
}

export const WithCustomMessage: Story = {
  args: {
    isOpen: true,
    title: "Reset Game Progress",
    message: (
      <div>
        <p className="mb-2">You are about to reset all game progress.</p>
        <p className="mb-2 font-semibold text-red-600">This will:</p>
        <ul className="list-disc pl-4">
          <li>Delete all saved games</li>
          <li>Reset journey progress</li>
          <li>Clear collected treasures</li>
        </ul>
      </div>
    ),
    confirmText: "Reset Everything",
    cancelText: "Keep Progress",
    confirmButtonClass: "bg-red-600 hover:bg-red-700",
    onConfirm: () => console.log("Reset confirmed"),
    onCancel: () => console.log("Reset cancelled"),
  },
}
