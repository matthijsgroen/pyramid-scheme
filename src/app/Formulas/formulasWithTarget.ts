import type { Formula, Operation } from "./formulas"

// Helper to evaluate a formula tree (module scope)
const evalFormula = (node: Formula | { symbol: number } | number): number => {
  if (typeof node === "number") return node
  if (typeof node === "object" && node !== null && "symbol" in node) {
    return node.symbol
  }
  if (typeof node === "object" && node !== null) {
    const l = evalFormula(node.left)
    const r = evalFormula(node.right)
    switch (node.operation) {
      case "+":
        return l + r
      case "-":
        return l - r
      case "*":
        return l * r
      case "/":
        return r !== 0 && Number.isInteger(l / r) ? l / r : NaN
      default:
        return NaN
    }
  }
  return NaN
}

/**
 * Attempts to build a Formula using picked numbers (each 1-3 times), allowedOps, and possibly one extra number (1-10),
 * to reach any of the targets. Each picked number must be used at least once. Returns the first valid formula found.
 */
export const findFormulaWithOptionalExtra = (
  picked: number[],
  allowedOps: Operation[],
  targets: number[],
  random = Math.random,
  sampleSize: "low" | "medium" | "high" = "low",
  maxDepth: number = 10
): Formula | undefined => {
  // Helper to count occurrences in an array
  const countOccurrences = (arr: number[]): Record<number, number> => {
    const map: Record<number, number> = {}
    for (const n of arr) map[n] = (map[n] || 0) + 1
    return map
  }

  // Helper to check if all picked numbers are used at least once
  const usesAllPicked = (
    formula: Formula | { symbol: number } | undefined,
    picked: number[]
  ): boolean => {
    if (!formula) return false
    const used: number[] = []
    const visit = (node: Formula | { symbol: number } | number) => {
      if (typeof node === "number") return
      if (typeof node === "object" && node !== null && "symbol" in node) {
        used.push(node.symbol)
      } else if (typeof node === "object" && node !== null) {
        const f = node as Formula
        if (f.left !== undefined) visit(f.left)
        if (f.right !== undefined) visit(f.right)
      }
    }
    visit(formula)
    return picked.every((num) => used.includes(num))
  }

  // Helper to check if picked numbers are used at least once and at most 3 times
  const usesPickedAtMost3 = (
    formula: Formula | { symbol: number } | undefined,
    picked: number[]
  ): boolean => {
    if (!formula) return false
    const used: number[] = []
    const visit = (node: Formula | { symbol: number } | number) => {
      if (typeof node === "number") return
      if (typeof node === "object" && node !== null && "symbol" in node) {
        used.push(node.symbol)
      } else if (typeof node === "object" && node !== null) {
        const f = node as Formula
        if (f.left !== undefined) visit(f.left)
        if (f.right !== undefined) visit(f.right)
      }
    }
    visit(formula)
    const usedCount = countOccurrences(used)
    return picked.every(
      (num) => usedCount[num] && usedCount[num] >= 1 && usedCount[num] <= 3
    )
  }

  // Instead of generating all, sample a reasonable number of random pools
  const sampleCount = Math.max(
    10,
    Math.min({ low: 20, medium: 50, high: 100 }[sampleSize], picked.length * 5)
  )
  const generateRandomNumberPools = (): number[][] => {
    const pools: number[][] = []
    for (let s = 0; s < sampleCount; ++s) {
      // For each picked number, pick a random count 1-3
      const counts = picked.map(() => 1 + Math.floor(random() * 3))
      let pool: number[] = []
      for (let i = 0; i < picked.length; ++i) {
        pool = pool.concat(Array(counts[i]).fill(picked[i]))
      }
      pools.push(pool)
    }
    return pools
  }

  // Try all possible extra numbers (0 or 1 extra, 1-10)
  for (let extra = 0; extra <= 10; ++extra) {
    const tryExtra = extra === 0 ? undefined : extra
    for (const pool of generateRandomNumberPools()) {
      const fullPool = tryExtra ? [...pool, tryExtra] : pool
      // Try all targets
      for (const target of targets) {
        // Try to build a formula from fullPool to target
        const formula = buildFormulaForTargetAllowReuse(
          fullPool,
          allowedOps,
          target,
          tryExtra,
          picked,
          target, // pass target for symbol marking
          maxDepth
        )
        if (
          formula &&
          usesAllPicked(formula, picked) &&
          usesPickedAtMost3(formula, picked)
        ) {
          // If extra was used, ensure it appears in the formula
          if (
            !tryExtra ||
            (formula && JSON.stringify(formula).includes(tryExtra.toString()))
          ) {
            return formula
          }
        }
      }
    }
  }
  return undefined
}

// Helper: build a formula for a target using numbers (each can be used unlimited times), allowedOps
const buildFormulaForTargetAllowReuse = (
  numbers: number[],
  allowedOps: Operation[],
  target: number,
  extra?: number,
  picked?: number[],
  targetForSymbol?: number | number[],
  maxDepth: number = 10
): Formula | undefined => {
  // Memoization: key = sorted numbers + target
  const memo = new Map<string, Formula | undefined>()
  // Helper to check if a number is from picked or target
  const isSymbol = (n: number): boolean => {
    if (picked && picked.includes(n)) return true
    if (typeof targetForSymbol === "number" && n === targetForSymbol)
      return true
    if (Array.isArray(targetForSymbol) && targetForSymbol.includes(n))
      return true
    return false
  }

  function makeLeaf(n: number): { symbol: number } | number {
    if (
      extra !== undefined &&
      n === extra &&
      (!picked || !picked.includes(n))
    ) {
      return n
    }
    if (isSymbol(n)) return { symbol: n }
    return n
  }

  const helper = (
    pool: number[],
    currentDepth: number = 0
  ): Formula | undefined => {
    if (currentDepth >= maxDepth) return undefined
    if (pool.length < 2) return undefined
    const key =
      pool
        .slice()
        .sort((a, b) => a - b)
        .join(",") +
      ":" +
      target
    if (memo.has(key)) return memo.get(key)
    for (let i = 0; i < pool.length; i++) {
      for (let j = 0; j < pool.length; j++) {
        if (i === j) continue
        const a = pool[i]
        const b = pool[j]
        const rest = pool.filter((_, idx) => idx !== i && idx !== j)
        for (const op of allowedOps) {
          let result: number | undefined
          switch (op) {
            case "+":
              result = a + b
              break
            case "*":
              result = a * b
              break
            case "-":
              result = a - b
              break
            case "/":
              if (b !== 0 && Number.isInteger(a / b)) result = a / b
              break
          }
          if (result === target) {
            const f = {
              left: makeLeaf(a),
              right: makeLeaf(b),
              operation: op,
              result: { symbol: target },
            }
            // Ensure the formula actually evaluates to the target
            if (evalFormula(f) === target) {
              memo.set(key, f)
              return f
            }
          }
          if (result !== undefined && rest.length > 0) {
            const sub = helper([result, ...rest], currentDepth + 1)
            if (sub) {
              const f = {
                left: {
                  left: makeLeaf(a),
                  right: makeLeaf(b),
                  operation: op,
                  result: result,
                },
                right: (sub as Formula).right,
                operation: (sub as Formula).operation,
                result: (sub as Formula).result,
              }
              // Ensure the formula actually evaluates to the target
              if (evalFormula(f) === target) {
                memo.set(key, f)
                return f
              }
            }
          }
        }
      }
    }
    memo.set(key, undefined)
    return undefined
  }
  return helper(numbers, 0)
}
