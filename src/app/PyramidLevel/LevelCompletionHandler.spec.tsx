// @vitest-environment jsdom
import { render, cleanup } from "@testing-library/react"
import { describe, expect, it, vi, afterEach, beforeEach } from "vitest"
import { FezContext } from "@/app/fez/context"
import { listenForPageLayers } from "@/app/input/pageLayers"
import { press } from "@/app/input/controlsInARow.testing"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

// The overlay is another component's business; stand it in so this spec is about what this one mounts.
vi.mock("./LevelCompletedOverlay", () => ({
  LevelCompletedOverlay: () => <div data-testid="level-completed-overlay" />,
}))
const { LevelCompletionHandler } = await import("./LevelCompletionHandler")

const renderHandler = (onCompletionFinished = vi.fn()) =>
  render(
    <FezContext value={{ showConversation: vi.fn() }}>
      <LevelCompletionHandler onCompletionFinished={onCompletionFinished} />
    </FezContext>
  )

let stop = () => {}
beforeEach(() => {
  stop = listenForPageLayers()
})
afterEach(() => {
  cleanup()
  stop()
})

// The contract a later change could break: the overlay is up as soon as this mounts.
describe("LevelCompletionHandler", () => {
  it("shows the completion overlay on its first render", () => {
    const { queryByTestId } = renderHandler()
    expect(queryByTestId("level-completed-overlay")).not.toBeNull()
  })

  it("goes on with Escape, as with a tap", () => {
    const onFinished = vi.fn()
    renderHandler(onFinished)
    press("Escape")
    expect(onFinished).toHaveBeenCalledTimes(1)
  })
})
