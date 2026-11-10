'use client'

import { ExternalLink, ImageOff, Play } from 'lucide-react'

const stop = (e) => e.stopPropagation()

/**
 * Meta CDN URLs are signed and expire, so media is rendered with plain
 * <img>/<video> rather than next/image.
 */
export default function AdMedia({ ad, large = false }) {
  const aspect = large ? 'max-h-[60dvh]' : 'aspect-[4/5]'

  if (ad.isVideo && ad.video?.source) {
    return (
      <div className={`relative w-full overflow-hidden bg-black ${aspect}`} onClick={stop} onKeyDown={stop}>
        <video
          src={ad.video.source}
          poster={ad.video.poster || undefined}
          controls
          playsInline
          preload="none"
          className={`h-full w-full ${large ? 'max-h-[60dvh] object-contain' : 'object-cover'}`}
          onClick={stop}
        />
      </div>
    )
  }

  const src = ad.isVideo ? ad.video?.poster || ad.image : ad.image
  return (
    <div className={`relative w-full overflow-hidden bg-surface-2 ${aspect}`}>
      {src ? (
        <img
          src={src}
          alt={ad.title}
          loading="lazy"
          referrerPolicy="no-referrer"
          className={`h-full w-full ${large ? 'max-h-[60dvh] object-contain' : 'object-cover transition-transform duration-500 group-hover:scale-[1.03]'}`}
        />
      ) : (
        <div className="flex h-full min-h-48 w-full items-center justify-center text-faint">
          <ImageOff className="h-8 w-8" aria-hidden="true" />
        </div>
      )}
      {ad.isVideo ? (
        <>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-black shadow-pop">
              <Play className="ml-0.5 h-6 w-6 fill-current" aria-hidden="true" />
            </span>
          </div>
          {ad.video?.permalink ? (
            <a
              href={ad.video.permalink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={stop}
              onKeyDown={stop}
              className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-black/85"
            >
              View on Facebook <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
