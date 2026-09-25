import { reportClient } from '#report-client'
import type { ReportModel, ReportVariant } from '#report-model'
import { reportStyles } from '#report-styles'

export const DEFAULT_BASELINE_DIR = '../../baseline/actual'

type RenderedVariant = Omit<ReportVariant, 'key'> & {
  before: string | null
  after: string | null
  diff: string | null
}

type RenderOptions = {
  assetsPrefix: string
  baselineDirectory?: string | undefined
}

const escapeScriptData = (value: unknown): string =>
  JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029')

const encodePath = (value: string): string =>
  value
    .split('/')
    .map((segment) =>
      segment === '.' || segment === '..'
        ? segment
        : encodeURIComponent(segment),
    )
    .join('/')

const imageUrl = (prefix: string, folder: string, key: string): string =>
  [prefix, folder, encodePath(key)]
    .filter((segment) => segment.length > 0)
    .join('/')

export const renderReport = (
  model: ReportModel,
  options: RenderOptions,
): string => {
  const assetsPrefix = encodePath(options.assetsPrefix)
  const baselineDirectory = encodePath(
    options.baselineDirectory ?? DEFAULT_BASELINE_DIR,
  )
  const stories = model.stories.map((story) => ({
    ...story,
    variants: story.variants.map(({ key, ...variant }) => {
      const actual = imageUrl(assetsPrefix, 'actual', key)
      const baseline = imageUrl(baselineDirectory, '', key)
      return {
        ...variant,
        before: variant.status === 'new' ? null : baseline,
        after:
          variant.status === 'deleted'
            ? null
            : variant.status === 'unchanged'
              ? baseline
              : actual,
        diff:
          variant.status === 'changed'
            ? imageUrl(assetsPrefix, 'diff', key)
            : null,
      } satisfies RenderedVariant
    }),
  }))
  const data = escapeScriptData({ ...model, stories })

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Visual regression report</title>
    <style>${reportStyles}</style>
  </head>
  <body>
    <header class="topbar">
      <div class="brand"><strong>VRT</strong><span>Visual regression report</span></div>
      <div class="summary" id="summary" aria-label="Change counts"></div>
      <div class="top-controls">
        <div class="filters" id="filters" role="group" aria-label="Filter changed stories"></div>
        <div class="view-modes" id="view-modes" role="group" aria-label="Image comparison mode"></div>
      </div>
    </header>
    <div class="workspace">
      <aside class="sidebar" aria-label="Story navigation">
        <label class="sr-only" for="story-search">Filter stories</label>
        <input class="search" id="story-search" type="search" placeholder="Filter stories" autocomplete="off">
        <nav id="story-tree" aria-label="Changed stories by directory"></nav>
      </aside>
      <main class="main">
        <div class="list-toolbar"><span class="list-count" id="list-count"></span></div>
        <section class="story-list" id="story-list" aria-label="Stories with visual changes"></section>
      </main>
    </div>
    <dialog id="detail-dialog" aria-labelledby="detail-title">
      <div class="detail-head">
        <strong class="detail-title" id="detail-title"></strong>
        <span class="detail-variant" id="detail-variant"></span>
        <button class="detail-close" id="detail-close" type="button" aria-label="Close detail">Close</button>
      </div>
      <div class="detail-content" id="detail-content"></div>
    </dialog>
    <script id="report-data" type="application/json">${data}</script>
    <script>${reportClient}</script>
  </body>
</html>
`
}
