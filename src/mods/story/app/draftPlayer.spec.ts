import { describe, expect, it, vi } from "vitest"
import { draftGrants } from "./draftPlayer"

const drafts = { north: ["n.one", "n.two"], south: ["s.one"] }

describe("develop-mode story drafts", () => {
  it("offers one grant per area, kept out of Unlock everything", () => {
    const grants = draftGrants(drafts, vi.fn())

    expect(grants).toHaveLength(2)
    expect(grants.every(g => g.inUnlockEverything === false)).toBe(true)
  })

  it("offers an area's ids in order as unrecorded forced replays", () => {
    const show = vi.fn()

    draftGrants(drafts, show)[0].grant()

    expect(show.mock.calls).toEqual([
      ["n.one", undefined, { forceReplay: true, story: true, unrecorded: true }],
      ["n.two", undefined, { forceReplay: true, story: true, unrecorded: true }],
    ])
  })
})
