import { freeRegions } from "@/game/lockAuthoring"
import type { FloorConstraint, PyramidConstraint } from "../../dsl"
import { catalogueLock } from "./catalogue"

// What a lesson's controls look like wherever the world places one: a lever is a handle, a board a lightbeam switch,
// a drop a zipline, a flame the standing torch, a weight a stone plate. Each lesson binds only the kinds it uses.
const LESSON_BINDINGS = {
  boardPicksTheWay: { "fork-switch": "lightbeamSwitch", toggle: "handle" },
  leverOpensADoor: { toggle: "handle" },
  leverSwapsDoors: { toggle: "handle" },
  dropDown: { toggle: "handle", "one-way": "zipline" },
  torch: { flame: "torch" },
  doorWaitsForTwo: { flame: "torch" },
  stoneOnAPlate: { weights: "stonePlate" },
} as const

export type PlacedLesson = keyof typeof LESSON_BINDINGS

/**
 * A LESSON ON A FLOOR, read from its .lock file under src/game/locks/lessons. Every region takes `free`: a lesson
 * teaches one control, and the floor's own rooms and chests go where the carve puts them.
 */
export const lessonFloor = (lesson: PlacedLesson): Pick<FloorConstraint, "locks" | "realisations"> => ({
  locks: [{ lock: freeRegions(catalogueLock(`lessons/${lesson}`)) }],
  realisations: LESSON_BINDINGS[lesson],
})

/** A lesson on the main floor of a pyramid the world builds on its own. */
export const lessonOnMainFloor = (lesson: PlacedLesson): Pick<PyramidConstraint, "floorLocks"> => ({
  floorLocks: { 0: lessonFloor(lesson) },
})
