// story's app-side registration (side-effect). The mod owns encounters that are read rather than
// solved, plus the log of everything the player has been told.
import { registerModScreen } from "@/app/pages/screenRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import { StoryLogPage } from "./log/StoryLogPage"
import "./conversation/plugin"
import "./reading/plugin"

// Gated on the mod: story off and there is no log, because there is nothing to log.
if (isModEnabled("story")) registerModScreen({ id: "story", Component: StoryLogPage })
