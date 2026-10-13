import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createStorybookProject } from '@fohte/storybook-addon/vitest-plugin'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

import { SCREENSHOT_VIEWPORT } from './.storybook/screenshot-viewport.ts'
import { reportSourceAliases } from './vitest.config.ts'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const storybookProject = createStorybookProject({
  name: 'storybook-screenshot-vrt-report',
  rootDir: dirname,
  viewport: SCREENSHOT_VIEWPORT,
  screenshotsSubdir: 'desktop',
  setupFiles: ['./.storybook/vitest.setup.screenshot.ts'],
})

export default defineConfig({
  ...storybookProject,
  resolve: {
    alias: reportSourceAliases,
  },
  // The Storybook Vitest project does not use the builder's Vite config.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- createStorybookProject exposes this plugin list as any[].
  plugins: [tailwindcss(), ...storybookProject.plugins],
  optimizeDeps: {
    // UI source imports JSX and renderer entry points that need CJS interop.
    include: ['react/jsx-runtime', 'react-dom'],
  },
})
