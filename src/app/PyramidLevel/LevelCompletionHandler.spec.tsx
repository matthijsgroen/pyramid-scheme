// @vitest-environment jsdom
import { render, cleanup } from "@testing-library/react"
import { describe, expect, it, vi, afterEach } from "vitest"
import { FezContext } from "@/app/fez/context"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

// The overlay is another component's business; stand it in so this spec is about what this one mounts.
vi.mock("./LevelCompletedOverlay", () => ({
  LevelCompletedOverlay: () => <div data-testid="level-completed-overlay" />,
}))
const { LevelCompletionHandler } = await import("./LevelCompletionHandler")

const renderHandler = () =>
  render(
    <FezContext value={{ showConversation: vi.fn() }}>
      <LevelCompletionHandler onCompletionFinished={vi.fn()} />
    </FezContext>
  )

afterEach(cleanup)

// The contract a later change could break: the overlay is up as soon as this mounts.
describe("LevelCompletionHandler", () => {
  it("shows the completion overlay on its first render", () => {
    const { queryByTestId } = renderHandler()
    expect(queryByTestId("level-completed-overlay")).not.toBeNull()
  })
})
