import type { FamilyMeta } from "@/game/families/familyMeta"

export const HANDLE_META: FamilyMeta = {
  id: "handle",
  ownerMod: "topology",
  // Its own tag, not "puzzle": what this room hands over is which door on the floor stands open, so a
  // room drawn into the generic pool would offer a lever with nothing on the end of it. Placed only
  // where a floor authors it by id, the same way lightbeamSwitch and crocodile stay out of the pool.
  tags: ["handle"],
  icon: "🎚️",
  color: "amber",
  // The lever is not a loot slot: what it hands over is the floor's own shape.
  rewardPriority: 0,
  invitation: "handle.invitation",
  // A lever that cannot be thrown back is a one-way key wearing a lever's coat, and the branch it shut
  // would hold content nothing could ever reach.
  reEnterable: true,
  // The position it was left in IS the mechanism, so the room reopens on it rather than offering a
  // lever at rest beside a door the player can see standing open.
  stateIsTheMechanism: true,
  // Throwing it IS the visit — no board, so the arrival prompt itself moves the arm and nothing opens
  // on top of the map to ask which way (docs/mods/floor-topology-design.md, "a mechanism is a room").
  actsOnArrival: true,
}
