// Side-effect only — each mod's collection module self-registers its Collection section (gated on
// the mod being enabled) into collectionSectionRegistry.ts on import. Import this one file wherever
// the Collection screen needs the real registry (src/app/pages/Collection.tsx). Mirrors
// registerAllFamilies.ts.
import "./hieroglyph/app/collection"
