import { readFileSync } from 'node:fs'

import { Result } from 'neverthrow'
import { describe, expect, it } from 'vitest'

import { renderReport } from '#render'
import type { ReportModel } from '#report-model'

const template = readFileSync(
  new URL('./report-template.html', import.meta.url),
  'utf8',
)
const styles = [
  readFileSync(new URL('./report-styles.css', import.meta.url), 'utf8'),
  readFileSync(new URL('./report-responsive.css', import.meta.url), 'utf8'),
].join('\n')
const clientScript = readFileSync(
  new URL('./report-client.js', import.meta.url),
  'utf8',
)

const embeddedData = (html: string) => {
  const source = html.match(
    /<script id="report-data" type="application\/json">([\s\S]*?)<\/script>/,
  )?.[1]
  if (source === undefined) return { kind: 'missing' as const }

  return Result.fromThrowable(
    (value: string) => JSON.parse(value) as unknown,
    () => undefined,
  )(source).match(
    (value) => ({ kind: 'ok' as const, value }),
    () => ({ kind: 'invalid' as const }),
  )
}

describe('renderReport', () => {
  it('preserves report text and encodes reserved URL characters safely', () => {
    const unsafeLabel =
      '</script><script>globalThis.compromised=true</script>&\u2028'
    const key = 'desktop/ui/example-card.stories.tsx/shows #1.png'
    const model: ReportModel = {
      counts: { changed: 1, new: 0, deleted: 0, passed: 0 },
      stories: [
        {
          id: unsafeLabel,
          storyId: unsafeLabel,
          component: 'example-card',
          sourcePath: 'ui/example-card.stories.tsx',
          directories: ['ui'],
          variants: [{ name: 'desktop', status: 'changed', key }],
        },
      ],
    }

    expect(
      embeddedData(
        renderReport(
          model,
          { assetsPrefix: 'assets' },
          template,
          styles,
          clientScript,
        ),
      ),
    ).toEqual({
      kind: 'ok',
      value: {
        counts: { changed: 1, new: 0, deleted: 0, passed: 0 },
        stories: [
          {
            id: unsafeLabel,
            storyId: unsafeLabel,
            component: 'example-card',
            sourcePath: 'ui/example-card.stories.tsx',
            directories: ['ui'],
            variants: [
              {
                name: 'desktop',
                status: 'changed',
                before:
                  '../../baseline/actual/desktop/ui/example-card.stories.tsx/shows%20%231.png',
                after:
                  'assets/actual/desktop/ui/example-card.stories.tsx/shows%20%231.png',
                diff: 'assets/diff/desktop/ui/example-card.stories.tsx/shows%20%231.png',
              },
            ],
          },
        ],
      },
    })
  })

  it('keeps image URLs relative when the report shares the assets directory', () => {
    const model: ReportModel = {
      counts: { changed: 1, new: 0, deleted: 0, passed: 0 },
      stories: [
        {
          id: 'screen.png',
          storyId: 'screen',
          component: 'Screenshots',
          sourcePath: '',
          directories: [],
          variants: [{ name: 'default', status: 'changed', key: 'screen.png' }],
        },
      ],
    }

    expect(
      embeddedData(
        renderReport(
          model,
          { assetsPrefix: '' },
          template,
          styles,
          clientScript,
        ),
      ),
    ).toEqual({
      kind: 'ok',
      value: {
        counts: { changed: 1, new: 0, deleted: 0, passed: 0 },
        stories: [
          {
            id: 'screen.png',
            storyId: 'screen',
            component: 'Screenshots',
            sourcePath: '',
            directories: [],
            variants: [
              {
                name: 'default',
                status: 'changed',
                before: '../../baseline/actual/screen.png',
                after: 'actual/screen.png',
                diff: 'diff/screen.png',
              },
            ],
          },
        ],
      },
    })
  })
})
