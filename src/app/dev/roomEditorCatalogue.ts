// The browser reads no folder: the catalogued rooms come in through the bundler, by name, blocked rooms left out.
export const ROOM_CATALOGUE: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(
    import.meta.glob("../../game/rooms/**/*.room", { query: "?raw", import: "default", eager: true }) as Record<
      string,
      string
    >
  )
    .filter(([path]) => !path.endsWith("-blocked.room"))
    .map(([path, text]) => [path.slice(path.lastIndexOf("/") + 1, -".room".length), text])
)
