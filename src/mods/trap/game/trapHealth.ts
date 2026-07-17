export const trapDamage = (armorStacks: number): number => Math.max(1, 2 - armorStacks)

// Whether attempting is SAFE — i.e. a failure won't bottom out the player's health. NOT a gate:
// gating is soft everywhere (pyramid-interior-design.md §8), so a trap always launches and the
// player may always attempt; this only drives a risk warning on the pre-attempt screen. The health
// consequence of a failed attempt is the trap plugin's own (takeTrapDamage).
export const isTrapAttemptSafe = (currentHealth: number): boolean => currentHealth >= 2
