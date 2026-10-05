import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const reportTemplate = readFileSync(
  new URL('../dist/report-template.html', import.meta.url),
  'utf8',
)

const clientAssets = (html: string) => ({
  externalScripts: [...html.matchAll(/<script\b[^>]*\bsrc\s*=/g)].length,
  externalStylesheets: [...html.matchAll(/<link\b[^>]*\brel="stylesheet"/g)]
    .length,
  inlineClientModules: [
    ...html.matchAll(/<script\b(?=[^>]*\btype="module")[^>]*>/g),
  ].length,
  inlineStylesheets: [...html.matchAll(/<style\b/g)].length,
})

describe('report client build', () => {
  it('inlines its JavaScript and CSS into one HTML file', () => {
    expect(clientAssets(reportTemplate)).toEqual({
      externalScripts: 0,
      externalStylesheets: 0,
      inlineClientModules: 1,
      inlineStylesheets: 1,
    })
  })
})
