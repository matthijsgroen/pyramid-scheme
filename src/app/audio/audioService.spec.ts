import { describe, expect, it, vi } from "vitest"
import { createAudioService } from "./audioService"
import { fakeAudioContext } from "./fakeAudio.testing"
import type { SoundDef } from "./soundRegistry"

const testTwo: SoundDef = () => [
  { frequency: 440, start: 0, duration: 0.1 },
  { frequency: 660, start: 0.1, duration: 0.1 },
]

const setup = (withContext = true) => {
  const fake = fakeAudioContext()
  const createContext = vi.fn(() => (withContext ? fake.context : undefined))
  const service = createAudioService({
    createContext,
    lookup: name => (name === "test.two" ? testTwo : undefined),
  })
  return { fake, createContext, service }
}

describe("createAudioService", () => {
  it("makes no audio context and plays nothing before the first tap", () => {
    const { service, createContext } = setup()
    service.play("test.two")
    expect(createContext).toHaveBeenCalledTimes(0)
  })

  it("never plays a sound asked for before the first tap, even after it", () => {
    const { service, fake } = setup()
    service.play("test.two")
    service.unlock()
    expect(fake.oscillators).toHaveLength(0)
  })

  it("after the first tap starts one oscillator per tone, at the tone's frequency and time", () => {
    const { service, fake } = setup()
    service.unlock()
    service.play("test.two", { delay: 0.5 })
    expect(fake.oscillators).toEqual([
      { frequency: 440, startAt: 0.5 },
      { frequency: 660, startAt: 0.6 },
    ])
  })

  it("plays nothing for a name nobody registered", () => {
    const { service, fake } = setup()
    service.unlock()
    expect(() => service.play("test.nobody")).not.toThrow()
    expect(fake.oscillators).toHaveLength(0)
  })

  it("with sound effects off, a tap makes no audio context", () => {
    const { service, createContext } = setup()
    service.setEffects(false)
    service.unlock()
    expect(createContext).toHaveBeenCalledTimes(0)
  })

  it("with sound effects off, a sound plays nothing", () => {
    const { service, fake } = setup()
    service.unlock()
    service.setEffects(false)
    service.play("test.two")
    expect(fake.oscillators).toHaveLength(0)
  })

  it("without Web Audio, the game stays silent and nothing throws", () => {
    const { service } = setup(false)
    expect(() => {
      service.unlock()
      service.play("test.two")
      service.unlock()
    }).not.toThrow()
  })

  it("makes the audio context once, however many taps", () => {
    const { service, createContext } = setup()
    service.unlock()
    service.unlock()
    expect(createContext).toHaveBeenCalledTimes(1)
  })

  it("resumes a context the system suspended on the next tap", () => {
    const { service, fake } = setup()
    service.unlock()
    fake.setState("suspended")
    service.unlock()
    expect(fake.resumes).toBe(2)
  })
})
