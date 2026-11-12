// @vitest-environment jsdom
import { act, cleanup, render, renderHook } from "@testing-library/react"
import { use, type PropsWithChildren } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

// The constant as a build without the tools folds it: nothing behind it exists.
vi.mock("@/app/dev/devToolsBuild", () => ({ DEV_TOOLS: false, DevTools: undefined, LockEditorHost: undefined }))
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en", changeLanguage: vi.fn() } }),
}))
vi.mock("@/support/useGameStorage", () => ({
  useGameStorage: () => [true, vi.fn(), true],
  clearGameData: vi.fn(),
}))

const { DevelopContext, DevelopModeProvider } = await import("@/contexts/DevelopMode")
const { SettingsModal } = await import("@/app/SettingsModal")

afterEach(cleanup)

describe("a build without the developer tools", () => {
  it("never enters develop mode, whatever asks for it", () => {
    const { result } = renderHook(() => use(DevelopContext), {
      wrapper: ({ children }: PropsWithChildren) => <DevelopModeProvider>{children}</DevelopModeProvider>,
    })

    act(() => result.current.setDevelopMode(true))

    expect(result.current.isDevelopMode).toBe(false)
  })

  it("shows no dev tool in settings, even in develop mode", () => {
    const { container } = render(
      <DevelopContext.Provider value={{ isDevelopMode: true, setDevelopMode: () => {} }}>
        <SettingsModal isOpen onClose={vi.fn()} startGame={vi.fn()} />
      </DevelopContext.Provider>
    )

    expect(container.textContent).not.toContain("Playtesting tools")
    expect(container.textContent).not.toContain("devLockEditor.open")
  })
})
