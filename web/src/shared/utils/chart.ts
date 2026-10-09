export type Point = [x: number, y: number]

/**
 * Smooth path through the points that never overshoots them (monotone cubic,
 * Fritsch–Carlson), so a zero day can't dip below the baseline.
 */
export function monotonePath(points: Point[]): string {
  const n = points.length
  const dx = points.slice(0, -1).map(([x], i) => points[i + 1][0] - x)
  const slope = points.slice(0, -1).map(([, y], i) => (points[i + 1][1] - y) / dx[i])
  const tangent = points.map((_, i) => {
    if (i === 0) return slope[0]
    if (i === n - 1) return slope[n - 2]
    return slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2
  })
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      tangent[i] = 0
      tangent[i + 1] = 0
      continue
    }
    const a = tangent[i] / slope[i]
    const b = tangent[i + 1] / slope[i]
    const h = a * a + b * b
    if (h > 9) {
      const t = 3 / Math.sqrt(h)
      tangent[i] = t * a * slope[i]
      tangent[i + 1] = t * b * slope[i]
    }
  }

  let d = `M${points[0][0]},${points[0][1]}`
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[i + 1]
    const third = dx[i] / 3
    d += ` C${x0 + third},${y0 + tangent[i] * third} ${x1 - third},${y1 - tangent[i + 1] * third} ${x1},${y1}`
  }
  return d
}

/** Round up to a "nice" axis maximum: 1, 2, 2.5 or 5 × 10^k. */
export function niceMax(value: number): number {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const step = [1, 2, 2.5, 5, 10].find((m) => m * magnitude >= value) ?? 10
  return step * magnitude
}

// Income/expense series colors, validated as a pair with the dataviz skill
// (deutan ΔE 11 ≥ 8). Brighter reds (#dc2626, #ef4444) collapse into the green
// for red-green colorblind readers, so charts use the deeper red-700.
export const INCOME_COLOR = '#16a34a'
export const EXPENSE_COLOR = '#b91c1c'
