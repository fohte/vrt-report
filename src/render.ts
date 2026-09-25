import type { ReportModel, ReportVariant } from '#report-model'

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
  template: string,
  styles: string,
  clientScript: string,
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

  return template
    .replace('__VRT_REPORT_STYLES__', () => styles)
    .replace('__VRT_REPORT_DATA__', () => data)
    .replace('__VRT_REPORT_CLIENT__', () => clientScript)
}
