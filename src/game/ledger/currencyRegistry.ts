// Generic bucket-store metadata — core doesn't know what any currency id means,
// it only tracks who owns it and how it should be displayed. See docs/mods-architecture.md.
export type CurrencyMeta = {
  id: string
  ownerMod: string
  displayName: string // translation key, resolved by the app layer — domain stays i18n-free
  icon: string
  kind: "counter" | "capped"
  total?: number // required when kind === "capped"
}

const registry = new Map<string, CurrencyMeta>()

export const registerCurrency = (meta: CurrencyMeta) => registry.set(meta.id, meta)

export const getCurrencyMeta = (id: string): CurrencyMeta | undefined => registry.get(id)

export const allCurrencies = (): CurrencyMeta[] => [...registry.values()]
