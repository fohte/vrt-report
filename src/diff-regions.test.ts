import { PNG } from 'pngjs'
import { describe, expect, it } from 'vitest'

import { decodeDiffRegions } from '#diff-regions'

const createDiffImage = (): Buffer => {
  const image = new PNG({ width: 20, height: 16 })
  const changedPixels: Array<[number, number]> = [
    [2, 2],
    [4, 4],
    [17, 10],
  ]
  for (const [x, y] of changedPixels) {
    const offset = (y * image.width + x) * 4
    image.data[offset] = 255
    image.data[offset + 3] = 255
  }
  return PNG.sync.write(image)
}

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
})
