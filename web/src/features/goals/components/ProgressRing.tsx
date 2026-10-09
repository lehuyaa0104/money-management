const RADIUS = 26
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const percentFormatter = new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 0 })

/** Circular progress on a frosted disc, for use over a photo. */
export default function ProgressRing({ progress, color }: { progress: number; color: string }) {
  const clamped = Math.min(Math.max(progress, 0), 1)

  return (
    <div className="grid size-18 place-items-center rounded-full bg-black/30 backdrop-blur-sm">
      <svg viewBox="0 0 64 64" className="col-start-1 row-start-1 size-16 -rotate-90" aria-hidden="true">
        <circle cx="32" cy="32" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="5" />
        <circle
          cx="32"
          cy="32"
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${clamped * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
        />
      </svg>
      <span className="col-start-1 row-start-1 text-sm font-bold text-white">{percentFormatter.format(clamped)}</span>
    </div>
  )
}
