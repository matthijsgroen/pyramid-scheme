// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const load = async () => {
  vi.resetModules()
  const { clearGameData, latestGameValue, writeGameData } = await import("@/support/useGameStorage")
  const { ComingHome } = await import("./ComingHome")
  const { registerHaulLines } = await import("./haulLines")
  const { registerHomecomingPanel } = await import("@/app/homecomingRegistry")
  return { ComingHome, registerHaulLines, registerHomecomingPanel, clearGameData, latestGameValue, writeGameData }
}

const bead = { type: "bead", name: "blue" }

afterEach(cleanup)

describe("ComingHome", () => {
  it("shows what the summariser makes of the haul, and unpacking empties it before calling onDone", async () => {
    const { ComingHome, registerHaulLines, clearGameData, writeGameData, latestGameValue } = await load()
    await clearGameData()
    await writeGameData({ homecoming: { version: 1, haul: [bead, bead] } })
    registerHaulLines(() => ({
      bead: rewards => [{ key: "beads", visual: null, title: `${rewards.length} beads`, isNew: true }],
    }))
    const onDone = vi.fn()
    render(<ComingHome onDone={onDone} />)

    expect(await screen.findByText("2 beads")).toBeTruthy()
    expect(screen.getByText("camp.comingHome.new")).toBeTruthy()
    expect(screen.getByText("camp.comingHome.haulTitle")).toBeTruthy()

    await act(async () => fireEvent.click(screen.getByText("camp.comingHome.unpack")))

    expect(onDone).toHaveBeenCalledOnce()
    expect(latestGameValue("homecoming")).toEqual({ version: 1, haul: [] })
  })

  it("says loot came home unless every line only tells news", async () => {
    const { ComingHome, registerHaulLines, clearGameData, writeGameData } = await load()
    await clearGameData()
    await writeGameData({ homecoming: { version: 1, haul: [bead, { type: "tale" }] } })
    registerHaulLines(() => ({
      bead: () => [{ key: "beads", visual: null, title: "beads" }],
      tale: () => [{ key: "tale", visual: null, title: "a tale", news: true }],
    }))
    const onDone = vi.fn()
    render(<ComingHome onDone={onDone} />)
    const unpack = await screen.findByText("camp.comingHome.unpack")
    await act(async () => fireEvent.click(unpack))
    expect(onDone).toHaveBeenCalledWith(true)
  })

  it("says no loot came home when the haul only tells news, though it is shown and unpacked", async () => {
    const { ComingHome, registerHaulLines, clearGameData, writeGameData, latestGameValue } = await load()
    await clearGameData()
    await writeGameData({ homecoming: { version: 1, haul: [{ type: "tale" }] } })
    registerHaulLines(() => ({ tale: () => [{ key: "tale", visual: null, title: "a tale", news: true }] }))
    const onDone = vi.fn()
    render(<ComingHome onDone={onDone} />)
    expect(await screen.findByText("a tale")).toBeTruthy()
    await act(async () => fireEvent.click(screen.getByText("camp.comingHome.unpack")))
    expect(onDone).toHaveBeenCalledWith(false)
    expect(latestGameValue("homecoming")).toEqual({ version: 1, haul: [] })
  })

  it("offers only the way back to the camp when the haul is empty", async () => {
    const { ComingHome, clearGameData } = await load()
    await clearGameData()
    const onDone = vi.fn()
    render(<ComingHome onDone={onDone} />)

    await screen.findByText("camp.comingHome.toCamp")
    expect(screen.queryByText("camp.comingHome.haulTitle")).toBeNull()
    expect(screen.queryByText("camp.comingHome.unpack")).toBeNull()
    await act(async () => fireEvent.click(screen.getByText("camp.comingHome.toCamp")))
    expect(onDone).toHaveBeenCalledOnce()
  })

  it("renders a registered rest panel", async () => {
    const { ComingHome, registerHomecomingPanel, clearGameData } = await load()
    await clearGameData()
    registerHomecomingPanel({ id: "made-up", order: 1, Component: () => <p>rested</p> })
    render(<ComingHome onDone={() => {}} />)

    expect(await screen.findByText("rested")).toBeTruthy()
  })

  it("keeps a haul it did not show when leaving by Naar het kamp", async () => {
    const { ComingHome, clearGameData, writeGameData, latestGameValue } = await load()
    await clearGameData()
    await writeGameData({ homecoming: { version: 1, haul: [bead] } })
    const onDone = vi.fn()
    render(<ComingHome onDone={onDone} />)

    const button = await screen.findByText("camp.comingHome.toCamp")
    await act(async () => fireEvent.click(button))

    expect(onDone).toHaveBeenCalledOnce()
    expect(latestGameValue("homecoming")).toEqual({ version: 1, haul: [bead] })
  })

  it("offers no button before the save is read", async () => {
    const { ComingHome, clearGameData, writeGameData } = await load()
    await clearGameData()
    await writeGameData({ homecoming: { version: 1, haul: [bead] } })
    render(<ComingHome onDone={() => {}} />)

    expect(screen.queryByRole("button")).toBeNull()
    expect(await screen.findByRole("button")).toBeTruthy()
  })
})
