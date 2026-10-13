import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^#vrt-components\/comparison-model$/,
        replacement: fileURLToPath(
          new URL('./src/components/comparison-model.ts', import.meta.url),
        ),
      },
      {
        find: /^#vrt-components\/(.+)$/,
        replacement: `${fileURLToPath(new URL('./src/components/', import.meta.url))}$1.tsx`,
      },
      {
        find: /^#storybook\.css$/,
        replacement: fileURLToPath(
          new URL('./src/storybook.css', import.meta.url),
        ),
      },
      {
        find: /^#test-fixtures\/(.+)$/,
        replacement: `${fileURLToPath(new URL('./test/fixtures/', import.meta.url))}$1.ts`,
      },
      {
        find: /^#(?!(?:utils|padding)$|components\/)(.+)$/,
        replacement: `${fileURLToPath(new URL('./src/', import.meta.url))}$1.ts`,
      },
    ],
  },
  test: {
    // Spelled out (matching Vitest's own default) so knip's static analysis
    // of this file can resolve test entry files; Vitest's own runtime
    // behavior is unchanged.
    include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)'],
  },
})
