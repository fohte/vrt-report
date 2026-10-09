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
      // vite.config.ts/vitest.config.ts are loaded through Vite's own
      // esbuild-based config loader, which doesn't resolve the package.json
      // "imports" field, unlike the Rollup pipeline that bundles the package
      // itself. .storybook/vitest.setup.ts imports its sibling
      // .storybook/preview.ts by relative path because that file lives outside
      // src/, the only directory the "imports" field maps.
      files: [
        '.storybook/vitest.setup.ts',
        '.storybook/vitest.setup.screenshot.ts',
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
