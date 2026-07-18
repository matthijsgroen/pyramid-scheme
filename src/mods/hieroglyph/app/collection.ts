import { registerCollectionSection } from "@/app/pages/collectionSectionRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import { HieroglyphCollectionSection } from "./HieroglyphCollectionSection"

// Side-effect registration, gated on the mod: with hieroglyph off, the section never registers,
// so the Collection screen renders no hieroglyph categories and core names nothing.
if (isModEnabled("hieroglyph"))
  registerCollectionSection({ id: "hieroglyph", order: 20, Component: HieroglyphCollectionSection })
