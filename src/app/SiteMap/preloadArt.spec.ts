import { afterEach, describe, expect, it, vi } from "vitest"
import { forgetPreloadedArt, preloadArt } from "./preloadArt"

afterEach(forgetPreloadedArt)

describe("preloadArt", () => {
  it("loads each url once, however often a board asks", () => {
    const load = vi.fn((_url: string) => Promise.resolve())
    preloadArt(["a.png", "b.png"], load)
    preloadArt(["b.png", "c.png", "a.png"], load)
    expect(load.mock.calls.map(([url]) => url)).toEqual(["a.png", "b.png", "c.png"])
  })

  it("swallows a load that rejects or throws, and does not ask again", async () => {
    const rejects = vi.fn((_url: string) => Promise.reject(new Error("404")))
    const throws = vi.fn((_url: string): Promise<unknown> => {
      throw new Error("no Image")
    })
    expect(() => preloadArt(["gone.png"], rejects)).not.toThrow()
    expect(() => preloadArt(["odd.png"], throws)).not.toThrow()
    preloadArt(["gone.png", "odd.png"], rejects)
    expect(rejects).toHaveBeenCalledTimes(1)
    await Promise.resolve()
  })
})
