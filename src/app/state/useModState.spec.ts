import { describe, it, expect, vi } from "vitest"

const useGameStorageMock = vi.fn((_key: string, initial: unknown) => [initial, vi.fn()])
const latestGameValueMock = vi.fn((_key: string) => undefined as unknown)
const primeGameValueMock = vi.fn(async (_key: string) => undefined as unknown)
vi.mock("@/support/useGameStorage", () => ({
  useGameStorage: useGameStorageMock,
  latestGameValue: latestGameValueMock,
  primeGameValue: primeGameValueMock,
}))

const { useModState, readModState, primeModState } = await import("./useModState")

describe("useModState", () => {
  it("namespaces the storage key by modId", () => {
    useModState("shop", { stockByEdge: {} })
    expect(useGameStorageMock).toHaveBeenCalledWith("pyramid-scheme-mod-shop", { stockByEdge: {} })
  })

  it("uses a distinct key per modId", () => {
    useModState("trap", { foo: 1 })
    expect(useGameStorageMock).toHaveBeenCalledWith("pyramid-scheme-mod-trap", { foo: 1 })
  })
})

// A mod seam that core calls while rendering cannot await a hook, so it reads the slice straight from the
// store. Same key, or it would answer for a slice nobody writes.
describe("the same slice read outside React", () => {
  it("reads the key the hook writes", () => {
    readModState("witnessDoor")
    expect(latestGameValueMock).toHaveBeenCalledWith("pyramid-scheme-mod-witnessDoor")
  })

  it("loads that key on request", async () => {
    await primeModState("witnessDoor")
    expect(primeGameValueMock).toHaveBeenCalledWith("pyramid-scheme-mod-witnessDoor")
  })
})
