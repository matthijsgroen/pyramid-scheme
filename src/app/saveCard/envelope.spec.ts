// @vitest-environment node
import { describe, expect, it } from "vitest"
import { openSave, sealSave } from "./envelope"

const json = JSON.stringify({ hello: "pyramid", n: [1, 2, 3] })
const t = 1_800_000_000_000
const MIN = 60_000

describe("save card envelope", () => {
  it("seals and opens a save within the window", async () => {
    expect(await openSave(await sealSave(json, t), t + 14 * MIN)).toEqual({
      ok: true,
      json,
      stampedAt: t,
    })
  })

  it("refuses a card older than fifteen minutes", async () => {
    const sealed = await sealSave(json, t)
    expect(await openSave(sealed, t + 15 * MIN)).toMatchObject({ ok: true })
    expect(await openSave(sealed, t + 15 * MIN + 1)).toEqual({
      ok: false,
      reason: "expired",
    })
  })

  it("accepts five minutes of clock skew, not more", async () => {
    const sealed = await sealSave(json, t)
    expect(await openSave(sealed, t - 5 * MIN)).toMatchObject({ ok: true })
    expect(await openSave(sealed, t - 5 * MIN - 1)).toEqual({
      ok: false,
      reason: "future",
    })
  })

  it("refuses a changed timestamp", async () => {
    const sealed = await sealSave(json, t)
    sealed[8] ^= 1
    expect(await openSave(sealed, t)).toEqual({
      ok: false,
      reason: "tampered",
    })
  })

  it("refuses a changed payload", async () => {
    const sealed = await sealSave(json, t)
    sealed[sealed.length - 1] ^= 1
    expect(await openSave(sealed, t)).toEqual({
      ok: false,
      reason: "tampered",
    })
  })

  it("refuses bytes that are not a card", async () => {
    expect(await openSave(new Uint8Array([1, 2, 3]), t)).toEqual({
      ok: false,
      reason: "notASave",
    })
  })
})
