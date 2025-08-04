import type { Meta, StoryObj } from "@storybook/react"
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
      <div className="w-full h-screen bg-gradient-to-br from-blue-100 to-blue-300 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-blue-900 mb-4">
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
      <div className="w-full h-screen bg-gradient-to-br from-green-100 to-green-300 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-green-900 mb-4">
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
      <div className="w-full h-screen bg-gradient-to-br from-purple-100 to-purple-300 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-purple-900 mb-4">End Page</h1>
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
      <div className="w-full h-screen bg-gradient-to-br from-red-100 to-red-300 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-900 mb-4">
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
      <div className="w-full h-screen bg-amber-50 flex flex-col">
        {/* Header */}
        <div className="bg-amber-200 p-4 border-b-2 border-amber-400">
          <h1 className="text-2xl font-bold text-amber-900 text-center">
            Pyramid Game
          </h1>
        </div>

        {/* Game Content */}
        <div className="flex-1 p-4 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Game Area</h2>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 16 }, (_, i) => (
                <div
                  key={i}
                  className="w-12 h-12 bg-amber-200 border border-amber-400 rounded flex items-center justify-center"
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-amber-200 p-4 border-t-2 border-amber-400">
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
    <div className="h-screen overflow-x-auto snap-x snap-mandatory flex">
      <Page snap="start">
        <div className="w-full h-screen bg-gradient-to-br from-blue-100 to-blue-300 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-blue-900 mb-4">Page 1</h1>
            <p className="text-xl text-blue-700">Snap Start</p>
          </div>
        </div>
      </Page>
      <Page snap="center">
        <div className="w-full h-screen bg-gradient-to-br from-green-100 to-green-300 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-green-900 mb-4">Page 2</h1>
            <p className="text-xl text-green-700">Snap Center</p>
          </div>
        </div>
      </Page>
      <Page snap="end">
        <div className="w-full h-screen bg-gradient-to-br from-purple-100 to-purple-300 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-purple-900 mb-4">Page 3</h1>
            <p className="text-xl text-purple-700">Snap End</p>
          </div>
        </div>
      </Page>
    </div>
  ),
}
