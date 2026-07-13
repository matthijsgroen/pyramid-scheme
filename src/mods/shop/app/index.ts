import { registerCollectionSection } from "@/app/pages/collectionSectionRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import { ShopCollectionSection } from "./ShopCollectionSection"
import "./fezShop/plugin" // the Fez shop encounter family (self-gated)

// shop's app-side registration (side-effect), self-gated on the mod being enabled: the Collection
// "junk" section. With shop off it never registers, so the Collection screen shows no junk
// category — matching the world-gen side that places no junk when shop is off.
if (isModEnabled("shop")) registerCollectionSection({ id: "shop", order: 20, Component: ShopCollectionSection })
