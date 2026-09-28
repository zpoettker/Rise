const RAYS = Array.from({ length: 12 }, (_, i) => i * 30)

export function Sun({ size = 120, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <radialGradient id="sun-core" cx="42%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#fff1c9" />
          <stop offset="45%" stopColor="#ffc857" />
          <stop offset="100%" stopColor="#f7962b" />
        </radialGradient>
        <radialGradient id="sun-glow" r="50%">
          <stop offset="40%" stopColor="#ffc857" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ffc857" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="60" cy="60" r="60" fill="url(#sun-glow)" />
      <g className="origin-center animate-spin-slow">
        {RAYS.map((deg) => (
          <rect
            key={deg}
            x="58"
            y="8"
            width="4"
            height="14"
            rx="2"
            fill="#ffb23e"
            opacity="0.7"
            transform={`rotate(${deg} 60 60)`}
          />
        ))}
      </g>
      <circle cx="60" cy="60" r="28" fill="url(#sun-core)" />
    </svg>
  )
}
