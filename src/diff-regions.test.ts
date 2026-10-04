import { describe, expect, it } from 'vitest'

import { decodeDiffRegions } from '#diff-regions'
import { createDiffImage } from '#test-fixtures/diff-image'

describe('decodeDiffRegions', () => {
  it('groups nearby red pixels and keeps distant regions separate', () => {
    const result = decodeDiffRegions(createDiffImage()).match(
      (regions) => ({ kind: 'ok' as const, regions }),
      (error) => ({ kind: 'error' as const, message: error.message }),
    )

    expect(result).toEqual({
      kind: 'ok',
      regions: {
        width: 20,
        height: 16,
        rectangles: [
          { x: 2, y: 2, width: 3, height: 3 },
          { x: 17, y: 10, width: 1, height: 1 },
        ],
      },
    })
  })

  it('merges same-row gaps at the merge boundary', () => {
    const result = decodeDiffRegions(
      createDiffImage([
        [0, 6],
        [9, 6],
      ]),
    ).match(
      (regions) => ({ kind: 'ok' as const, regions }),
      (error) => ({ kind: 'error' as const, message: error.message }),
    )

    expect(result).toEqual({
      kind: 'ok',
      regions: {
        width: 20,
        height: 16,
        rectangles: [{ x: 0, y: 6, width: 10, height: 1 }],
      },
    })
  })

  it('merges cross-row gaps at the merge boundary', () => {
    const result = decodeDiffRegions(
      createDiffImage([
        [0, 6],
        [9, 7],
      ]),
    ).match(
      (regions) => ({ kind: 'ok' as const, regions }),
      (error) => ({ kind: 'error' as const, message: error.message }),
    )

    expect(result).toEqual({
      kind: 'ok',
      regions: {
        width: 20,
        height: 16,
        rectangles: [{ x: 0, y: 6, width: 10, height: 2 }],
      },
    })
  })
})
