import { describe, expect, it, vi } from "vitest"
import { createAudioService, DUCK_LEVEL, MUSIC_GAIN } from "./audioService"
import { fakeAudioContext, fakeMediaElement } from "./fakeAudio.testing"

const TRACK = "music-made-up.m4a"

const setup = () => {
  const fake = fakeAudioContext()
  const elements: ReturnType<typeof fakeMediaElement>[] = []
  const createElement = vi.fn((url: string) => {
    const element = fakeMediaElement(url)
    elements.push(element)
    return element
  })
  const warmCache = vi.fn()
  let hide: (hidden: boolean) => void = () => {}
  const service = createAudioService({
    createContext: () => fake.context,
    anySound: () => false,
    music: { url: TRACK, createElement, warmCache },
    onHidden: callback => {
      hide = callback
      return () => {}
    },
  })
  return { fake, elements, createElement, warmCache, service, hide: (hidden: boolean) => hide(hidden) }
}

describe("music", () => {
  it("with music off, no music element is made and nothing is fetched", () => {
    const { service, createElement, warmCache } = setup()
    service.unlock()
    service.unlock()
    expect(createElement).toHaveBeenCalledTimes(0)
    expect(warmCache).toHaveBeenCalledTimes(0)
  })

  it("turning music on after the first tap starts the looping track once", () => {
    const { service, elements } = setup()
    service.unlock()
    service.setMusic(true)
    service.unlock()
    expect(elements).toHaveLength(1)
    expect(elements[0].src).toBe(TRACK)
    expect(elements[0].loop).toBe(true)
    expect(elements[0].plays).toBe(1)
  })

  it("music turned on before the first tap waits for the tap", () => {
    const { service, elements } = setup()
    service.setMusic(true)
    expect(elements).toHaveLength(0)
    service.unlock()
    expect(elements.map(element => element.plays)).toEqual([1])
  })

  it("turning music off pauses it", () => {
    const { service, elements } = setup()
    service.unlock()
    service.setMusic(true)
    service.setMusic(false)
    expect(elements[0].paused).toBe(true)
  })

  it("plays the music at its own low level", () => {
    const { service, fake } = setup()
    service.unlock()
    service.setMusic(true)
    expect(fake.music.gain?.value).toBe(MUSIC_GAIN)
  })

  it("while ducked, the music gain ramps to the ducked level, and back when released", () => {
    const { service, fake } = setup()
    service.unlock()
    service.setMusic(true)
    const release = service.duck()
    release()
    expect(fake.music.gain?.ramps).toEqual([MUSIC_GAIN * DUCK_LEVEL, MUSIC_GAIN])
  })

  it("two overlapping ducks restore full volume only when both are released", () => {
    const { service, fake } = setup()
    service.unlock()
    service.setMusic(true)
    const first = service.duck()
    const second = service.duck()
    first()
    expect(fake.music.gain?.ramps.at(-1)).toBe(MUSIC_GAIN * DUCK_LEVEL)
    second()
    expect(fake.music.gain?.ramps.at(-1)).toBe(MUSIC_GAIN)
  })

  it("a release called twice counts once", () => {
    const { service, fake } = setup()
    service.unlock()
    service.setMusic(true)
    const first = service.duck()
    const second = service.duck()
    first()
    first()
    expect(fake.music.gain?.ramps.at(-1)).toBe(MUSIC_GAIN * DUCK_LEVEL)
    second()
  })

  it("music that starts during a duck starts at the ducked level", () => {
    const { service, fake } = setup()
    service.unlock()
    service.duck()
    service.setMusic(true)
    expect(fake.music.gain?.value).toBe(MUSIC_GAIN * DUCK_LEVEL)
  })

  it("hiding the page pauses the music and showing it resumes it", () => {
    const { service, elements, hide } = setup()
    service.unlock()
    service.setMusic(true)
    hide(true)
    expect(elements[0].paused).toBe(true)
    hide(false)
    expect(elements[0].paused).toBe(false)
    expect(elements[0].plays).toBe(2)
  })

  it("showing the page with music off plays nothing", () => {
    const { service, elements, hide } = setup()
    service.unlock()
    service.setMusic(true)
    service.setMusic(false)
    hide(true)
    hide(false)
    expect(elements[0].paused).toBe(true)
  })

  it("turning music on fetches the track once to fill the runtime cache", () => {
    const { service, warmCache, createElement } = setup()
    service.unlock()
    service.setMusic(true)
    service.setMusic(false)
    service.setMusic(true)
    expect(warmCache.mock.calls).toEqual([[TRACK]])
    expect(createElement).toHaveBeenCalledTimes(1)
  })
})

describe("music back from the background", () => {
  it("plays from a new element on the new context, the old one left paused", () => {
    const { service, elements, hide } = setup()
    service.unlock()
    service.setMusic(true)
    hide(true)
    hide(false)
    service.unlock()
    expect(elements).toHaveLength(2)
    expect(elements[0].paused).toBe(true)
    expect(elements[1].paused).toBe(false)
  })
})
