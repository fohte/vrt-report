import { PNG } from 'pngjs'

export const createDiffImage = (
  changedPixels: ReadonlyArray<readonly [number, number]> = [
    [2, 2],
    [4, 4],
    [17, 10],
  ],
): Buffer => {
  const image = new PNG({ width: 20, height: 16 })
  for (const [x, y] of changedPixels) {
    const offset = (y * image.width + x) * 4
    image.data[offset] = 255
    image.data[offset + 3] = 255
  }
  return PNG.sync.write(image)
}
