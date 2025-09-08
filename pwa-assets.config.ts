import {
  defineConfig,
  minimal2023Preset as preset,
  combinePresetAndAppleSplashScreens,
} from "@vite-pwa/assets-generator/config"

export default defineConfig({
  headLinkOptions: {
    preset: "2023",
  },
  preset: combinePresetAndAppleSplashScreens(
    preset,
    {
      padding: 0.3,
      resizeOptions: { background: "white", fit: "contain" },
      // by default, dark splash screens are excluded
      // darkResizeOptions: { background: 'black' },
      linkMediaOptions: {
        // will log the links you need to add to your html pages
        log: true,
        // add screen to media attribute link?
        // by default:
        // <link rel="apple-touch-startup-image" href="..." media="screen and ...">
        addMediaScreen: true,
        basePath: "/", // base path for href attribute
        // add closing link tag?
        // by default:
        // <link rel="apple-touch-startup-image" href="..." media="...">
        // with xhtml enabled:
        // <link rel="apple-touch-startup-image" href="..." media="..." />
        xhtml: false,
      },
      png: {
        compressionLevel: 9,
        quality: 60,
      },
      name: (landscape, size, dark) => {
        return `apple-splash-${landscape ? "landscape" : "portrait"}-${typeof dark === "boolean" ? (dark ? "dark-" : "light-") : ""}${size.width}x${size.height}.png`
      },
    },
    [
      "iPhone 14 Pro Max",
      "iPhone 14 Plus",
      "iPhone 13 Pro Max",
      "iPhone 12 Pro Max",
      "iPhone 14 Pro",
      "iPhone 14",
      "iPhone 13 Pro",
      "iPhone 13",
      "iPhone 12 Pro",
      "iPhone 12",
      "iPhone 13 mini",
      "iPhone 12 mini",
      "iPhone 11 Pro",
      "iPhone XS",
      "iPhone X",
      "iPhone 11 Pro Max",
      "iPhone XS Max",
      "iPhone 11",
      "iPhone XR",
      "iPhone 8 Plus",
      "iPhone 7 Plus",
      "iPhone 6s Plus",
      "iPhone 6 Plus",
      "iPhone 8",
      "iPhone 7",
      "iPhone 6s",
      "iPhone 6",

      'iPad Pro 12.9"',
      'iPad Pro 11"',
      'iPad Pro 10.5"',
      'iPad Air 10.5"',
      'iPad 10.2"',
      'iPad 9.7"',
      'iPad Air 9.7"',
      'iPad Pro 9.7"',
      'iPad mini 7.9"',
    ]
  ),
  images: ["public/fez-logo.svg"],
})
