import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    rules: {
      // Meta CDN media URLs are signed and expire, so they must not go through
      // next/image optimisation/caching. We render them with plain <img>/<video>.
      '@next/next/no-img-element': 'off',
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', '.netlify/**', 'next-env.d.ts']),
])

export default eslintConfig
