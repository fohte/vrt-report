import { type Result } from 'neverthrow'
import { describe, expect, it } from 'vitest'

import { buildReportModel, parseRegOutput } from '#report-model'

const resultSpec = <Value>(result: Result<Value, Error>) =>
  result.match(
    (value) => ({ kind: 'ok' as const, value }),
    (error) => ({ kind: 'error' as const, message: error.message }),
  )

describe('buildReportModel', () => {
  it('counts passed items without creating standalone stories', () => {
    expect(
      resultSpec(
        buildReportModel({
          failedItems: [],
          newItems: [],
          deletedItems: [],
          passedItems: ['desktop/ui/example-card.stories.tsx/opens-panel.png'],
        }),
      ),
    ).toEqual({
      kind: 'ok',
      value: {
        counts: { changed: 0, new: 0, deleted: 0, passed: 1 },
        stories: [],
      },
    })
  })

  it('rejects screenshot keys with parent-directory segments', () => {
    expect(
      resultSpec(
        buildReportModel({
          failedItems: ['desktop/../../outside.stories.tsx/opens-panel.png'],
          newItems: [],
          deletedItems: [],
          passedItems: [],
        }),
      ),
    ).toEqual({
      kind: 'error',
      message:
        'Invalid screenshot key: desktop/../../outside.stories.tsx/opens-panel.png',
    })
  })

  it('accepts flat and nested screenshot keys without Storybook file semantics', () => {
    expect(
      resultSpec(
        buildReportModel({
          failedItems: [
            'screenshots/site/view-dark-phone.png',
            'single-view.png',
          ],
          newItems: [],
          deletedItems: [],
          passedItems: [],
        }),
      ),
    ).toEqual({
      kind: 'ok',
      value: {
        counts: { changed: 2, new: 0, deleted: 0, passed: 0 },
        stories: [
          {
            id: 'screenshots/site/view-dark-phone.png',
            storyId: 'view-dark-phone',
            component: 'site',
            sourcePath: 'screenshots/site',
            directories: ['screenshots'],
            variants: [
              {
                name: 'default',
                status: 'changed',
                key: 'screenshots/site/view-dark-phone.png',
              },
            ],
          },
          {
            id: 'single-view.png',
            storyId: 'single-view',
            component: 'Screenshots',
            sourcePath: '',
            directories: [],
            variants: [
              { name: 'default', status: 'changed', key: 'single-view.png' },
            ],
          },
        ],
      },
    })
  })
})

describe('parseRegOutput', () => {
  it('returns an error for malformed JSON', () => {
    expect(resultSpec(parseRegOutput('{'))).toEqual({
      kind: 'error',
      message: 'out.json is not valid JSON',
    })
  })
})
