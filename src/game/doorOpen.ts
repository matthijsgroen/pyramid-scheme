/** How a door's owners combine: every one of them names it (`all`, the default), or one is enough. */
export type DoorMode = "all" | "any"

// Whether a door stands open, given what each of its owners says: a mechanism says yes while its
// current state names the door, a floor key while it is held, and one nothing on the floor can supply
// never says yes. The walk (`openDoorsFor`) and the solver (`openGates`) both ask this, so a door
// cannot be open in play and shut in the proof. A door nobody owns is shut.
export const doorOpen = (says: readonly boolean[], mode: DoorMode = "all"): boolean =>
  says.length > 0 && (mode === "any" ? says.some(Boolean) : says.every(Boolean))
