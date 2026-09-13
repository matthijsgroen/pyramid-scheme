import { Component, type ErrorInfo, type ReactNode } from "react"

/**
 * The last thing standing when something throws during render.
 *
 * WITHOUT IT A THROW IS A BLACK SCREEN. React unmounts the whole tree when nothing catches, so every
 * crash looks identical from the outside and tells the player — and whoever they report it to —
 * nothing at all. This game is played on a phone, where there is no console to open: what the screen
 * says IS the bug report.
 *
 * **It does not use `useTranslation`, and that is deliberate.** Everything else in the app is
 * localised, but this screen has to render when the app is broken, and i18n is one of the things that
 * can be broken. A crash screen that needs a working app to say "the app crashed" says nothing.
 */
export class CrashBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Kept for a desktop session with devtools open; the screen below is what a phone gets.
    console.error("Crash:", error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 overflow-auto bg-stone-900 p-6 text-stone-200">
        <h1 className="font-pyramid text-2xl text-amber-400">The dig hit a wall</h1>
        <p className="max-w-sm text-center text-sm">
          Something went wrong and this screen could not be drawn. Your progress is saved.
        </p>
        {/* The message verbatim, because a tester reading it aloud is the only channel this has. */}
        <pre className="max-h-64 max-w-full overflow-auto rounded bg-black/50 p-3 text-xs whitespace-pre-wrap text-rose-300">
          {error.message}
          {error.stack ? `\n\n${error.stack}` : ""}
        </pre>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-amber-700 px-6 py-3 font-bold text-amber-100"
        >
          Reload
        </button>
      </div>
    )
  }
}
