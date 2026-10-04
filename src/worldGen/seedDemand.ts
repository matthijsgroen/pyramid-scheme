import { levelSitesOf } from "@/data/levelSites"
import type { FamilyMeta } from "@/game/families/familyMeta"
import { enumerateConfigs, type ConfigDemand } from "@/game/seeds/enumerateConfigs"
import type { SiteConfig as GameSiteConfig } from "@/game/siteTypes"
import type { SiteConfig } from "./types"

/**
 * The buckets a world needs seeds for, read from the configs the spec builds rather than from the
 * committed bake, so seeds can be found before the bake that needs them exists.
 */
export const seedDemandOf = (configs: Record<string, SiteConfig[]>, families: FamilyMeta[]): ConfigDemand[] =>
  // worldGen's SiteConfig is a looser mirror of game/siteTypes.ts's; authored data only assigns values
  // the stricter type accepts too.
  enumerateConfigs(levelSitesOf(configs as Record<string, GameSiteConfig[]>), families)
