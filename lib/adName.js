// Parses the format tag out of an ad name, e.g. "iPhone | Static | Promo" or
// "Static - iPhone 15". A tag only counts when it is a WHOLE segment, so
// "Dynamic Island" or "e-commerce" are never touched.

const FORMAT_TAGS = [
  { label: 'Influencer Reel', pattern: /^(influencer|influcner)\s+reel$/i },
  { label: 'Influencer Video', pattern: /^(influencer|influcner)\s+video$/i },
  { label: 'Static', pattern: /^static$/i },
  { label: 'Dynamic', pattern: /^(dynamic|dyanmic)$/i },
  { label: 'Carousel', pattern: /^carousel$/i },
  { label: 'Reel', pattern: /^reels?$/i },
]

// Separators: "|" (any spacing), or a dash/en dash/em dash with whitespace on
// at least one side. "e-commerce" (no whitespace) is not a separator.
const SEPARATOR = /(\s*\|\s*|\s+[-–—]\s*|\s*[-–—]\s+)/

function matchTag(segment) {
  const text = segment.trim()
  if (!text) return null
  for (const tag of FORMAT_TAGS) {
    if (tag.pattern.test(text)) return tag.label
  }
  return null
}

function stripEdges(text) {
  return text
    .replace(/^[\s|\-–—]+/, '')
    .replace(/[\s|\-–—]+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * @param {string} name
 * @returns {{ title: string, format: string | null }}
 */
export function parseAdName(name) {
  const original = typeof name === 'string' ? name : ''
  // split with a capture group keeps separators at odd indexes
  const parts = original.split(SEPARATOR)
  let format = null

  for (let i = 0; i < parts.length; i += 2) {
    const tag = matchTag(parts[i])
    if (!tag) continue
    format = tag
    // remove the tag plus one neighbouring separator (prefer the one after it)
    if (i + 1 < parts.length) parts.splice(i, 2)
    else if (i > 0) parts.splice(i - 1, 2)
    else parts.splice(i, 1)
    break
  }

  const title = stripEdges(parts.join(''))
  return { title: title || stripEdges(original) || 'Untitled ad', format }
}
