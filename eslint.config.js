import { config } from '@fohte/eslint-config'
import storybook from 'eslint-plugin-storybook'

export default [
  { ignores: ['dist/**', 'storybook-static/**'] },
  ...config(
    {
      typescript: { typeChecked: true },
      errorHandling: {},
    },
    ...storybook.configs['flat/recommended'],
    {
      // Vite loads these config files directly, so they use relative imports
      // for config and setup files outside the package's source import map.
      files: [
        '.storybook/vitest.setup.ts',
        '.storybook/vitest.setup.screenshot.ts',
        'vitest.browser.config.ts',
        'vitest.screenshot.config.ts',
      ],
      rules: { 'no-restricted-imports': 'off' },
    },
    {
      files: ['**/*.stories.tsx'],
      rules: { 'fohte/require-story-name': 'error' },
    },
  ),
]
