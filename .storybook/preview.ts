import '#storybook.css'

import {
  afterEach,
  beforeEach,
  configureUnhandledApiRequestCheck,
  parameters,
} from '@fohte/storybook-addon/preview'
import { withThemeByClassName } from '@storybook/addon-themes'
import type { Preview } from '@storybook/react-vite'

configureUnhandledApiRequestCheck({ pathPrefixes: ['/api/'] })

// @fohte/storybook-addon publishes only a `./preview` subpath export (no
// preset/manager entry), so listing it in main.ts's `addons` never wires its
// beforeEach/afterEach checks — they must be spread into this project's own
// preview annotations to actually run.
const preview: Preview = {
  parameters,
  beforeEach,
  afterEach,
  decorators: [
    withThemeByClassName({
      themes: {
        light: '',
        dark: 'dark',
      },
      defaultTheme: 'light',
    }),
  ],
}

export default preview
