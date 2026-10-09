import { useEffect, useMemo } from "react"
import type { JourneyAPI } from "@/app/state/useJourneys"
import { douseFloor, withDouse } from "@/game/mechanismDoors"
import type { FloorGrid } from "@/game/siteTypes"
import { useMechanismStates } from "./useMechanismStates"

/**
 * THE JOURNEYS API AS A FLOOR HANDS IT DOWN: every mechanism write lands with the torches it puts out, in one journeys
 * write, so a reload never finds the water in with the torch still lit. On the floor's arrival (and whenever its
 * states change) a lit torch a flood covers is written out, which is the walk's douse of its start state: without
 * the write, a lit-start torch would come back lit once the water went, with nobody having lit it.
 */
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
    if (!floor) return
    const writes = douseFloor(floor, currentFloor, stored, heldKeys)
    if (writes.size > 0) journeys.setMechanismStates(writes)
  }, [floor, currentFloor, stored, heldKeys, journeys])
  return useMemo(() => {
    if (!floor) return journeys
    const write = (moves: ReadonlyMap<string, string>) =>
      journeys.setMechanismStates(
        withDouse(floor, currentFloor, journeys.getMechanismStates(journeyId), moves, heldKeys)
      )
    return {
      ...journeys,
      setMechanismState: (address: string, stateId: string) => write(new Map([[address, stateId]])),
      setMechanismStates: write,
    }
  }, [journeys, journeyId, floor, currentFloor, heldKeys])
}
