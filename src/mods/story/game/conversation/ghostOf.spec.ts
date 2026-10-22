import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { ghostOf } from "./ghostOf"

const en = JSON.parse(readFileSync("public/locales/en/fez.json", "utf8"))
const hasLine = (key: string) =>
  typeof key.split(".").reduce<unknown>((at, part) => (at as Record<string, unknown>)?.[part], en) === "string"

describe(ghostOf, () => {
  it("finds the ghost who speaks in a tomb scene, whoever speaks first", () => {
    expect(ghostOf("tomb.starter", hasLine)).toBe("ipi")
    expect(ghostOf("tomb.junior", hasLine)).toBe("henut")
    expect(ghostOf("tomb.expert", hasLine)).toBe("priest")
    expect(ghostOf("tomb.master", hasLine)).toBe("pharaoh")
    expect(ghostOf("tomb.wizard", hasLine)).toBe("priest")
  })

  it("puts nobody in a room only the living speak in", () => {
    expect(ghostOf("tomb.expertB", hasLine)).toBeUndefined()
    expect(ghostOf("meeting.starter_1", hasLine)).toBeUndefined()
  })

  it("reads the speaker off the lines, so a made-up scene shows its own ghost", () => {
    const lines: Record<string, true> = { "x.1.fez": true, "x.2.henut": true }
    expect(ghostOf("x", key => lines[key] === true)).toBe("henut")
  })
})
