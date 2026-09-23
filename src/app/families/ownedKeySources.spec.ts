import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  registerOwnedKeySource,
  ownedKeysFromSources,
  ownedKeysChanged,
  ownedKeysRevision,
  subscribeOwnedKeys,
  __resetOwnedKeySources,
} from "./ownedKeySources"

const ctx = { journeyId: "junior_2", levelNr: 3, floorIndex: 0 }

describe("owned key sources", () => {
  beforeEach(() => __resetOwnedKeySources())

  it("is empty when nothing is registered", () => {
    expect([...ownedKeysFromSources(ctx)]).toEqual([])
  })

  it("unions every registered source", () => {
    registerOwnedKeySource("a", () => new Set(["witness:east"]))
    registerOwnedKeySource("b", () => new Set(["witness:north"]))
    expect([...ownedKeysFromSources(ctx)].sort()).toEqual(["witness:east", "witness:north"])
  })

  it("passes the floor's context to each source", () => {
    registerOwnedKeySource("c", c => new Set([`${c.journeyId}#${c.levelNr}#${c.floorIndex}`]))
    expect([...ownedKeysFromSources(ctx)]).toEqual(["junior_2#3#0"])
  })

  it("replaces a source registered twice under one id", () => {
    registerOwnedKeySource("a", () => new Set(["old"]))
    registerOwnedKeySource("a", () => new Set(["new"]))
    expect([...ownedKeysFromSources(ctx)]).toEqual(["new"])
  })
})

// A source is a plain function over its mod's own state, so a screen cannot depend on it directly. This
// is the signal it watches instead — see SiteMapScreen's mintedKeys.
describe("the signal that a source would answer differently", () => {
  it("moves the revision, so a memo keyed on it is recomputed", () => {
    const before = ownedKeysRevision()
    ownedKeysChanged()
    expect(ownedKeysRevision()).toBeGreaterThan(before)
  })

  it("reaches every subscriber, including on a source registering late", () => {
    const told = vi.fn()
    subscribeOwnedKeys(told)
    registerOwnedKeySource("late", () => new Set(["witness:east"]))
    expect(told).toHaveBeenCalled()
  })

  it("stops reaching one that has unsubscribed", () => {
    const told = vi.fn()
    subscribeOwnedKeys(told)()
    ownedKeysChanged()
    expect(told).not.toHaveBeenCalled()
  })
})
