// Side-effect only — every mod's plugin registers itself into familyRegistry.ts on import.
// Import this one file (instead of each plugin individually) wherever family resolution
// needs to work: SiteMapScreen.tsx, or a test/story exercising the real registry.
import "./trap/app/arithmeticReflex/plugin"
import "./puzzle/app/sumplete/plugin"
import "./puzzle/app/tableau/plugin"
import "./puzzle/app/crocodile/plugin"
import "./shop/app/fezShop/plugin"
import "./core/app/treasureChest/plugin"
import "./core/app/keyGate/plugin"
