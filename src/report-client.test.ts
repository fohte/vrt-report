import { readFileSync } from 'node:fs'
import { Script } from 'node:vm'

import { Result } from 'neverthrow'
import { describe, expect, it } from 'vitest'

const reportClient = readFileSync(
  new URL('./report-client.js', import.meta.url),
  'utf8',
)

const clientScriptSpec = (source: string): { valid: boolean } => {
  const parsed = Result.fromThrowable(
    (script: string) => new Script(script),
    () => undefined,
  )(source)
  return parsed.match(
    () => ({ valid: true }),
    () => ({ valid: false }),
  )
}

describe('report client', () => {
  it('contains valid browser JavaScript', () => {
    expect(clientScriptSpec(reportClient)).toEqual({ valid: true })
  })
})
