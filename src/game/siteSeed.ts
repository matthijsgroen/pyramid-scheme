import { generateNewSeed } from "./random"
import { hashString } from "@/support/hashString"

// The seed a site's layout is assembled from, in one place. It used to be spread over three
// files — useJourneys derived the per-journey seed, PyramidExpedition added the level number,
// useAssembledFloor added the floor index — which is exactly how the one spec that assembled
// real floors drifted out of sync with the runtime (it omitted the level number and so never
// exercised the seeds players actually get). Anything that wants to check a real floor's layout
// must go through here.

// Persistent interiors (pyramids and tombs with a site config) are revisitable places: their
// seed must never move, or a run's stored exploredSections stop matching the (now different)
// layout. So it's derived from the journey id alone, at a fixed index — NOT from
// completionCount, which is what a replayable exterior-only journey uses.
export const persistentInteriorSeed = (journeyId: string): number => generateNewSeed(hashString(journeyId), 1)

// One floor's assembly seed within a site. `levelNr` is 1-based (it's the journey's level
// counter, not an array index) and separates the sites of a multi-pyramid journey; `floorIndex`
// separates the floors within one site.
export const floorAssemblySeed = (siteSeed: number, levelNr: number, floorIndex: number): number =>
  siteSeed + levelNr + floorIndex
