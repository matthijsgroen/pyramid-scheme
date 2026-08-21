import { describe, expect, it } from "vitest"
import { bearingOf, digitalTime, handsSwapped, hourHandBearing, minuteHandBearing } from "./clockFace"

const at = (hour: number, minute: number) => hour * 60 + minute

describe("clock face", () => {
  it("points both hands up at twelve o'clock", () => {
    expect(hourHandBearing(at(12, 0))).toBe(0)
    expect(minuteHandBearing(at(12, 0))).toBe(0)
  })

  it("creeps the hour hand between the numerals as the minutes pass", () => {
    expect(hourHandBearing(at(3, 0))).toBe(90)
    expect(hourHandBearing(at(3, 30))).toBe(105)
    expect(minuteHandBearing(at(3, 30))).toBe(180)
  })

  it("reads a bearing back off the face, clockwise from the twelve", () => {
    expect(bearingOf(0, -1)).toBe(0)
    expect(bearingOf(1, 0)).toBe(90)
  })

  it("writes a twelve-hour reading with padded minutes", () => {
    expect(digitalTime(at(3, 5))).toBe("3:05")
    expect(digitalTime(at(12, 0))).toBe("12:00")
    expect(digitalTime(at(13, 45))).toBe("1:45")
  })

  it("swaps the hands into the time they would be misread as", () => {
    expect(digitalTime(handsSwapped(at(3, 45))!)).toBe("9:15")
    expect(digitalTime(handsSwapped(at(9, 15))!)).toBe("3:45")
    expect(handsSwapped(at(3, 47))).toBeUndefined()
  })
})
