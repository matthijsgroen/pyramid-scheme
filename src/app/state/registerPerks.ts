import { registerPerk } from "@/game/perks/perkRegistry"

const increment = (cap: number) => (current: number) => Math.min(cap, current + 1)
const setOnce = (level: number) => () => level
const toLevel = (current: number, grantedLevel = 1) => Math.max(current, grantedLevel)

registerPerk({
  id: "armor",
  ownerMod: "trap",
  slice: "trapPerks",
  field: "armorStacks",
  maxLevel: 2,
  bump: increment(2),
})
registerPerk({
  id: "trap-insight",
  ownerMod: "trap",
  slice: "trapPerks",
  field: "trapInsightStacks",
  maxLevel: 2,
  bump: increment(2),
})
registerPerk({
  id: "pack-mule",
  ownerMod: "trap",
  slice: "trapPerks",
  field: "packMuleLevel",
  maxLevel: 1,
  bump: setOnce(1),
})
registerPerk({
  id: "max-health",
  ownerMod: "trap",
  slice: "trapPerks",
  field: "maxHealth",
  maxLevel: 12,
  bump: increment(12),
})
registerPerk({
  id: "compass",
  ownerMod: "core",
  slice: "corePerks",
  field: "compassLevel",
  maxLevel: 3,
  bump: toLevel,
})
registerPerk({
  id: "consumable-detector",
  ownerMod: "core",
  slice: "corePerks",
  field: "consumableDetectorLevel",
  maxLevel: 3,
  bump: toLevel,
})
registerPerk({
  id: "detection",
  ownerMod: "core",
  slice: "corePerks",
  field: "detectionLevel",
  maxLevel: 4,
  bump: toLevel,
})
registerPerk({
  id: "scribes-eye",
  ownerMod: "puzzle",
  slice: "puzzlePerks",
  field: "scribesEyeLevel",
  maxLevel: 3,
  bump: toLevel,
})
