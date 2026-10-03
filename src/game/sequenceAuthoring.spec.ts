import { describe, expect, it } from "vitest"
import { topologyFaults } from "./obstacles"
import type { Control, Obstacle, SequenceControl } from "./obstacles"
import type { FloorConfig } from "./siteTypes"
import { contractExampleFloor, hallAnnexSequenceFloor, sequenceControl } from "./testSupport/sequenceFixtures"

const faultsOf = (config: FloorConfig, controls: Control[], obstacles: Obstacle[] = config.obstacles ?? []) =>
  topologyFaults(config.regionLayout, obstacles, controls, config.forks)

const sequence = (overrides: Partial<SequenceControl> = {}): SequenceControl =>
  ({ ...sequenceControl(["hall", "annex", "hall"]), ...overrides }) as SequenceControl

describe("a sequence as an author writes it", () => {
  const config = hallAnnexSequenceFloor()
  const vaultDoor = config.obstacles![0]

  it("is accepted when its steps are in the layout and its reset is a gate it opens", () => {
    expect(faultsOf(config, [sequence()])).toEqual([])
  })

  it("refuses a sequence of one step, naming the sequence", () => {
    expect(faultsOf(config, [sequence({ steps: [{ in: "hall" }] })])).toEqual([
      { type: "sequenceTooShort", id: "plates" },
    ])
  })

  it("refuses a step naming a region the layout does not have, naming the step", () => {
    expect(faultsOf(config, [sequence({ steps: [{ in: "hall" }, { in: "nowhere" }, { in: "hall" }] })])).toEqual([
      { type: "sequenceStepNamesNoRegion", id: "plates", step: 1 },
    ])
  })

  it("refuses an opens naming something that is not a gate, naming it", () => {
    const drop: Obstacle = { id: "drop", kind: "oneWay", at: { on: "connection", between: ["annex", "hall"] } }
    expect(
      faultsOf(config, [sequence({ opens: { done: ["vaultDoor", "drop", "ghost"] } })], [vaultDoor, drop])
    ).toEqual([
      { type: "sequenceOpensNotAGate", id: "plates", gate: "drop" },
      { type: "sequenceOpensNotAGate", id: "plates", gate: "ghost" },
    ])
  })

  it("refuses a reset naming no gate", () => {
    expect(faultsOf(config, [sequence({ resetAt: "ghost" })])).toEqual([
      { type: "sequenceResetNotAGate", id: "plates", gate: "ghost" },
    ])
  })

  it("refuses a reset at a gate the sequence does not open", () => {
    const annexDoor: Obstacle = { id: "annexDoor", kind: "gate", at: { on: "connection", between: ["hall", "annex"] } }
    const lever: Control = {
      id: "lever",
      in: "mouth",
      states: ["left", "right"],
      initial: "left",
      returnsToInitial: true,
      opens: { left: [], right: ["annexDoor"] },
    }
    expect(faultsOf(config, [sequence({ resetAt: "annexDoor" }), lever], [vaultDoor, annexDoor])).toEqual([
      { type: "sequenceResetNotOpened", id: "plates", gate: "annexDoor" },
    ])
  })

  it("refuses a reset at a region barrier, which has a door at every entrance and no one door", () => {
    const flood: Obstacle = { id: "flood", kind: "gate", at: { on: "region", region: "annex" } }
    expect(
      faultsOf(config, [sequence({ resetAt: "flood", opens: { done: ["vaultDoor", "flood"] } })], [vaultDoor, flood])
    ).toEqual([
      { type: "sequenceResetNotAGate", id: "plates", gate: "flood" },
      { type: "sequenceStepBehindOwnDoor", id: "plates", step: 1 },
    ])
  })

  it("refuses a tile behind the door the sequence opens, naming the step", () => {
    const contract = contractExampleFloor()
    expect(faultsOf(contract, contract.controls!)).toEqual([
      { type: "sequenceStepBehindOwnDoor", id: "plates", step: 1 },
    ])
  })

  it("accepts a tile past its own door when a drop lands there, since the player gets there without it", () => {
    const contract = contractExampleFloor()
    const drop: Obstacle = { id: "drop", kind: "oneWay", at: { on: "connection", between: ["hall", "vault"] } }
    expect(faultsOf(contract, contract.controls!, [...contract.obstacles!, drop])).toEqual([])
  })

  it("is refused with its first region named when the floor authors no layout", () => {
    expect(topologyFaults(undefined, [vaultDoor], [sequence()])).toEqual([
      { type: "obstacleNamesNoConnection", id: "vaultDoor" },
      { type: "controlUnsatisfied", id: "plates", what: "hall" },
    ])
  })
})
