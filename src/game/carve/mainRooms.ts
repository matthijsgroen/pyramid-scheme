import { contentNow, controlAtIndex, forkPositions, gateIndexOf, gateIndices, keyOf } from "./derive"
import { gateKeyOf, stairOnThisFloor } from "./ids"
import {
  controlRoomSpec,
  endRoomSpec,
  floorKeysOfGate,
  leverSpec,
  puzzleRoomSpec,
  regionBarrierDoorSpec,
} from "./roomSpecs"
import { MAIN_SECTION_ADDRESS } from "./sections"
import { pass } from "./state"
import type { Cell, RoomSpec } from "./state"

/**
 * THE ROOMS OF THE MAIN PATH, and of every section a lock's nodes took in, the junctions branches hang from
 * and the exit. A chain's own rooms are `chainRooms`', which write over these where a chain hangs off one.
 */
export const mainRooms = pass(
  "mainRooms",
  ["maze", "content", "mainControls", "seamGates", "runGates", "mainBarrierDoors", "keys", "lay", "branches"],
  ["mainRooms"],
  (prep, state) => {
    const { config } = prep.config
    const { addressOf } = prep.config
    const { sideSections } = prep.sections
    const { treasureChest, keyGate } = prep.families
    const { resolveEncounter, resolveKeyRequirements, resolveBoardIndex, floorRef } = prep.input
    const { mainPath, exit } = state.maze
    const { goal, lever } = state.content
    const { chains, hostColors } = state.keys
    const laid = state.lay?.laid
    const { puzzleRole } = contentNow(state)
    const gated = gateIndices(state)
    const gateAt = gateIndexOf(state)
    const controlAt = controlAtIndex(prep, state.mainControls)
    const rooms = new Map<string, RoomSpec>()

    // A SECTION FILLED INTO LAID NODES KEEPS ITS OWN IDENTITY ON ITS ROOMS: the section's address and its slots
    // are the ones it would have as a branch, so a save filed under them survives a re-carve that moves the room
    // to another node.
    for (const { section: idx, cells: nodes } of laid?.absorbed ?? []) {
      const section = sideSections[idx]
      const positional = `s${idx}`
      nodes.forEach((cellKey, i) => {
        const cell = cellKey.split(",").map(Number) as Cell
        const spec =
          i < section.pathPuzzles
            ? puzzleRoomSpec(prep, section, positional, i)
            : endRoomSpec(prep, section, positional, hostColors.get(idx) ?? [], cell)
        rooms.set(cellKey, {
          ...spec,
          sectionAddress: addressOf.get(positional) ?? positional,
          difficulty: section.difficulty,
        })
      })
    }

    // Main path nodes — spread across the full path per the content placed; everything else along the path is
    // left unassigned and falls through to plain corridor. The goal-room fallback here is defensive only: every
    // real config sets mainEndReward explicitly (buildSite.ts). An unset one falls back to the same
    // grant-nothing placeholder every other unset reward slot uses.
    mainPath.forEach((cell, mi) => {
      const key = keyOf(cell)
      if (mi === 0) {
        if (config.entrance) {
          const stairId =
            typeof config.entrance === "object" ? config.entrance.stairId : stairOnThisFloor(floorRef, "entrance")
          rooms.set(key, { roomType: "portal", stairId })
        } else rooms.set(key, { roomType: "portal" })
      } else if (mi === goal) {
        rooms.set(key, {
          roomType: "encounter",
          family: treasureChest.familyId,
          tags: treasureChest.tags,
          ...(config.mainEndReward ? { reward: config.mainEndReward } : {}),
        })
      } else if (gated.has(mi)) {
        const [obstacleId] = [...gateAt].find(([, index]) => index === mi)!
        rooms.set(key, {
          roomType: "encounter",
          // A gate a control owns has no interaction of its own: the interaction is at the control, and the
          // gate only shows or hides. No family means nothing stands in it to enter or tap, it draws as bars
          // from its tags, and `openWaysOut` gives the cell back its corridor while its control holds it open.
          tags: keyGate.tags,
          requiredKeyId: gateKeyOf(floorRef, obstacleId),
          ...floorKeysOfGate(prep, chains, obstacleId),
        })
      } else if (state.mainBarrierDoors.has(mi)) {
        const { id, region, entrance } = state.mainBarrierDoors.get(mi)!
        rooms.set(key, regionBarrierDoorSpec(prep, chains, id, region, entrance))
      } else if (mi === lever) {
        rooms.set(key, leverSpec(prep, MAIN_SECTION_ADDRESS))
      } else if (controlAt.has(mi)) {
        const { control, record } = controlAt.get(mi)!
        rooms.set(key, controlRoomSpec(prep, control, record, cell))
      } else if (puzzleRole.has(mi)) {
        const k = puzzleRole.get(mi)!
        // Per-node override (authored `nodes` selectors, e.g. the last room's capstone) if this index has one,
        // else the chain's default `encounter`.
        const override = config.encountersByIndex?.[k]
        const family =
          override !== undefined ? resolveEncounter(override, "puzzle") : resolveEncounter(config.encounter, "puzzle")
        const reward = config.rewards?.[k]
        const requiredKeyIds = resolveKeyRequirements(family.familyId, {
          ...floorRef,
          pathIndex: k,
          encounterArgs: config.encounterArgs,
        })
        const boardIndex = resolveBoardIndex?.(family.familyId, { section: "main", pathIndex: k })
        rooms.set(key, {
          roomType: "encounter",
          family: family.familyId,
          tags: family.tags,
          pathIndex: k,
          ...(boardIndex !== undefined ? { boardIndex } : {}),
          ...(config.encounterArgs !== undefined ? { encounterArgs: config.encounterArgs } : {}),
          difficulty: config.difficulty,
          ...(config.theme !== undefined ? { theme: config.theme } : {}),
          ...(config.condition !== undefined ? { condition: config.condition } : {}),
          ...(config.patron !== undefined ? { patron: config.patron } : {}),
          ...(config.role !== undefined ? { role: config.role } : {}),
          ...(requiredKeyIds?.length ? { requiredKeyIds } : {}),
          ...(reward ? { reward } : {}),
        })
      }
    })

    // Corridor cells that are branch junctions become fork nodes too. A junction that already holds a main-path
    // room stays that room: the carve is free to hang a side section off the entrance, off a puzzle or off the
    // goal chest, and none of those is a place the player chooses a way out from.
    for (const key of forkPositions(state)) if (!rooms.has(key)) rooms.set(key, { roomType: "fork" })

    if (config.exitOrStaircase === "exit") rooms.set(keyOf(exit), { roomType: "portal" })
    else {
      const stairId =
        typeof config.exitOrStaircase === "object" ? config.exitOrStaircase.stairId : stairOnThisFloor(floorRef, "main")
      rooms.set(keyOf(exit), { roomType: "portal", stairId })
    }

    state.mainRooms = rooms
  }
)
