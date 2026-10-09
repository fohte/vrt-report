import type { DiffRegions } from '#report-model'

export type ComparisonStatus = 'changed' | 'new' | 'deleted' | 'unchanged'

export type ComparisonVariant = {
  name: string
  status: ComparisonStatus
  before: string | null
  after: string | null
  diff: string | null
  diffRegions?: DiffRegions | null
}

export type ComparisonMode =
  'pair' | 'diff' | 'slider' | 'slide' | '2up' | 'blend' | 'toggle'

export type ImageLabel = 'Before' | 'After' | 'Current' | 'Diff'

export type ComparisonPane = {
  label: ImageLabel
  source: string | null
}

const labelsByStatus: Record<ComparisonStatus, ImageLabel> = {
  changed: 'Before',
  new: 'After',
  deleted: 'Before',
  unchanged: 'Current',
}

export const getComparisonPanes = (
  variant: ComparisonVariant,
  mode: ComparisonMode,
): ComparisonPane[] => {
  if (variant.status !== 'changed') {
    const label = labelsByStatus[variant.status]
    const source = label === 'Before' ? variant.before : variant.after
    return [{ label, source }]
  }

  if (mode === 'diff') return [{ label: 'Diff', source: variant.diff }]

  const panes: ComparisonPane[] = [
    { label: 'Before', source: variant.before },
    { label: 'After', source: variant.after },
  ]
  return panes.filter((pane) => pane.source !== null)
}

export const hasDiffMarkers = (variant: ComparisonVariant): boolean => {
  const regions = variant.diffRegions
  return (
    variant.status === 'changed' &&
    regions !== null &&
    regions !== undefined &&
    regions.width > 0 &&
    regions.height > 0 &&
    regions.rectangles.length > 0
  )
}

export const formatComparisonStatus = (status: ComparisonStatus) =>
  status.charAt(0).toUpperCase() + status.slice(1)
