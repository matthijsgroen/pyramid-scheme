export const PRODUCTION_BASE = "/pyramid-scheme/"

type PwaIdentity = { name: string; short_name: string; id: string }
type PwaBuild = { selfDestroying: boolean; identity: PwaIdentity | false }

/**
 * The game and its preview are served from the same origin (github.io), and Chrome keys an installed web
 * app by its resolved manifest `id` and repoints it at any page that links a manifest with that id. So only
 * production is an app: any other base ships no manifest at all, and a service worker that unregisters
 * itself, so a visitor's browser holds nothing from it that could touch the installed game.
 */
export const pwaBuild = (base: string): PwaBuild =>
  base === PRODUCTION_BASE
    ? {
        selfDestroying: false,
        identity: { name: "Pyramid Scheme", short_name: "Pyramid Scheme", id: "com.matthijsgroen.pyramidscheme" },
      }
    : { selfDestroying: true, identity: false }
