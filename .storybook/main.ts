import type { StorybookConfig } from "@storybook/react-vite"

// Titles come from the file's location: one entry per atomic tier, so moving a component
// between tiers moves its story in the sidebar without editing the story file. A story that does set
// a title gets the prefix prepended to it (mod stories rely on that: "Mosaic/X" → "Mods/Mosaic/X").
const config: StorybookConfig = {
  stories: [
    { directory: "../src/ui/atoms", titlePrefix: "UI/Atoms" },
    { directory: "../src/ui/molecules", titlePrefix: "UI/Molecules" },
    { directory: "../src/ui/organisms", titlePrefix: "UI/Organisms" },
    { directory: "../src/app", titlePrefix: "App" },
    { directory: "../src/mods", titlePrefix: "Mods" },
  ],
  addons: ["@storybook/addon-docs"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  typescript: {
    reactDocgen: "react-docgen-typescript",
  },
}
export default config
