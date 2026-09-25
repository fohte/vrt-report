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
})

describe('parseRegOutput', () => {
  it('returns an error for malformed JSON', () => {
    expect(resultSpec(parseRegOutput('{'))).toEqual({
      kind: 'error',
      message: 'out.json is not valid JSON',
    })
  })
})
