import { describe, it, expect, beforeEach } from "vitest"
import { registerOwnedKeySource, ownedKeysFromSources, __resetOwnedKeySources } from "./ownedKeySources"

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
