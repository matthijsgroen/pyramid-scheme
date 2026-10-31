import { describe, expect, it } from "vitest"
import type { CampArt } from "@/ui/atoms/campScene/campArt"
import { partIconFrom } from "./campIcons"

const art =
  (layers: Record<string, string>, steps: Record<string, string>) =>
  (id: string, layer = false): CampArt | undefined => {
    const url = (layer ? layers : steps)[id]
    return url ? { url } : undefined
  }

describe("partIconFrom", () => {
  const icons = new Map([["hut-poles", { url: "/hut-poles.webp" }]])

  it("uses the part's own icon when it is painted", () => {
    expect(partIconFrom(icons, art({ hut: "/layer" }, {}), "hut", "poles")).toBe("/hut-poles.webp")
  })
  it("falls back to the structure's layer art, then its step art", () => {
    expect(partIconFrom(icons, art({ hut: "/layer" }, { hut: "/step" }), "hut", "cloth")).toBe("/layer")
    expect(partIconFrom(icons, art({}, { hut: "/step" }), "hut", "cloth")).toBe("/step")
  })
  it("is undefined with no art at all", () => {
    expect(partIconFrom(icons, art({}, {}), "hut", "cloth")).toBeUndefined()
  })
})
