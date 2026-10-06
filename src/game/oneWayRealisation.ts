/**
 * How a mod draws and operates a one-way. A realisation declares the prompt the player takes the
 * crossing through, so no one-way is ever crossed by accident (docs/mods/mechanic-contract.md).
 */
export type OneWayRealisationMeta = {
  id: string
  ownerMod: string
  /** Locale key of the crossing's prompt. It says the crossing cannot be undone and never where it lands.
   * A realisation that declares none is refused where a one-way is bound to it. */
  prompt?: string
}

/** Resolves the realisation a one-way names. Given `undefined` an answer means the caller binds a one-way
 * that names none; production answers nothing, so an unbound one-way is refused. */
export type ResolveOneWayRealisation = (id: string | undefined) => OneWayRealisationMeta | undefined

/** Why a one-way cannot be bound: it names no realisation, or one with no prompt. */
export type OneWayRefusal = "unbound" | "noPrompt"
