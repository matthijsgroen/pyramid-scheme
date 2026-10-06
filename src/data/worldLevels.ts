import { generatedWorldConfigs } from "./generatedWorld"
import { levelSitesOf } from "./levelSites"

/** The committed bake, one site per level (see levelSitesOf). */
export const worldLevelSites = levelSitesOf(generatedWorldConfigs)
