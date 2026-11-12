// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SAVE_EPOCH } from "@/app/saveEpoch"
import { splitChunks } from "./chunks"
import { sealSave } from "./envelope"

const mocks = vi.hoisted(() => ({
  drawCard: vi.fn(),
  imageFromFile: vi.fn(),
  readCard: vi.fn(),
  readGameData: vi.fn(),
  writeGameData: vi.fn(),
}))

vi.mock("./drawCard", () => ({ drawCard: mocks.drawCard, imageFromFile: mocks.imageFromFile }))
vi.mock("./readCard", () => ({ readCard: mocks.readCard }))
vi.mock("@/support/useGameStorage", () => ({
  readGameData: mocks.readGameData,
  writeGameData: mocks.writeGameData,
  useGameStorage: () => [true, vi.fn(), true],
  clearGameData: vi.fn(),
}))
vi.mock("@/app/dev/devToolsBuild", () => ({ DEV_TOOLS: false, DevTools: undefined, LockEditorHost: undefined }))
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) => (options?.count === undefined ? key : `${key}:${options.count}`),
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}))

const { SaveCardTransfer } = await import("./SaveCardTransfer")
const { SettingsModal } = await import("@/app/SettingsModal")

const MIN = 60_000
const save = { saveEpoch: SAVE_EPOCH, journeys: [{ journeyId: "a" }, { journeyId: "b" }] }
const card = async (json: string, stampedAt = Date.now()) => splitChunks(await sealSave(json, stampedAt), 7)

const reload = vi.fn()
const confirm = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  mocks.drawCard.mockResolvedValue(new Blob(["png"], { type: "image/png" }))
  mocks.imageFromFile.mockResolvedValue({ width: 1, height: 1, data: new Uint8ClampedArray(4) })
  mocks.readGameData.mockResolvedValue(save)
  mocks.writeGameData.mockResolvedValue(undefined)
  vi.stubGlobal("location", { ...window.location, reload })
  vi.stubGlobal("confirm", confirm)
  URL.createObjectURL = vi.fn(() => "blob:card")
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  Object.assign(navigator, { share: undefined, canShare: undefined })
})

const makeCard = async () => {
  render(<SaveCardTransfer />)
  fireEvent.click(screen.getByRole("button", { name: "saveCard.make" }))
  await waitFor(() => expect(mocks.drawCard).toHaveBeenCalledTimes(1))
}

const readCardFile = async () => {
  render(<SaveCardTransfer />)
  const file = new File(["jpeg"], "card.jpg", { type: "image/jpeg" })
  fireEvent.change(screen.getByLabelText("saveCard.read"), { target: { files: [file] } })
  await waitFor(() => expect(mocks.readCard).toHaveBeenCalledTimes(1))
}

describe("making a travel card", () => {
  it("shares the card as a PNG file", async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { share, canShare: () => true })

    await makeCard()
    fireEvent.click(await screen.findByRole("button", { name: "saveCard.share" }))

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1))
    const [file] = share.mock.calls[0][0].files as File[]
    expect(file.type).toBe("image/png")
    expect(file.name).toBe("reiskaart.png")
  })

  it("seals a trimmed save into the card", async () => {
    mocks.readGameData.mockResolvedValue({ ...save, puzzleState: { half: "solved" } })

    await makeCard()

    const [chunks, validUntil] = mocks.drawCard.mock.calls[0]
    expect(chunks.length).toBeGreaterThan(0)
    expect(validUntil.getTime() - Date.now()).toBeGreaterThan(14 * MIN)
    expect(validUntil.getTime() - Date.now()).toBeLessThanOrEqual(15 * MIN)
  })

  it("falls back to a download when sharing is not offered", async () => {
    await makeCard()

    const link = await screen.findByRole("link", { name: "saveCard.download" })
    expect(link.getAttribute("download")).toBe("reiskaart.png")
    expect(link.getAttribute("href")).toBe("blob:card")
    expect(screen.queryByRole("button", { name: "saveCard.share" })).toBeNull()
  })

  it("shows nothing when the share sheet is cancelled", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("cancelled", "AbortError"))
    Object.assign(navigator, { share, canShare: () => true })

    await makeCard()
    fireEvent.click(await screen.findByRole("button", { name: "saveCard.share" }))

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole("status")?.textContent ?? "").toBe("")
  })
})

describe("reading a travel card", () => {
  it("replaces the save after confirming", async () => {
    mocks.readCard.mockResolvedValue(await card(JSON.stringify(save)))
    confirm.mockReturnValue(true)

    await readCardFile()

    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1))
    expect(confirm).toHaveBeenCalledWith("saveCard.confirm:2")
    expect(mocks.writeGameData).toHaveBeenCalledTimes(1)
    expect(mocks.writeGameData).toHaveBeenCalledWith(save)
  })

  it("keeps the save when the player says no", async () => {
    mocks.readCard.mockResolvedValue(await card(JSON.stringify(save)))
    confirm.mockReturnValue(false)

    await readCardFile()

    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1))
    expect(mocks.writeGameData).toHaveBeenCalledTimes(0)
    expect(reload).toHaveBeenCalledTimes(0)
  })

  it.each([
    ["no card in the image", async () => undefined, "saveCard.refused.notACard"],
    ["codes that are no save", async () => splitChunks(Uint8Array.of(1, 2, 3), 7), "saveCard.refused.notACard"],
    ["a save that is not JSON", () => card("{ not json"), "saveCard.refused.notACard"],
    ["a save that is no object", () => card("[1, 2]"), "saveCard.refused.notACard"],
    [
      "a save over 2 MB",
      () => card(JSON.stringify({ ...save, pad: "x".repeat(2_100_000) })),
      "saveCard.refused.notACard",
    ],
    [
      "an edited card",
      async () => {
        const chunks = await card(JSON.stringify(save))
        chunks[0][chunks[0].length - 1] ^= 1
        return chunks
      },
      "saveCard.refused.tampered",
    ],
    [
      "a card older than fifteen minutes",
      () => card(JSON.stringify(save), Date.now() - 16 * MIN),
      "saveCard.refused.expired",
    ],
    ["a card from the future", () => card(JSON.stringify(save), Date.now() + 6 * MIN), "saveCard.refused.future"],
    [
      "another save epoch",
      () => card(JSON.stringify({ ...save, saveEpoch: SAVE_EPOCH + 1 })),
      "saveCard.refused.otherEpoch",
    ],
    [
      "a newer game",
      () => card(JSON.stringify({ ...save, storageVersions: { journeys: 999 } })),
      "saveCard.refused.newerGame",
    ],
  ])("names why a card is refused: %s", async (_, cardOf, message) => {
    mocks.readCard.mockResolvedValue(await cardOf())

    await readCardFile()

    expect((await screen.findByRole("status")).textContent).toBe(message)
    expect(confirm).toHaveBeenCalledTimes(0)
    expect(mocks.writeGameData).toHaveBeenCalledTimes(0)
  })

  it("names an unreadable image as no card", async () => {
    mocks.imageFromFile.mockRejectedValue(new Error("decode failed"))
    render(<SaveCardTransfer />)
    fireEvent.change(screen.getByLabelText("saveCard.read"), { target: { files: [new File(["x"], "x.png")] } })

    expect((await screen.findByRole("status")).textContent).toBe("saveCard.refused.notACard")
    expect(mocks.writeGameData).toHaveBeenCalledTimes(0)
  })
})

describe("the settings dialog", () => {
  it("is offered in a release build", () => {
    render(<SettingsModal isOpen onClose={vi.fn()} startGame={vi.fn()} />)

    fireEvent.click(screen.getByRole("button", { name: "saveCard.title" }))

    expect(screen.getByRole("button", { name: "saveCard.make" })).toBeTruthy()
  })
})
