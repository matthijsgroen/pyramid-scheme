import { describe, it, expect, vi } from "vitest"

const useGameStorageMock = vi.fn((_key: string, initial: unknown) => [initial, vi.fn()])
vi.mock("@/support/useGameStorage", () => ({ useGameStorage: useGameStorageMock }))

const { useModState } = await import("./useModState")

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
