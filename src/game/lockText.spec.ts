import { describe, expect, it } from "vitest"
import { parseLock } from "./lockText"
import { LOCK_CATALOGUE, seesaw, twoLamps } from "./lockCatalogue"

describe("parseLock", () => {
  it("reads gates, rest sides, drops, corridors, keys and appetites", () => {
    const lock = parseLock(`
      in -- top            // a comment
      top -[!H]- hall -[H]- vault -[#red]- treasury
      hall >> in
      vault -- out
      H lever @hall
      #red @top
      vault $
    `)
    expect(lock.connections).toEqual([
      ["in", "top"],
      ["vault", "out"],
    ])
    expect(lock.gates["vault-treasury"]).toEqual({ from: "vault", to: "treasury", owners: ["#red"] })
    expect(lock.switches.H).toEqual({
      in: "hall",
      encounter: "handle",
      left: ["top-hall"],
      right: ["hall-vault"],
      starts: "left",
    })
    expect(lock.keys).toEqual({ "#red": { in: "top" } })
    expect(lock.oneWays).toEqual([{ from: "hall", to: "in" }])
    expect(lock.regions.vault.takes).toBe("reward")
    expect(lock.regions.in.takes).toBe("puzzles")
  })

  it("keeps an owner nothing places yet as a draft, holding open only its rest side", () => {
    expect(parseLock("in -[S3]- out\nin -[!S3]- hall").unplaced).toEqual({ S3: ["in-hall"] })
  })

  it("reads | as a gate either owner opens", () => {
    expect(parseLock("in -[A|B]- out\nA lever @in\nB lever @in").gates["in-out"].mode).toBe("any")
  })

  it.each([
    ["in -[!Y]- out\nY board @in", "line 1: board Y has no rest side: !Y"],
    ["in -[H]- out\nH lever @cellar", "line 2: no corridor reaches cellar"],
    ["in -[H]- out\nH lever @in\nH lever @out", "line 3: H is placed twice"],
    ["in -[H]- out\nH lever @in\nG lever @in", "line 3: G owns no gate"],
    ["in -[A+B|C]- out", "line 1: -[A+B|C]- mixes + and |"],
    ["in -[!H+H]- out\nH lever @in", "line 1: -[!H+H]- names H twice"],
    ["in -[A|#red]- out", "line 1: -[A|#red]- mixes a key with a lever or board, which the runtime cannot open yet"],
    ["in => out", 'line 1: cannot read "in => out"'],
    ["in -[H]- hall\nH lever @in", "the lock never reaches out"],
    ["chain twoLamps nope", "line 1: no lock called nope"],
    ["embed seesaw.cellar = twoLamps", "line 1: seesaw has no region cellar"],
  ])("refuses %j", (text, message) => {
    expect(() => parseLock(text, LOCK_CATALOGUE)).toThrow(message)
  })

  it("composes from the library, prefixing a lock chained twice", () => {
    const lock = parseLock("chain seesaw seesaw", LOCK_CATALOGUE)
    expect(lock.in).toBe("seesaw1.in")
    expect(lock.out).toBe("seesaw2.out")
    expect(parseLock("embed seesaw.west = twoLamps", { seesaw, twoLamps }).switches.A.in).toBe("twoLamps.out")
  })
})

describe("connections back to back", () => {
  it("put the stretch between a gate and a drop in a region of its own", () => {
    const lock = parseLock("in -[Y]- >> top\nin -- out\nY board @in")
    expect(lock.regions["in→top"]).toEqual({ takes: "nothing" })
    expect(lock.gates["in-in→top"]).toMatchObject({ from: "in", to: "in→top" })
    expect(lock.oneWays).toEqual([{ from: "in→top", to: "top" }])
  })

  it("read with or without a space between the two", () => {
    expect(parseLock("in -[Y]->> top\nin -- out\nY board @in").oneWays).toEqual([{ from: "in→top", to: "top" }])
  })

  it("refuse a line that ends on a connection", () => {
    expect(() => parseLock("in -[Y]- >>")).toThrow("line 1: a line starts and ends with a region")
  })
})
