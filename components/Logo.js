'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Brand logo from /logo.png with a monogram fallback. A load failure that
 * happens before hydration fires no onError React can see, so we also check
 * the <img> element's state after mount.
 */
export default function Logo({ brand }) {
  const ref = useRef(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const img = ref.current
    if (img && img.complete && img.naturalWidth === 0) {
      setFailed(true)
    }
  }, [])

  return (
    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-accent to-accent-2 shadow-card ring-1 ring-black/5">
      {failed ? (
        <span className="text-lg font-extrabold text-white" aria-label={`${brand} logo`}>
          {brand.charAt(0).toUpperCase()}
        </span>
      ) : (
        <img
          ref={ref}
          src="/logo.png"
          alt={`${brand} logo`}
          width={40}
          height={40}
          className="h-full w-full bg-white object-contain p-1"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  )
}
