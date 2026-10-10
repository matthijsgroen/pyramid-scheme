import { describe, expect, it } from "vitest"
import { START_LOCK, decodeLockHash, encodeLockHash } from "./lockEditorUrl"
import { parseLock } from "@/game/lockNotation"
import { lockChecks } from "@/game/lockChecks"

describe("the lock link", () => {
  it("reads back exactly the text it was made from, whatever characters it holds", () => {
    const text = "in -[A+B:off]- out // 100% #1 & more\nA toggle @in\n\n  ünï ✓"
    expect(decodeLockHash(encodeLockHash(text))).toBe(text)
  })

  it("keeps a newline and a hash sign out of the raw hash", () => {
    const hash = encodeLockHash("a\n#b")
    expect(hash.slice(1)).not.toMatch(/[\n#]/)
  })

  it("is null for a hash that is not a lock link or is damaged", () => {
    expect(decodeLockHash("")).toBeNull()
    expect(decodeLockHash("#other=1")).toBeNull()
    expect(decodeLockHash("#lock=%E0%A4%A")).toBeNull()
  })

  it("starts from a lock that compiles and is sound", () => {
    expect(lockChecks(parseLock(START_LOCK)).sound).toBe(true)
  })
})
