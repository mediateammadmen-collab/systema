import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseAdName } from './adName.js'

const cases = [
  // [input, expected title, expected format]
  ['iPhone | Static | Summer Promo', 'iPhone | Summer Promo', 'Static'],
  ['Static - iPhone 15 launch', 'iPhone 15 launch', 'Static'],
  ['Static | Toothbrush', 'Toothbrush', 'Static'],
  ['Toothbrush | Static', 'Toothbrush', 'Static'],
  ['Toothbrush - Static', 'Toothbrush', 'Static'],
  ['Toothbrush -Static', 'Toothbrush', 'Static'],
  ['Toothbrush- Static', 'Toothbrush', 'Static'],
  ['Toothbrush|Dynamic|Offer', 'Toothbrush|Offer', 'Dynamic'],
  ['Dyanmic | Offer', 'Offer', 'Dynamic'],
  ['Offer | Carousel', 'Offer', 'Carousel'],
  ['Reel - Morning routine', 'Morning routine', 'Reel'],
  ['Influencer Reel | Top influencers love Systema', 'Top influencers love Systema', 'Influencer Reel'],
  ['Influcner Video - Smile', 'Smile', 'Influencer Video'],
  ['influencer video | Smile', 'Smile', 'Influencer Video'],
  ['e-commerce | Reel', 'e-commerce', 'Reel'],
  ['e-commerce launch', 'e-commerce launch', null],
  ['Dynamic Island showcase', 'Dynamic Island showcase', null],
  ['iPhone | Dynamic Island | Static', 'iPhone | Dynamic Island', 'Static'],
  ['Static-Shot | Promo', 'Static-Shot | Promo', null],
  ['Reels are fun', 'Reels are fun', null],
  ['Dark Content - Top influencers love Systema', 'Dark Content - Top influencers love Systema', null],
  ['FB Reach |  Have you tried Bangladesh’s most trending toothbrush', 'FB Reach | Have you tried Bangladesh’s most trending toothbrush', null],
  ['- Static - Promo -', 'Promo', 'Static'],
  ['| Promo | Static |', 'Promo', 'Static'],
  ['Static', 'Static', 'Static'],
  ['সিস্টেমা | Static | দাঁতের যত্ন', 'সিস্টেমা | দাঁতের যত্ন', 'Static'],
  ['Promo — Carousel — Bundle', 'Promo — Bundle', 'Carousel'],
  ['', 'Untitled ad', null],
]

for (const [input, title, format] of cases) {
  test(`parseAdName(${JSON.stringify(input)})`, () => {
    assert.deepEqual(parseAdName(input), { title, format })
  })
}
