import { describe, expect, it } from 'vitest'

import { parseEmbeddedReport } from '#report-data'
import { changedStory } from '#vrt-components/report-fixtures'

const resultSpec = (result: ReturnType<typeof parseEmbeddedReport>) =>
  result.match(
    (value) => ({ kind: 'ok' as const, value }),
    (error) => ({ kind: 'error' as const, message: error.message }),
  )

describe('parseEmbeddedReport', () => {
  it('parses a valid report payload', () => {
    const source = JSON.stringify({ stories: [changedStory] })

    expect(resultSpec(parseEmbeddedReport(source))).toEqual({
      kind: 'ok',
      value: { stories: [changedStory] },
    })
  })

  it('returns an error for malformed JSON', () => {
    expect(resultSpec(parseEmbeddedReport('{'))).toEqual({
      kind: 'error',
      message: 'Embedded report is not valid JSON',
    })
  })

  it('returns an error when a report variant is missing image fields', () => {
    const source = JSON.stringify({
      stories: [
        {
          ...changedStory,
          variants: [{ name: 'wide', status: 'changed' }],
        },
      ],
    })

    expect(resultSpec(parseEmbeddedReport(source))).toEqual({
      kind: 'error',
      message: 'Embedded report has an invalid shape',
    })
  })
})
