import { DEFAULT_CONTROL_ROLE } from "../encounterFallback"
import { roomDifficulty, roomTileset } from "../roomDifficulty"
import type { EncounterResolution } from "../siteAssembler"
import type { KeyColor, MechanismRecord, SideSection, SubSection } from "../siteTypes"
import type { StatefulControl } from "../obstacles"
import { torchRecord } from "../mechanics/torch"
import { gateKeyOf, nid, stairOnThisFloor } from "./ids"
import type { Cell, Chain, FloorPrep, RoomSpec } from "./state"

/** What a mechanism's room is made of: the family its realisation resolved to, and the tags that family
 * carries. Both come off the resolution, so the room is drawn and filled by whatever realises it. */
const mechanismRoom = ({ familyId, tags }: EncounterResolution) => ({ family: familyId, tags })

// THE LEVER'S ROOM SAYS WHICH DOOR EACH POSITION OPENS, AND THE SAVE SAYS ONLY WHICH POSITION IT IS
// IN (mechanismDoors.ts). Keeping the mapping on the floor is what lets a re-carve move a door
// without a position kept from an earlier layout coming to fit one it was never thrown for. It takes
// no `pathIndex`: it is not the k-th room of its chain, so a save names it by what fills it, the way
// a section's chest or gate is named (cellSlot.ts).
export const leverSpec = (prep: FloorPrep, positional: string): RoomSpec => {
  const address = prep.config.addressOf.get(positional) ?? positional
  return {
    roomType: "encounter",
    ...mechanismRoom(prep.input.resolveEncounter(undefined, DEFAULT_CONTROL_ROLE)),
    mechanism: prep.mechanisms.leverByAddress.get(address)!,
    // The handle's own authored address — the same name `leverByAddress` is keyed by — carried onto
    // the cell so `cellSlot.ts` names every mechanism's room by its authored identity uniformly,
    // rather than by family alone (see RoomCell.mechanismId).
    mechanismId: address,
  }
}

// THE FLOOR KEYS A GATE ALSO ASKS FOR, as the key ids their sections' own doors want — so the key a
// player carries to the section is the key that owns this door beside its controls.
export const floorKeysOfGate = (
  prep: FloorPrep,
  chains: readonly Chain[],
  obstacleId: string
): Pick<RoomSpec, "requiredKeyIds"> => {
  const obstacle = (prep.config.authored.obstacles ?? []).find(o => o.id === obstacleId)
  const keyIds = (obstacle?.kind === "gate" ? (obstacle.floorKeys ?? []) : []).flatMap(address =>
    chains.flatMap(chain =>
      prep.config.addressOf.get(chain.positional) === address && chain.keyNodeId ? [chain.keyNodeId] : []
    )
  )
  return keyIds.length > 0 ? { requiredKeyIds: keyIds } : {}
}

// One entrance's door of a region barrier: a family-less gate room like any other, so it draws as bars
// and `openWaysOut` hands its corridor back once its owners open it. `regionBarrier` is what tells it
// from an edge gate, which of its barrier's doors it is and what it was bound to.
export const regionBarrierDoorSpec = (
  prep: FloorPrep,
  chains: readonly Chain[],
  id: string,
  region: string,
  entrance: string
): RoomSpec => ({
  roomType: "encounter",
  tags: [...prep.families.keyGate.tags, "region-barrier"],
  requiredKeyId: gateKeyOf(prep.input.floorRef, id),
  ...floorKeysOfGate(prep, chains, id),
  regionBarrier: { region, entrance, realisation: prep.realisation.regionBarrier! },
})

// A CONTROL'S ROOM, wherever it stands — the main path or a chain, both write the identical
// shape. The control's own authored id is carried onto the cell for the same reason a handle's
// room carries its own address (see RoomCell.mechanismId): one uniform rule, not a
// control-only exception.
export const controlRoomSpec = (
  prep: FloorPrep,
  control: StatefulControl,
  record: MechanismRecord,
  at: readonly [number, number]
): RoomSpec => ({
  roomType: "encounter",
  ...mechanismRoom(prep.input.resolveEncounter(control.encounter, DEFAULT_CONTROL_ROLE)),
  mechanism: control.control === "flame" ? torchRecord(record, control.in, at) : record,
  mechanismId: control.id,
})

/** Counts, per family, the rooms of one chain as they are resolved in path order. The one place a room's
 * `familyOrdinal` is computed: every reader takes it off the room. */
export const familyOrdinals = () => {
  const seen = new Map<string, number>()
  return (familyId: string): number => {
    const ordinal = seen.get(familyId) ?? 0
    seen.set(familyId, ordinal + 1)
    return ordinal
  }
}

// THE ROOMS A SIDE SECTION IS MADE OF, written once for a branch and for a section filled into laid nodes.
export const puzzleRoomSpec = (
  prep: FloorPrep,
  section: SideSection | SubSection,
  positional: string,
  pi: number,
  ordinalOf: (familyId: string) => number
): RoomSpec => {
  const { resolveEncounter, resolveKeyRequirements, resolveBoardIndex, floorRef } = prep.input
  const reward = section.rewards?.[pi]
  const authoredActivity = section.activitiesByIndex?.[pi]
  const override = section.encountersByIndex?.[pi]
  const family =
    override !== undefined ? resolveEncounter(override, "puzzle") : resolveEncounter(section.encounter, "puzzle")
  const familyOrdinal = ordinalOf(family.familyId)
  const requiredKeyIds = resolveKeyRequirements(family.familyId, {
    ...floorRef,
    pathIndex: pi,
    familyOrdinal,
    encounterArgs: section.encounterArgs,
  })
  const boardIndex = resolveBoardIndex?.(family.familyId, { section: positional, pathIndex: pi })
  return {
    roomType: "encounter",
    // Never inherits the floor's own tableau encounter — tableaus consume hieroglyph
    // symbols the player may not have yet, so a side path stays sumplete (the "puzzle"
    // tag's default) unless it explicitly opts into a different family itself.
    family: family.familyId,
    tags: family.tags,
    pathIndex: pi,
    familyOrdinal,
    ...(boardIndex !== undefined ? { boardIndex } : {}),
    ...(section.encounterArgs !== undefined ? { encounterArgs: section.encounterArgs } : {}),
    difficulty: roomDifficulty(section, pi),
    ...roomTileset(section, prep.config.config, pi),
    ...(section.theme !== undefined ? { theme: section.theme } : {}),
    ...(section.role !== undefined ? { role: section.role } : {}),
    ...(requiredKeyIds?.length ? { requiredKeyIds } : {}),
    ...(reward ? { reward } : {}),
    ...(authoredActivity ? { authoredActivity } : {}),
  }
}

/** A side section's last room: the chest handing out keys it hosts, a stairhead, a shop or its end reward. */
export const endRoomSpec = (
  prep: FloorPrep,
  section: SideSection | SubSection,
  positional: string,
  keyHostColors: readonly KeyColor[],
  [er, ec]: Cell
): RoomSpec => {
  const { treasureChest, fezShop } = prep.families
  if (keyHostColors.length > 0)
    return {
      roomType: "encounter",
      family: treasureChest.familyId,
      tags: treasureChest.tags,
      reward: { type: "tombKey", keyId: nid(prep.input.siteId, er, ec) },
      ...(keyHostColors.length === 1 ? { keyColor: keyHostColors[0] } : {}),
      ...(keyHostColors.length > 1 ? { keyColors: [...keyHostColors] } : {}),
    }
  if (section.end === "staircase" || typeof section.end === "object") {
    const stairId =
      typeof section.end === "object" ? section.end.stairId : stairOnThisFloor(prep.input.floorRef, positional)
    return { roomType: "portal", stairId }
  }
  // A shop is a chain whose resolved encounter is fez-shop (a pathPuzzles:0 node — no chain of
  // its own, so `encounter` describes this end node). It renders its `rewards[]` as buyable
  // stock; a plain end renders its single endReward. Shop-off → encounter didn't resolve to
  // fez-shop → falls back to a treasure chest here.
  const isShop =
    section.encounter !== undefined &&
    prep.input.resolveEncounter(section.encounter, "treasure").familyId === fezShop.familyId
  return {
    roomType: "encounter",
    family: isShop ? fezShop.familyId : treasureChest.familyId,
    tags: isShop ? fezShop.tags : treasureChest.tags,
    ...(isShop ? { stock: section.rewards ?? [] } : section.endReward ? { reward: section.endReward } : {}),
  }
}

/** What the floor dresses an encounter standing in one of its junctions in: its args, tier, theme and so on. */
export const encounterStyle = ({ config }: FloorPrep["config"]): Partial<RoomSpec> => ({
  ...(config.encounterArgs !== undefined ? { encounterArgs: config.encounterArgs } : {}),
  difficulty: config.difficulty,
  ...(config.theme !== undefined ? { theme: config.theme } : {}),
  ...(config.condition !== undefined ? { condition: config.condition } : {}),
  ...(config.patron !== undefined ? { patron: config.patron } : {}),
  ...(config.role !== undefined ? { role: config.role } : {}),
})
