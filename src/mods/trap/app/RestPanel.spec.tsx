// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render, screen } from "@testing-library/react"
import { clearGameData, writeGameData } from "@/support/useGameStorage"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

const { RestPanel } = await import("./RestPanel")
const { summariseWaterskins } = await import("./haulLines")

beforeEach(async () => {
  await clearGameData()
})
afterEach(cleanup)

describe("RestPanel", () => {
  it("shows full hearts even when the stored health is low", async () => {
    await writeGameData({ "pyramid-scheme-mod-trap": { health: 1 } })
    await act(async () => void render(<RestPanel />))
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe("Health: 6 of 6 half-hearts")
    expect(screen.getByText("trap.rested")).toBeTruthy()
  })
})

describe("trap haul lines", () => {
  it("gives no line for a waterskin", () => {
    expect(summariseWaterskins()).toEqual([])
  })
})
