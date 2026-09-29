const RAYS = Array.from({ length: 12 }, (_, i) => i * 30)

// `celebrate` plays the hit celebration once: the glow flares and stays a
// little brighter, the rays swell, and two halo rings ripple outward. It waits
// for the page's own fade-in (animate-rise) to finish first.
export function Sun({ size = 120, className = '', celebrate = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      overflow="visible"
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

      <circle
        cx="60"
        cy="60"
        r="60"
        fill="url(#sun-glow)"
        className={celebrate ? 'origin-center animate-sun-flare [animation-delay:800ms]' : ''}
      />
      {celebrate &&
        [900, 1400].map((delay) => (
          <circle
            key={delay}
            cx="60"
            cy="60"
            r="30"
            fill="none"
            stroke="#ffc857"
            strokeWidth="3"
            className="origin-center animate-halo"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      <g className={celebrate ? 'origin-center animate-ray-burst [animation-delay:800ms]' : ''}>
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
      </g>
      <circle cx="60" cy="60" r="28" fill="url(#sun-core)" />
    </svg>
  )
}
