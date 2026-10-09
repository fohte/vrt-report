import { describe, expect, it } from 'vitest'

import {
  type ComparisonVariant,
  getComparisonPanes,
  hasDiffMarkers,
} from '#vrt-components/comparison'

const changed: ComparisonVariant = {
  name: 'sample',
  status: 'changed',
  before: 'before.png',
  after: 'after.png',
  diff: null,
  diffRegions: {
    width: 320,
    height: 180,
    rectangles: [{ x: 10, y: 20, width: 30, height: 40 }],
  },
}

describe('comparison panes', () => {
  it('shows only the current image for a new variant', () => {
    expect(
      getComparisonPanes({ ...changed, status: 'new', before: null }, 'pair'),
    ).toEqual([{ label: 'After', source: 'after.png' }])
  })

  it('shows only the baseline image for a deleted variant', () => {
    expect(
      getComparisonPanes(
        { ...changed, status: 'deleted', after: null },
        'pair',
      ),
    ).toEqual([{ label: 'Before', source: 'before.png' }])
  })

  it('shows one current image for an unchanged variant', () => {
    expect(
      getComparisonPanes(
        { ...changed, status: 'unchanged', before: null },
        'pair',
      ),
    ).toEqual([{ label: 'Current', source: 'after.png' }])
  })

  it('shows before and after images for a changed variant', () => {
    expect(getComparisonPanes(changed, 'pair')).toEqual([
      { label: 'Before', source: 'before.png' },
      { label: 'After', source: 'after.png' },
    ])
  })

  it('keeps an unavailable diff pane so its fallback can render', () => {
    expect(getComparisonPanes(changed, 'diff')).toEqual([
      { label: 'Diff', source: null },
    ])
  })
})

describe('difference markers', () => {
  it('shows markers for changed variants with non-empty regions', () => {
    expect(hasDiffMarkers(changed)).toEqual(true)
  })

  it('hides markers for statuses other than changed', () => {
    expect(hasDiffMarkers({ ...changed, status: 'new' })).toEqual(false)
  })

  it('hides markers when no regions are available', () => {
    expect(
      hasDiffMarkers({
        ...changed,
        diffRegions: { width: 320, height: 180, rectangles: [] },
      }),
    ).toEqual(false)
  })
})
