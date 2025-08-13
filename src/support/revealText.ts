export const revealText = (text: string, percentage?: number): string => {
  // replace characters with ? based on a noise pattern for natural reveal
  if (percentage === undefined || percentage <= 0) {
    return text.replace(/[a-zA-Z0-9]/g, "?")
  }
  if (percentage >= 1) {
    return text
  }

  // Simple pseudo-random number generator for consistent results
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000
    return x - Math.floor(x)
  }

  // Create a seed based on the text content for consistency
  const textSeed = text.split("").reduce((acc, char, index) => {
    return acc + char.charCodeAt(0) * (index + 1)
  }, 0)

  let letterIndex = 0
  const obfuscatedText = text.split("").map((char, charIndex) => {
    if (/[a-zA-Z]/.test(char)) {
      // Generate a consistent pseudo-random value for this letter position
      const randomValue = seededRandom(textSeed + letterIndex + charIndex)
      const shouldObfuscate = randomValue > percentage
      letterIndex++
      return shouldObfuscate ? "?" : char
    }
    return char
  })
  return obfuscatedText.join("")
}
