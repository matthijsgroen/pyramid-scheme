import { useEffect, useMemo } from "react"
import type { JourneyAPI, MechanismWrites } from "@/app/state/useJourneys"
import { douseFloor, withDouse } from "@/game/mechanismDoors"
import type { FloorGrid } from "@/game/siteTypes"
import { useMechanismStates } from "./useMechanismStates"

/** The journeys API a floor hands down: every mechanism write saves the torches it puts out with it, read off the
 * live save, and a lit torch a flood covers is written out on arriving. */
export const useDousedJourneys = ({
  journeys,
  journeyId,
  floor,
  currentFloor,
  heldKeys,
}: {
  journeys: JourneyAPI
  journeyId: string
  /** The floor as carved, before any state opens a door: its barrier doors are what cover a region. */
  floor: FloorGrid | null
  currentFloor: number
  /** The floor keys held here: a barrier door a held key opens covers nothing, as the floor's solver models it. */
  heldKeys: ReadonlySet<string>
}): JourneyAPI => {
  const stored = useMechanismStates(journeys, journeyId)
  useEffect(() => {
    if (!floor || douseFloor(floor, currentFloor, stored, heldKeys).size === 0) return
    journeys.setMechanismStates(live => douseFloor(floor, currentFloor, live, heldKeys))
  }, [floor, currentFloor, stored, heldKeys, journeys])
  return useMemo(() => {
    if (!floor) return journeys
    const write = (writes: MechanismWrites) =>
      journeys.setMechanismStates(live =>
        withDouse(floor, currentFloor, live, typeof writes === "function" ? writes(live) : writes, heldKeys)
      )
    return {
      ...journeys,
      setMechanismState: (address: string, stateId: string) => write(new Map([[address, stateId]])),
      setMechanismStates: write,
    }
  }, [journeys, floor, currentFloor, heldKeys])
}
