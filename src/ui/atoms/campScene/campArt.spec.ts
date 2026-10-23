import { describe, expect, it } from "vitest"
import { groupCampArt } from "./campArt"

describe("groupCampArt", () => {
  const art = groupCampArt({
    "../assets/camp/box.webp": "/box.webp",
    "../assets/camp/box-shadow.webp": "/box-shadow.webp",
    "../assets/camp/flame.webp": "/flame.webp",
    "../assets/camp/flame-b.webp": "/flame-b.webp",
    "../assets/camp/sand.png": "/sand.png",
  })

  it("lists a piece once, with its shadow and second frame beside it", () => {
    expect([...art.keys()].sort()).toEqual(["box", "flame", "sand"])
    expect(art.get("box")).toEqual({ url: "/box.webp", shadow: "/box-shadow.webp" })
    expect(art.get("flame")).toEqual({ url: "/flame.webp", frameB: "/flame-b.webp" })
    expect(art.get("sand")).toEqual({ url: "/sand.png" })
  })

  it("lists no piece for a shadow or second frame whose piece has no art", () => {
    const orphans = groupCampArt({ "x/ghost-shadow.webp": "/a", "x/ghost-b.webp": "/b" })
    expect(orphans.size).toBe(0)
  })
})
