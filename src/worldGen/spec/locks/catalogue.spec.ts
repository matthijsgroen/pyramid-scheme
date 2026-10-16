import { describe, expect, it } from "vitest"
import { LESSONS, LOCK_CATALOGUE } from "@/game/lockCatalogue"
import { catalogueLock } from "./catalogue"

const finished = (catalogue: typeof LESSONS) =>
  Object.entries(catalogue).filter(([, parsed]) => parsed.refused.length === 0 && parsed.drafts.length === 0)

describe("catalogueLock", () => {
  it("reads a lesson by its path under the locks folder", () => {
    for (const [name, parsed] of finished(LESSONS)) expect(catalogueLock(`lessons/${name}`)).toBe(parsed.lock)
  })

  it("reads a lock by its bare name", () => {
    for (const [name, parsed] of finished(LOCK_CATALOGUE)) expect(catalogueLock(name)).toBe(parsed.lock)
  })

  it("names a lock the folder does not hold", () => {
    expect(() => catalogueLock("lessons/noSuchLesson")).toThrow("no lock lessons/noSuchLesson in src/game/locks")
  })
})
