import { useSyncExternalStore } from "react"
import type { Modality } from "./modality"

/** Which face buttons a pad wears: Xbox letters or PlayStation shapes. Unknown pads read as Xbox. */
export type PadBrand = "xbox" | "playstation"

const subscribe = (notify: () => void) => {
  const observer = new MutationObserver(notify)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-input", "data-pad"] })
  return () => observer.disconnect()
}

const readInput = (): Modality => (document.documentElement.dataset.input as Modality | undefined) ?? "touch"
const readBrand = (): PadBrand => (document.documentElement.dataset.pad === "playstation" ? "playstation" : "xbox")

/** The input last used, as `<html data-input>` says, and the brand of pad as `<html data-pad>` says. */
export const useModality = (): { input: Modality; brand: PadBrand } => {
  const input = useSyncExternalStore(subscribe, readInput, () => "touch" as const)
  const brand = useSyncExternalStore(subscribe, readBrand, () => "xbox" as const)
  return { input, brand }
}
