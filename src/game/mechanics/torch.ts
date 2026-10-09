/** A torch is off or lit; the names are fixed, so a gate says `-[B]-` for lit and `-[B:off]-` for out. */
export const TORCH_OFF = "off"
export const TORCH_ON = "on"
export const TORCH_STATES = [TORCH_OFF, TORCH_ON] as const
