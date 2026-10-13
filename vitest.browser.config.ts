import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

import baseConfig from './vitest.config.ts'

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: ['src/components/*.browser-test.tsx'],
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
      headless: true,
    },
  },
})
