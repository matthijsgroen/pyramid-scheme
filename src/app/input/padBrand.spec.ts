import { describe, expect, it } from "vitest"
import { padBrandOf } from "./padBrand"

describe(padBrandOf, () => {
  it.each([
    "DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)",
    "054c-0ce6-DualSense Wireless Controller",
    "Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 09cc)",
    "DUALSHOCK 4 Wireless Controller",
    "Sony PlayStation(R)3 Controller",
  ])("reads a Sony pad as PlayStation: %s", id => {
    expect(padBrandOf(id)).toBe("playstation")
  })

  it.each([
    "Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)",
    "045e-02ea-Microsoft X-Box One S pad",
    "Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)",
    "",
  ])("reads every other pad as Xbox: %s", id => {
    expect(padBrandOf(id)).toBe("xbox")
  })
})
