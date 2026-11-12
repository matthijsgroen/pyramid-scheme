import { describe, expect, it } from "vitest"
import { joinChunks, splitChunks } from "./chunks"

const payload = Uint8Array.from({ length: 10_813 }, (_, i) => (i * 31 + 7) % 256)

describe("save card chunks", () => {
  it("splits and joins in any order", () => {
    const chunks = splitChunks(payload, 0xbeef)
    expect(chunks).toHaveLength(4)
    chunks.forEach(chunk => expect(chunk.length).toBeLessThanOrEqual(2_904))
    const shuffled = [chunks[2], chunks[0], chunks[3], chunks[1]]
    expect(joinChunks(shuffled)).toEqual(payload)
  })

  it("refuses a missing or foreign chunk", () => {
    const chunks = splitChunks(payload, 1)
    expect(joinChunks(chunks.slice(1))).toBeUndefined()
    const foreign = splitChunks(payload, 2)
    expect(joinChunks([chunks[0], foreign[1], chunks[2], chunks[3]])).toBeUndefined()
  })

  it("refuses a duplicate index", () => {
    const chunks = splitChunks(payload, 1)
    expect(joinChunks([chunks[0], chunks[0], chunks[2], chunks[3]])).toBeUndefined()
  })
})
