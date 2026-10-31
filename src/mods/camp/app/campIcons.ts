import type { CampArt } from "@/ui/atoms/campScene/campArt"
import { campArt, groupCampArt } from "@/ui/atoms/campScene/campArt"

// A part's painted icon, named `<structure>-<part>`, dropped into the parts folder.
const PART_ICONS = groupCampArt(
  import.meta.glob("../../../assets/camp/parts/*.webp", {
    eager: true,
    query: "?url",
    import: "default",
  }) as Record<string, string>
)

type ArtLookup = (id: string, layer?: boolean) => CampArt | undefined

export const partIconFrom = (
  icons: ReadonlyMap<string, CampArt>,
  art: ArtLookup,
  structure: string,
  part: string
): string | undefined => (icons.get(`${structure}-${part}`) ?? art(structure, true) ?? art(structure))?.url

/** The part's own icon; a part not yet painted shows its structure's art. */
export const partIcon = (structure: string, part: string): string | undefined =>
  partIconFrom(PART_ICONS, campArt, structure, part)
