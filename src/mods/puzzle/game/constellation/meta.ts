import { seedable, type FamilyMeta } from "@/game/families/familyMeta"
import { CONSTELLATION_CONFIG } from "./constellationConfig"
import { generateConstellation, gradeConstellation } from "./generateConstellation"

export const CONSTELLATION_META: FamilyMeta = {
  id: "constellation",
  ownerMod: "puzzle",
  // `sky` is the cluster a lighthouse or star-map journey draws from, and this is the star map that pool was
  // named for (docs/game-design/PUZZLE_FAMILIES.md §4.21). NOT `light`: that is the narrower pool for the
  // families about light itself — a beam bending, a sun and a moon — and lines between stars are not that.
  // Four pools, because the same rules describe four places: stars joined by light, sites joined by haul
  // roads, basins joined by channels, fields fed by them. WHICH of them a room is comes from the role it was
  // allocated for, not from the family — see the skin table in app/constellation/skins.ts.
  //
  // **A tag is eligibility, not placement.** Carrying `water` costs nothing while no site asks for water
  // puzzles; what would cost something is AUTHORING that role today, since this is the only family serving
  // it and every room of that pyramid would be the same board in the same dress. So the tags go on now and
  // the authoring waits — see expert.ts, on the Nile Delta.
  tags: ["puzzle", "sky", "trade", "water", "agriculture", "funerary"],
  // Configured for every tier (docs/game-design/puzzles/constellation.md §5), so the allocator may draw it
  // anywhere and a node may author it anywhere.
  // A star map for the sky, a haul road for trade, a waterworks for water, a painted ceiling for a tomb.
  // `light` and `logistics` used to be in here and are gone: this family carries neither tag, so both were
  // faces nothing could ever reach (journeys.md §12).
  faces: {
    sky: ["default"],
    trade: ["causeway"],
    water: ["irrigation"],
    agriculture: ["irrigation"],
    funerary: ["ceiling"],
  },
  minTier: "starter",
  // Every skin this family has, listed for the puzzle lab: the lab picks a THEME, so naming a skin here is
  // what makes it playable without a site to author its role. `night` is the ambience, not a skin — it
  // layers over whichever place the room already is (a causeway after dark is still a causeway).
  themes: ["default", "irrigation", "causeway", "ceiling", "night"],
  icon: "✨",
  color: "indigo",
  seedable: seedable({
    resolveOptions: ({ difficulty }) => CONSTELLATION_CONFIG[difficulty ?? "starter"],
    generate: generateConstellation,
    grade: gradeConstellation,
  }),
  rewardPriority: 60, // fills only once treasure's guaranteed slots are spoken for
}
