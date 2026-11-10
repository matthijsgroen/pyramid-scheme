/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

declare module "virtual:tile-sizes" {
  /** Every tile's [width, height] in pixels by `<folder>/<name>` (scripts/tileSizesPlugin.ts). */
  const sizes: Record<string, readonly [number, number]>
  export default sizes
}
