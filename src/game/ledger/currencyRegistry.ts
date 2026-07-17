// Generic bucket-store metadata — core doesn't know what any currency id means,
// it only tracks who owns it and how it should be displayed. See docs/mods/ARCHITECTURE.md.
export type CurrencyMeta = {
  id: string
  ownerMod: string
  displayName: string // translation key, resolved by the app layer — domain stays i18n-free
  icon: string
  kind: "counter" | "capped"
  total?: number // required when kind === "capped"
  // Show this currency as a section on the shared Collection screen. Independent of whether it
  // functions as a key (docs/game-design/keys-and-locks-solver.md, "key role and collection
  // visibility are independent"): hieroglyph fragments are both; map pieces are a key with no
  // collection UI; mosaic tiles are collection-tracked but via their own mod screen, not here.
  showInCollection?: boolean
}

const registry = new Map<string, CurrencyMeta>()

export const registerCurrency = (meta: CurrencyMeta) => registry.set(meta.id, meta)

export const getCurrencyMeta = (id: string): CurrencyMeta | undefined => registry.get(id)

export const allCurrencies = (): CurrencyMeta[] => [...registry.values()]
