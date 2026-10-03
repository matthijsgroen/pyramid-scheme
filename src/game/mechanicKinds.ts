/**
 * What a mod declares about one kind of control a lock may name (docs/mods/mechanic-contract.md): whether
 * the engine can build it yet. A lock using an unbuilt kind is written and checked, and refused at the bake.
 */
export type MechanicKindMeta = {
  /** The `control` a lock names: "toggle", "activator", "sequence", "fork-switch", or "one-way". */
  control: string
  ownerMod: string
  built: boolean
}

/** Resolves a control kind to what its mod declares; production answers nothing for a kind no mod declares. */
export type ResolveMechanicKind = (control: string) => MechanicKindMeta | undefined
