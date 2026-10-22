export const PRODUCTION_BASE = "/pyramid-scheme/"

type PwaIdentity = { id: string; name: string; short_name: string }

/**
 * The game and its preview are served from the same origin (github.io), and Chrome keys an installed web
 * app by its resolved manifest `id`. A shared id makes them one app: merely opening the preview repoints
 * the installed game at the preview, which then asks to reload after every preview deploy.
 */
export const pwaIdentity = (base: string): PwaIdentity =>
  base === PRODUCTION_BASE
    ? { id: "com.matthijsgroen.pyramidscheme", name: "Pyramid Scheme", short_name: "Pyramid Scheme" }
    : { id: base, name: "Pyramid Scheme (preview)", short_name: "PS preview" }
