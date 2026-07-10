export const trapDamage = (armorStacks: number): number => Math.max(1, 2 - armorStacks)
export const canAttemptTrap = (currentHealth: number): boolean => currentHealth >= 2
