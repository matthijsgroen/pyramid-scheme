import { describe, expect, it } from "vitest"
import { resolveEncounterMeta as resolveEncounter } from "@/mods/allFamilyMeta"
import { forkSwitchFloorConfig } from "../testSupport/forkSwitchFixtures"
import { firstCarved } from "./carveFixtures"
import { keyOf } from "./derive"
import { prepareFloor } from "./prepareFloor"
import { standForkSwitches } from "./standForkSwitches"
import type { CarveState } from "./state"

const SITE = "site-fork-switch"
const gateKey = (gateId: string) => `obstacle:${SITE}#0#0:${gateId}`

describe("standForkSwitches", () => {
  // The first seed whose carve gets through every pass.
  const { prep, carved } = (() => {
    for (let seed = 1; seed <= 60; seed++) {
      const prepared = prepareFloor(SITE, forkSwitchFloorConfig(), seed, { resolveEncounter })
      if (!prepared.ok) throw new Error(JSON.stringify(prepared.reasons))
      try {
        return { prep: prepared.prep, carved: firstCarved(prepared.prep) }
      } catch {
        continue
      }
    }
    throw new Error("no seed carved")
  })()
  const rerun = (state: CarveState) => {
    const fresh: CarveState = { ...state, forkSwitchRooms: undefined }
    standForkSwitches.run(prep, fresh)
    return fresh.forkSwitchRooms!
  }

  it("stands the control's encounter in the junction its fork laid, each seam's gate on the exit toward it", () => {
    const junction = keyOf(carved.maze!.mainPath[carved.junctions!.order[0]])
    const stood = rerun(carved).get(junction)!
    expect(stood.room).toMatchObject({ family: "lightbeamSwitch", mechanismId: "Y" })
    expect([...stood.gateKeyByDir.values()].sort()).toEqual([gateKey("forkLeft"), gateKey("forkRight")].sort())
    expect(stood.room.mechanism?.states.slice(1)).toEqual([...stood.gateKeyByDir.values()])
  })

  it("throws where a seam's gate does not stand on the arm's door", () => {
    const noDoors = (rooms: CarveState["mainRooms"]) =>
      new Map([...rooms!].filter(([, spec]) => !spec.requiredKeyId?.startsWith("obstacle:")))
    expect(() =>
      rerun({ ...carved, mainRooms: noDoors(carved.mainRooms), chainRooms: noDoors(carved.chainRooms) })
    ).toThrow(/does not stand on the seam/)
  })
})
