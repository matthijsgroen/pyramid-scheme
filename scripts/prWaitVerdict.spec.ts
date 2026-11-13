import { describe, expect, it } from "vitest"
import { NO_RUN_POLLS, prVerdict } from "./prWaitVerdict"

const job = (bucket: string) => ({ name: "test", bucket })

describe(prVerdict, () => {
  it("reports a conflict at once, whatever the checks say, because a conflicting PR starts no run", () => {
    expect(prVerdict({ mergeable: "CONFLICTING", checks: [], polls: 1 })).toBe("conflict")
    expect(prVerdict({ mergeable: "CONFLICTING", checks: [job("pending")], polls: 1 })).toBe("conflict")
  })

  it("waits a few polls for a run to start, then says none is coming", () => {
    expect(prVerdict({ mergeable: "UNKNOWN", checks: [], polls: NO_RUN_POLLS - 1 })).toBe("waiting")
    expect(prVerdict({ mergeable: "MERGEABLE", checks: [], polls: NO_RUN_POLLS })).toBe("no-run")
  })

  it("waits while any job is pending", () => {
    expect(prVerdict({ mergeable: "MERGEABLE", checks: [job("pass"), job("pending")], polls: 9 })).toBe("waiting")
  })

  it("is green only when every job passed or was skipped", () => {
    expect(prVerdict({ mergeable: "MERGEABLE", checks: [job("pass"), job("skipping")], polls: 9 })).toBe("green")
    expect(prVerdict({ mergeable: "MERGEABLE", checks: [job("pass"), job("fail")], polls: 9 })).toBe("red")
    expect(prVerdict({ mergeable: "MERGEABLE", checks: [job("cancel")], polls: 9 })).toBe("red")
  })
})
