# Looking at the app in a browser

Rendering and interaction are checked by looking — screenshots, the live DOM, IndexedDB — so agents open
browsers, dev servers and Storybook often, and often several at once. These rules keep that from leaving
the machine full of stray processes or one agent driving another's tab.

## Close what you open

- **Every browser, context and page you open, you close** — `browser_close` for the Playwright MCP browser,
  `await browser.close()` in a `finally` for a script. A screenshot taken is not the end of the check; the
  close is.
- **Every server you start, you stop** — a `yarn dev` or Storybook you launched, killed by the PID you
  launched before you report. Never stop one you did not start: a Storybook already running belongs to
  someone else (the user keeps one on 6007) — reuse it and leave it running.
- Start your own server on a **free port**, never the default 9164 the user plays on.

## One shared browser

The Playwright MCP browser is **one browser for the whole session**. Two agents using it at once navigate
each other's tabs mid-check. So:

- A **subagent** drives its own headless Chromium from a small script in its scratchpad, unless it knows it
  is the only one looking.
- A check of a **fresh start** runs in a fresh browser context, never in a profile that holds a save.

## Where the evidence goes

Screenshots go to `.playwright-mcp/` in the repository (gitignored), named for what they show, so the
report can point at them.
