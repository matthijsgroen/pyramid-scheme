// The waterskin: trap's one heal inside a site. It is drunk on pickup and always used up, so the
// heal is a pure step on the health in half-hearts; a waterskin found at full health heals nothing.
export const WATERSKIN_HEAL = 2
// The pack-mule perk makes a waterskin heal two hearts instead of one.
export const PACK_MULE_WATERSKIN_HEAL = 4

export const waterskinHeal = (currentHealth: number, maxHealth: number, packMuleStacks: number): number => {
  const heal = packMuleStacks >= 1 ? PACK_MULE_WATERSKIN_HEAL : WATERSKIN_HEAL
  return Math.max(currentHealth, Math.min(maxHealth, currentHealth + heal))
}
