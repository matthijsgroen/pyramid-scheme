import { describe, expect, it } from "vitest"
import { createAudioService } from "./audioService"
import { fakeAudioContext, fakeLoader } from "./fakeAudio.testing"

const setup = () => {
  const fake = fakeAudioContext()
  const loader = fakeLoader()
  let hide: (hidden: boolean) => void = () => {}
  const service = createAudioService({
    createContext: () => fake.context,
    lookup: name => (name === "test.hum" ? { url: "hum.m4a" } : undefined),
    load: loader.load,
    anySound: () => true,
    onHidden: callback => {
      hide = callback
      return () => {}
    },
  })
  return { fake, loader, service, hide: (hidden: boolean) => hide(hidden) }
}

describe("looping sounds", () => {
  it("a loop asked for before the first tap starts once the tap and its decode have happened", async () => {
    const { service, fake, loader } = setup()
    service.loop("test.hum")
    expect(loader.calls).toEqual([])
    service.unlock()
    await loader.settle()
    expect(fake.loopStarts).toEqual(["hum.m4a"])
    expect(fake.sources).toEqual([])
  })

  it("stopping a loop stops its source, and later taps start nothing", async () => {
    const { service, fake, loader } = setup()
    service.unlock()
    const stop = service.loop("test.hum")
    await loader.settle()
    stop()
    service.unlock()
    expect(fake.loopStarts).toEqual(["hum.m4a"])
    expect(fake.loopStops).toEqual(["hum.m4a"])
  })

  it("a loop stopped while it still decodes never starts", async () => {
    const { service, fake, loader } = setup()
    service.unlock()
    const stop = service.loop("test.hum")
    stop()
    await loader.settle()
    expect(fake.loopStarts).toEqual([])
  })

  it("sound effects off stop the loop, and on again start it anew", async () => {
    const { service, fake, loader } = setup()
    service.unlock()
    service.loop("test.hum")
    await loader.settle()
    service.setEffects(false)
    expect(fake.loopStops).toEqual(["hum.m4a"])
    service.setEffects(true)
    expect(fake.loopStarts).toEqual(["hum.m4a", "hum.m4a"])
  })

  it("a hidden page stops the loop, and showing it again starts it", async () => {
    const { service, fake, loader, hide } = setup()
    service.unlock()
    service.loop("test.hum")
    await loader.settle()
    hide(true)
    expect(fake.loopStops).toEqual(["hum.m4a"])
    hide(false)
    expect(fake.loopStarts).toEqual(["hum.m4a", "hum.m4a"])
  })

  it("a loop nobody registered plays and fetches nothing", async () => {
    const { service, fake, loader } = setup()
    service.unlock()
    service.loop("test.nobody")
    await loader.settle()
    expect(loader.calls).toEqual([])
    expect(fake.loopStarts).toEqual([])
  })
})
