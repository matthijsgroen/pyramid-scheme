import type { Preview } from "@storybook/react-vite"
import { I18nextProvider } from "react-i18next"
import i18n from "./i18n"
import "../src/index.css"
import { Suspense, useEffect, useState } from "react"
import { listenForPageLayers } from "../src/app/input/pageLayers"

const withI18next = (Story, context) => {
  const { locale } = context.globals

  // When the locale global changes
  // Set the new locale in i18n
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    i18n.changeLanguage(locale)
  }, [locale])

  return (
    <Suspense fallback={<div>loading translations...</div>}>
      <I18nextProvider i18n={i18n}>
        <Story />
      </I18nextProvider>
    </Suspense>
  )
}

// The input last used and the brand of pad, as the game marks them on <html>: cursors and focus rings draw for
// keys and pad only, and pad buttons wear the brand's look.
const withInput = (Story, context) => {
  const { input, pad } = context.globals

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const root = document.documentElement
    if (input) root.dataset.input = input
    else delete root.dataset.input
    if (pad) root.dataset.pad = pad
    else delete root.dataset.pad
  }, [input, pad])

  return <Story />
}

// A story with `parameters.pageLayers` takes keys as the game does: the encounter frame and dialogs it draws
// join the input stack, so a direction walks their buttons and Escape presses their way back.
const withPageLayers = (Story, context) => {
  const on = context.parameters.pageLayers === true
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [listening, setListening] = useState(false)

  // The story mounts once the listener is up: a frame announces itself as it mounts, and only once.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!on) return
    const stop = listenForPageLayers()
    setListening(true)
    return stop
  }, [on])

  return !on || listening ? <Story /> : null
}

const preview: Preview = {
  tags: ["autodocs"],
  parameters: {
    // The screens a painted backdrop has to hold up on: the toolbar's viewport button switches between them.
    viewport: {
      options: {
        phone: { name: "Phone", styles: { width: "390px", height: "844px" }, type: "mobile" },
        tablet: { name: "Tablet", styles: { width: "820px", height: "1180px" }, type: "tablet" },
        desktop: { name: "Desktop", styles: { width: "1440px", height: "900px" }, type: "desktop" },
        ultrawide: { name: "Ultrawide", styles: { width: "3440px", height: "1440px" }, type: "desktop" },
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [withI18next, withInput, withPageLayers],
}

export const globalTypes = {
  locale: {
    name: "Locale",
    description: "Internationalization locale",
    toolbar: {
      icon: "globe",
      items: [
        { value: "en", title: "English" },
        { value: "nl", title: "Nederlands" },
      ],
      showName: true,
    },
  },
  input: {
    name: "Input",
    description: "The input last used: keys and pad draw the board cursor",
    toolbar: {
      icon: "button",
      items: [
        { value: "touch", title: "Touch" },
        { value: "keys", title: "Keys" },
        { value: "pad", title: "Pad" },
      ],
      showName: true,
    },
  },
  pad: {
    name: "Pad",
    description: "The brand of pad: which face buttons pad glyphs wear",
    toolbar: {
      icon: "controls",
      items: [
        { value: "xbox", title: "Xbox" },
        { value: "playstation", title: "PlayStation" },
      ],
      showName: true,
    },
  },
}

export default preview
