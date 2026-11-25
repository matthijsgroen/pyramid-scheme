import { describe, expect, it, vi } from "vitest"
import { createAudioService, EFFECTS_GAIN } from "./audioService"
import { fakeAudioContext, fakeLoader } from "./fakeAudio.testing"
import type { SoundSample } from "./soundRegistry"

const SAMPLES: Record<string, SoundSample> = {
  "test.chime": { url: "chime.ogg", gain: 0.5, playbackRate: 1.5 },
  "test.knock": { url: "knock.ogg" },
}

const setup = (withContext = true, anySound = true) => {
  const fake = fakeAudioContext()
  const loader = fakeLoader()
  const createContext = vi.fn(() => (withContext ? fake.context : undefined))
  const service = createAudioService({
    createContext,
    lookup: name => SAMPLES[name],
    load: loader.load,
    anySound: () => anySound,
  })
  return { fake, loader, createContext, service }
}

// Unlocked, with "test.chime" fetched and decoded by an earlier play.
const warmed = async () => {
  const s = setup()
  s.service.unlock()
  s.service.play("test.chime")
  await s.loader.settle()
  return s
}

describe("createAudioService", () => {
  it("makes no audio context and fetches nothing before the first tap", () => {
    const { service, createContext, loader } = setup()
    service.play("test.chime")
    expect(createContext).toHaveBeenCalledTimes(0)
    expect(loader.calls).toEqual([])
  })

  it("never plays a sound asked for before the first tap, even after it", async () => {
    const { service, fake, loader } = setup()
    service.play("test.chime")
    service.unlock()
    await loader.settle()
    expect(fake.sources).toHaveLength(0)
  })

  it("fetches and decodes a sample once, on its first play after the tap, and drops that play", async () => {
    const { service, fake, loader } = setup()
    service.unlock()
    service.play("test.chime")
    service.play("test.chime")
    await loader.settle()
    expect(loader.calls).toEqual(["chime.ogg"])
    expect(fake.decodes).toBe(1)
    expect(fake.sources).toHaveLength(0)
  })

  it("decodes every registered sample on the first tap, so a sound's first play is heard", async () => {
    const fake = fakeAudioContext()
    const loader = fakeLoader()
    const service = createAudioService({
      createContext: () => fake.context,
      lookup: name => SAMPLES[name],
      load: loader.load,
      anySound: () => true,
      samples: () => [SAMPLES["test.chime"], SAMPLES["test.knock"], SAMPLES["test.chime"]],
    })
    service.unlock()
    await loader.settle()
    expect(loader.calls).toEqual(["chime.ogg", "knock.ogg"])
    service.play("test.knock")
    expect(fake.sources).toHaveLength(1)
  })

  it("a play while the sample still decodes is dropped, not queued", async () => {
    const { service, fake, loader } = setup()
    service.unlock()
    service.play("test.chime")
    service.play("test.chime")
    await loader.settle()
    expect(fake.sources).toHaveLength(0)
    service.play("test.chime")
    expect(fake.sources).toHaveLength(1)
  })

  it("plays a cached sample at its own gain and rate, through the low effects gain", async () => {
    const { service, fake, loader } = await warmed()
    service.play("test.chime", { delay: 0.5 })
    expect(fake.sources).toEqual([{ buffer: "chime.ogg", playbackRate: 1.5, gain: 0.5, startAt: 0.5 }])
    expect(fake.masterGains).toEqual([EFFECTS_GAIN])
    expect(loader.calls).toEqual(["chime.ogg"])
  })

  it("a play's own rate overrides the sample's", async () => {
    const { service, fake } = await warmed()
    service.play("test.chime", { playbackRate: 2 })
    expect(fake.sources.map(source => source.playbackRate)).toEqual([2])
  })

  it("plays nothing and fetches nothing for a name nobody registered", async () => {
    const { service, fake, loader } = setup()
    service.unlock()
    expect(() => service.play("test.nobody")).not.toThrow()
    await loader.settle()
    expect(loader.calls).toEqual([])
    expect(fake.sources).toHaveLength(0)
  })

  it("with no sound registered, a tap makes no audio context", () => {
    const { service, createContext } = setup(true, false)
    service.unlock()
    expect(createContext).toHaveBeenCalledTimes(0)
  })

  it("with sound effects off, a tap makes no audio context", () => {
    const { service, createContext } = setup()
    service.setEffects(false)
    service.unlock()
    expect(createContext).toHaveBeenCalledTimes(0)
  })

  it("with sound effects off, a sound plays nothing", async () => {
    const { service, fake } = await warmed()
    service.setEffects(false)
    service.play("test.chime")
    expect(fake.sources).toHaveLength(0)
  })

  it("without Web Audio, the game stays silent and nothing throws", () => {
    const { service, loader } = setup(false)
    expect(() => {
      service.unlock()
      service.play("test.chime")
      service.unlock()
    }).not.toThrow()
    expect(loader.calls).toEqual([])
  })

  it("makes the audio context once, however many taps", () => {
    const { service, createContext } = setup()
    service.unlock()
    service.unlock()
    expect(createContext).toHaveBeenCalledTimes(1)
  })

  it("a suspended context plays nothing, and nothing plays later on resume", async () => {
    const { service, fake } = await warmed()
    fake.setState("suspended")
    service.play("test.chime")
    service.unlock()
    expect(fake.sources).toHaveLength(0)
  })

  it("resumes a context the system suspended on the next tap", () => {
    const { service, fake } = setup()
    service.unlock()
    fake.setState("suspended")
    service.unlock()
    expect(fake.resumes).toBe(2)
  })
})
