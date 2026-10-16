import { describe, expect, it } from "vitest"
import { floorLock } from "./floorLock"
import { reachableStates, walkLock, type LockSpec, type Mechanism } from "./lockWalk"
import { progressState } from "./sequence"
import { orderRead } from "./sequenceReads"
import { assembleFloor } from "./siteAssembler"
import type { FloorGrid, MechanismRecord } from "./siteTypes"
import { TOPOLOGY_ON } from "./testSupport/modOff"
import { lockFloor } from "./testSupport/processionFixtures"

// THE PROCESSION DOOR WITHHOLDS NOTHING A PLAYER CANNOT GET. The lock walk sees a sequence as it is; play keeps two
// facts beside it (sequenceReads.ts): the steps ever walked, and whether the board at the door was read. This walks
// the floor's own lock with those two folded into the sequence's state, under play's rules: a crossing adds its step
// whatever it does to the run, the read is offered only where the reset is (at the door) and only with every step
// walked, and it puts the run back to its first step; the door asks `orderRead`, the function play asks. From every
// state a player can reach this way the way out must still be reachable, and no open door may stand unread.

const LOCKS = {
  // Three tiles walked cellar, east, west; the cellar is entered by a drop from the hall and lies behind east.
  processional:
    "in -- hall\nhall -- west\nhall -- east\neast -- cellar\nhall >> cellar\nhall -[P]- out\n" +
    "P procession cellar east west reset hall-out\nin ?\nhall ?\nwest ?\neast ?\ncellar ?\nout ?",
  // A step in the room the door stands off, so the read is made standing on a step's room.
  stepAtTheDoor:
    "in -- hall\nhall -- east\nhall -- west\nhall -[P]- out\n" +
    "P procession hall east west reset hall-out\nin ?\nhall ?\neast ?\nwest ?\nout ?",
  // The door has a second owner, every owner needed.
  secondOwner:
    "in -- hall\nhall -- east\nhall -- west\nhall -[P+L]- out\nL toggle @west\n" +
    "P procession hall east west reset hall-out\nin ?\nhall ?\neast ?\nwest ?\nout ?",
  // The door has a second owner, either one enough.
  eitherOwner:
    "in -- hall\nhall -- east\nhall -- west\nhall -[P|L]- out\nL toggle @west\n" +
    "P procession hall east west reset hall-out\nin ?\nhall ?\neast ?\nwest ?\nout ?",
}

const BINDING = { "one-way": "zipline", toggle: "handle" }

const carve = (text: string): FloorGrid => {
  for (let seed = 0; seed < 60; seed++) {
    const result = assembleFloor("test", lockFloor(text, { realisations: BINDING }), seed, TOPOLOGY_ON.resolveEncounter)
    if (result.success) return result.grid
  }
  throw new Error("no seed carves the lock")
}

type Folded = { state: string; walked: number[]; read: boolean }
const key = ({ state, walked, read }: Folded) => `${state}|${walked.join(",")}|${read ? "read" : "unread"}`
const parse = (id: string): Folded => {
  const [state, walked, read] = id.split("|")
  return { state, walked: walked === "" ? [] : walked.split(",").map(Number), read: read === "read" }
}
const subsets = (n: number): number[][] =>
  Array.from({ length: 1 << n }, (_, mask) => Array.from({ length: n }, (_, k) => k).filter(k => mask & (1 << k)))

/** The floor's lock with the hiding sequence's mechanism standing for (its state, steps walked, read). */
const folded = (spec: LockSpec, id: string): LockSpec => {
  const sequence = spec.mechanisms[id]
  const stepAt = new Map<string, number>()
  for (const entry of sequence.entries ?? [])
    if (/^\d+$/.test(entry.from) && Number(entry.to) === Number(entry.from) + 1)
      stepAt.set(entry.at, Number(entry.from))
  const steps = new Set(stepAt.values()).size
  const all = Array.from({ length: steps }, (_, k) => k)
  const door = new Set(sequence.transitions.filter(t => t.to === progressState(0)).map(t => t.at))
  const record = { states: sequence.states } as MechanismRecord
  const states: Folded[] = sequence.states.flatMap(state =>
    subsets(steps).flatMap(walked => [false, true].map(read => ({ state, walked, read })))
  )

  const entries: NonNullable<Mechanism["entries"]> = []
  const transitions: Mechanism["transitions"] = []
  for (const from of states) {
    for (const [at, step] of stepAt) {
      const moved = sequence.entries!.find(entry => entry.at === at && entry.from === from.state)
      const walked = [...new Set([...from.walked, step])].sort((a, b) => a - b)
      const to = { ...from, state: moved?.to ?? from.state, walked }
      if (key(to) !== key(from)) entries.push({ from: key(from), to: key(to), at })
    }
    for (const reset of sequence.transitions.filter(t => t.from === from.state))
      transitions.push({ from: key(from), to: key({ ...from, state: reset.to }), at: reset.at })
    if (!from.read && from.walked.length === steps)
      for (const at of door)
        transitions.push({ from: key(from), to: key({ ...from, state: progressState(0), read: true }), at })
  }
  const entryOf = (walked: number[]) => (walked.length === 0 ? undefined : { walked })
  const opens = Object.fromEntries(
    states.map(s => [
      key(s),
      orderRead(record, s.state, s.read ? { walked: s.walked, read: true } : entryOf(s.walked))
        ? (sequence.opens[s.state] ?? [])
        : [],
    ])
  )
  return {
    ...spec,
    mechanisms: {
      ...spec.mechanisms,
      [id]: {
        states: states.map(key),
        initial: key({ state: sequence.initial, walked: [], read: false }),
        opens,
        transitions,
        entries,
        goal: {
          state: key({ state: progressState(steps), walked: all, read: true }),
          label: `${id} walked after read`,
        },
      },
    },
  }
}

describe.each(Object.entries(LOCKS))("a procession door on %s", (_name, text) => {
  const spec = floorLock(carve(text))!
  const id = Object.keys(spec.mechanisms).find(m => spec.mechanisms[m].goal?.label.startsWith("sequence"))!
  const withReads = folded(spec, id)

  it("leaves every state a player can reach a way out, and the order walkable after the read", () => {
    expect(walkLock(spec)).toMatchObject({ sound: true })
    expect(walkLock(withReads, 500_000)).toMatchObject({ sound: true })
  })

  it("never stands its door open unread", () => {
    const found = reachableStates(withReads, 500_000)
    if (found === "tooLarge") throw new Error("too large")
    const doors = new Set(Object.values(spec.mechanisms[id].opens).flat())
    const unreadOpen = found.order.filter(state => {
      const own = parse(state.config[id])
      return !own.read && (withReads.mechanisms[id].opens[state.config[id]] ?? []).some(gate => doors.has(gate))
    })
    expect(unreadOpen).toEqual([])
    expect(found.order.some(state => parse(state.config[id]).read)).toBe(true)
  })
})
