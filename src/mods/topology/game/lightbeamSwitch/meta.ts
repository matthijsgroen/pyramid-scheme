import type { FamilyMeta } from "@/game/families/familyMeta"

export const LIGHTBEAM_SWITCH_META: FamilyMeta = {
  id: "lightbeamSwitch",
  ownerMod: "topology",
  // Its own tag, not "puzzle": this board's answer is WHICH WAY OUT OPENS, so a room drawn into the
  // generic pool would hand the player a choice that decides nothing — there is no fork under it to
  // open. It is placed only where a floor authors it by id, in the junction its `switches` reserved,
  // the same way crocodile stays out of the pool with its own "capstone" tag.
  tags: ["lightbeamSwitch"],
  minTier: "junior",
  icon: "🪞",
  color: "amber",
  // The fork it stands in is not a loot slot: what the room hands over is the floor's own shape.
  rewardPriority: 0,
  // The mirrors are what this room asks of whoever stands in it, and asking says nothing about whether
  // they have been worked before: a junction is written down by being walked into, so the board behind
  // this prompt may never have been opened at all.
  invitation: "lightbeamSwitch.invitation",
  // THE INVARIANT THE WHOLE FEATURE RESTS ON. The board leaves one way out open and shuts the others,
  // so a player who wants the branch they did not take walks back in and routes the beam there instead.
  // Without the walk back, the first solve would seal the rest of the fork for good.
  reEnterable: true,
  // And the mirrors are not a solved question but the position of the switch itself: the way out standing
  // open is the one they route the light to, so the room reopens on the configuration that opened it.
  stateIsTheMechanism: true,
}
