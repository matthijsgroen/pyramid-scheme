// story's app-side registration (side-effect). The mod owns encounters that are read rather than
// solved, plus the log of everything the player has been told.
import { registerCollectionSection } from "@/app/pages/collectionSectionRegistry"
import { registerModScreen } from "@/app/pages/screenRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import { StoryLogPage } from "./log/StoryLogPage"
import { StoryLogSection } from "./log/StoryLogSection"
import "./conversation/plugin"
import "./reading/plugin"
import "./reaction/rail"
import "./devJumps"

// Gated on the mod: story off and there is no log, because there is nothing to log.
if (isModEnabled("story")) {
  registerModScreen({ id: "story", Component: StoryLogPage })
  registerCollectionSection({ id: "story", order: 50, Component: StoryLogSection })
}
