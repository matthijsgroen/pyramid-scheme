import { describe, it, expect } from "vitest"
import { registerFamily, getFamilyPlugin, allFamilies, resolveFamilyByIdOrTag } from "./familyRegistry"

const stubMeta = (id: string, tags: string[]) => ({
  id,
  ownerMod: "test",
  tags,
  icon: "?",
  color: "gray",
  rewardPriority: 0,
})
const stubPlugin = (id: string, tags: string[]) => ({
  meta: stubMeta(id, tags),
  generate: () => undefined,
  Component: () => null,
})

describe("familyRegistry", () => {
  it("registers a family and retrieves it by id", () => {
    registerFamily(stubPlugin("test-family-a", ["testTagA"]))
    expect(getFamilyPlugin("test-family-a")?.meta.tags).toEqual(["testTagA"])
  })

  it("returns undefined for an unregistered id", () => {
    expect(getFamilyPlugin("neverRegistered")).toBeUndefined()
  })

  it("allFamilies lists every registered family", () => {
    registerFamily(stubPlugin("test-family-b", ["testTagB"]))
    expect(allFamilies().some(f => f.meta.id === "test-family-b")).toBe(true)
  })

  it("resolveFamilyByIdOrTag resolves an exact id directly", () => {
    expect(resolveFamilyByIdOrTag("test-family-a")?.meta.id).toBe("test-family-a")
  })

  it("resolveFamilyByIdOrTag resolves a tag to the first-registered matching family", () => {
    registerFamily(stubPlugin("test-family-c", ["sharedTag"]))
    registerFamily(stubPlugin("test-family-d", ["sharedTag"]))
    expect(resolveFamilyByIdOrTag("sharedTag")?.meta.id).toBe("test-family-c")
  })

  it("resolveFamilyByIdOrTag returns undefined when nothing matches", () => {
    expect(resolveFamilyByIdOrTag("noSuchTagOrId")).toBeUndefined()
  })

  it("registering the same id again overwrites the previous entry", () => {
    registerFamily(stubPlugin("test-family-a", ["replaced"]))
    expect(getFamilyPlugin("test-family-a")?.meta.tags).toEqual(["replaced"])
  })
})
