import { useEffect, useMemo } from "react"
import type { SiteConfig } from "@/game/siteTypes"
import { siteArtUrls } from "./floorArt"
import { floorOfPosition } from "./stairTravel"

/** Fetches and decodes one image. */
export type ImageLoader = (url: string) => Promise<unknown>

const loadImage: ImageLoader = url => {
  const img = new Image()
  img.src = url
  // `decode` also waits for the fetch; an environment without it (jsdom) just fetches.
  return typeof img.decode === "function" ? img.decode().then(() => img) : Promise.resolve(img)
}

// Every url asked for this session, held so a second board (or a second visit) fetches nothing again
// and the decoded images stay referenced.
const requested = new Map<string, Promise<unknown>>()

/** Starts loading every url not asked for before. Never waits and never throws. */
export const preloadArt = (urls: readonly string[], load: ImageLoader = loadImage): void => {
  for (const url of urls) {
    if (requested.has(url)) continue
    // A loader that throws or rejects is a tile that pops in later, never an error on the board.
    try {
      requested.set(
        url,
        load(url).catch(() => undefined)
      )
    } catch {
      requested.set(url, Promise.resolve())
    }
  }
}

export const forgetPreloadedArt = (): void => requested.clear()

const whenIdle = (run: () => void): (() => void) => {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(run, { timeout: 1000 })
    return () => window.cancelIdleCallback(id)
  }
  const id = window.setTimeout(run, 200)
  return () => window.clearTimeout(id)
}

/** Preloads `urls` once the screen asking for them has settled, so the art the NEXT screen draws is
 * already decoded when it opens. */
export const usePreloadArt = (urls: readonly string[] | undefined): void => {
  const key = urls?.join("\n") ?? ""
  useEffect(() => {
    if (!key) return
    return whenIdle(() => preloadArt(key.split("\n")))
  }, [key])
}

/** Preloads the art of the site the player is about to enter (or is in), the floor they stand on first,
 * so neither the first floor nor a staircase to the next one draws its art in tile by tile. */
export const usePreloadSiteArt = (site: SiteConfig | undefined, positionKey: string | null | undefined): void => {
  const firstFloor = site ? floorOfPosition(positionKey, site.length) : 0
  const urls = useMemo(() => (site ? siteArtUrls(site, firstFloor) : undefined), [site, firstFloor])
  usePreloadArt(urls)
}
