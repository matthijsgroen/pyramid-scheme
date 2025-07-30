// https://stackoverflow.com/a/47593316/2076990

export const mulberry32 = (seed: number) => (): number => {
  let t = (seed += 0x6d2b79f5)
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export const generateNewSeed = (seed: number, index: number) => {
  const random = mulberry32(seed)
  for (let i = 0; i < index; i++) {
    random()
  }
  return Math.round(random() * 10e15)
}

// https://stackoverflow.com/a/2450976
export const shuffle = <T>(
  array: T[],
  random: () => number = Math.random
): T[] => {
  const newList = array.slice()
  let currentIndex = newList.length

  // While there remain elements to shuffle...
  while (currentIndex != 0) {
    // Pick a remaining element...
    const randomIndex = Math.floor(random() * currentIndex)
    currentIndex--

    // And swap it with the current element.
    ;[newList[currentIndex], newList[randomIndex]] = [
      newList[randomIndex],
      newList[currentIndex],
    ]
  }
  return newList
}
