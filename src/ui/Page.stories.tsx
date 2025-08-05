import type { Meta, StoryObj } from "@storybook/react-vite"
import { Page } from "./Page"

const meta = {
  title: "UI/Page",
  component: Page,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    snap: {
      control: "select",
      options: ["start", "center", "end"],
    },
    className: {
      control: "text",
    },
  },
} satisfies Meta<typeof Page>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    snap: "start",
    children: (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-blue-100 to-blue-300">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold text-blue-900">
            Page Content
          </h1>
          <p className="text-xl text-blue-700">This is a snap-start page</p>
        </div>
      </div>
    ),
  },
}

export const SnapCenter: Story = {
  args: {
    snap: "center",
    children: (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-green-100 to-green-300">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold text-green-900">
            Centered Page
          </h1>
          <p className="text-xl text-green-700">This page snaps to center</p>
        </div>
      </div>
    ),
  },
}

export const SnapEnd: Story = {
  args: {
    snap: "end",
    children: (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-purple-100 to-purple-300">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold text-purple-900">End Page</h1>
          <p className="text-xl text-purple-700">This page snaps to end</p>
        </div>
      </div>
    ),
  },
}

export const WithCustomClass: Story = {
  args: {
    snap: "start",
    className: "border-4 border-red-500",
    children: (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-red-100 to-red-300">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold text-red-900">
            Custom Styled Page
          </h1>
          <p className="text-xl text-red-700">
            This page has a custom red border
          </p>
        </div>
      </div>
    ),
  },
}

export const GameLayout: Story = {
  args: {
    snap: "center",
    children: (
      <div className="flex h-screen w-full flex-col bg-amber-50">
        {/* Header */}
        <div className="border-b-2 border-amber-400 bg-amber-200 p-4">
          <h1 className="text-center text-2xl font-bold text-amber-900">
            Pyramid Game
          </h1>
        </div>

        {/* Game Content */}
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="rounded-lg bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-bold">Game Area</h2>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 16 }, (_, i) => (
                <div
                  key={i}
                  className="flex h-12 w-12 items-center justify-center rounded border border-amber-400 bg-amber-200"
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-amber-400 bg-amber-200 p-4">
          <p className="text-center text-amber-800">
            Game controls would go here
          </p>
        </div>
      </div>
    ),
  },
}

export const ScrollContainer: Story = {
  args: {
    snap: "start",
    children: null,
  },
  render: () => (
    <div className="flex h-screen snap-x snap-mandatory overflow-x-auto">
      <Page snap="start">
        <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-blue-100 to-blue-300">
          <div className="text-center">
            <h1 className="mb-4 text-4xl font-bold text-blue-900">Page 1</h1>
            <p className="text-xl text-blue-700">Snap Start</p>
          </div>
        </div>
      </Page>
      <Page snap="center">
        <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-green-100 to-green-300">
          <div className="text-center">
            <h1 className="mb-4 text-4xl font-bold text-green-900">Page 2</h1>
            <p className="text-xl text-green-700">Snap Center</p>
          </div>
        </div>
      </Page>
      <Page snap="end">
        <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-purple-100 to-purple-300">
          <div className="text-center">
            <h1 className="mb-4 text-4xl font-bold text-purple-900">Page 3</h1>
            <p className="text-xl text-purple-700">Snap End</p>
          </div>
        </div>
      </Page>
    </div>
  ),
}
