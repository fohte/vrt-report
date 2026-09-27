import { Result } from 'neverthrow'
import { PNG } from 'pngjs'

import type { DiffRegions } from '#report-model'

type Run = {
  x1: number
  x2: number
  y: number
  id: number
}

const mergeGap = 8

class DiffImageDecodeError extends Error {
  constructor(cause: unknown) {
    super('Could not decode diff image', { cause })
    this.name = new.target.name
  }
}

const isDifferencePixel = (data: Buffer, offset: number): boolean => {
  const red = data[offset] ?? 0
  const green = data[offset + 1] ?? 0
  const blue = data[offset + 2] ?? 0
  const alpha = data[offset + 3] ?? 0

  return alpha > 0 && red > green + 32 && red > blue + 32
}

const findRoot = (parents: number[], id: number): number => {
  let root = id
  while (parents[root] !== root) root = parents[root] ?? root

  while (parents[id] !== id) {
    const parent = parents[id] ?? id
    parents[id] = root
    id = parent
  }

  return root
}

const union = (parents: number[], left: number, right: number): void => {
  const leftRoot = findRoot(parents, left)
  const rightRoot = findRoot(parents, right)
  if (leftRoot !== rightRoot) parents[rightRoot] = leftRoot
}

const rowRuns = (
  data: Buffer,
  width: number,
  y: number,
): Array<Omit<Run, 'id'>> => {
  const runs: Array<Omit<Run, 'id'>> = []
  let x = 0

  while (x < width) {
    if (!isDifferencePixel(data, (y * width + x) * 4)) {
      x += 1
      continue
    }

    const x1 = x
    let x2 = x
    x += 1
    while (x < width) {
      if (isDifferencePixel(data, (y * width + x) * 4)) {
        x2 = x
        x += 1
        continue
      }

      let nextDifference = x + 1
      while (
        nextDifference < width &&
        nextDifference - x2 - 1 <= mergeGap &&
        !isDifferencePixel(data, (y * width + nextDifference) * 4)
      ) {
        nextDifference += 1
      }
      if (
        nextDifference < width &&
        nextDifference - x2 - 1 <= mergeGap &&
        isDifferencePixel(data, (y * width + nextDifference) * 4)
      ) {
        x2 = nextDifference
        x = nextDifference + 1
        continue
      }
      break
    }

    const previous = runs.at(-1)
    if (previous !== undefined && x1 - previous.x2 - 1 <= mergeGap)
      previous.x2 = x2
    else runs.push({ x1, x2, y })
  }

  return runs
}

const connectNearbyRuns = (
  current: Run[],
  previous: Run[],
  parents: number[],
): void => {
  let firstNearbyPrevious = 0
  for (const currentRun of current) {
    while (
      firstNearbyPrevious < previous.length &&
      (previous[firstNearbyPrevious]?.x2 ?? 0) + mergeGap < currentRun.x1
    ) {
      firstNearbyPrevious += 1
    }

    for (
      let index = firstNearbyPrevious;
      index < previous.length &&
      (previous[index]?.x1 ?? 0) <= currentRun.x2 + mergeGap;
      index += 1
    ) {
      const previousRun = previous[index]
      if (previousRun !== undefined)
        union(parents, currentRun.id, previousRun.id)
    }
  }
}

const regionsFromPixels = (
  width: number,
  height: number,
  data: Buffer,
): DiffRegions => {
  const parents: number[] = []
  const runsByRow: Run[][] = []

  for (let y = 0; y < height; y += 1) {
    const runs = rowRuns(data, width, y).map((run) => {
      const id = parents.length
      parents.push(id)
      return { ...run, id }
    })

    for (
      let previousY = Math.max(0, y - mergeGap - 1);
      previousY < y;
      previousY += 1
    ) {
      const previous = runsByRow[previousY]
      if (previous !== undefined) connectNearbyRuns(runs, previous, parents)
    }
    runsByRow.push(runs)
  }

  const bounds = new Map<
    number,
    { x1: number; x2: number; y1: number; y2: number }
  >()
  for (const row of runsByRow) {
    for (const run of row) {
      const root = findRoot(parents, run.id)
      const box = bounds.get(root)
      if (box === undefined) {
        bounds.set(root, { x1: run.x1, x2: run.x2, y1: run.y, y2: run.y })
      } else {
        box.x1 = Math.min(box.x1, run.x1)
        box.x2 = Math.max(box.x2, run.x2)
        box.y1 = Math.min(box.y1, run.y)
        box.y2 = Math.max(box.y2, run.y)
      }
    }
  }

  return {
    width,
    height,
    rectangles: [...bounds.values()]
      .map(({ x1, x2, y1, y2 }) => ({
        x: x1,
        y: y1,
        width: x2 - x1 + 1,
        height: y2 - y1 + 1,
      }))
      .toSorted((left, right) => left.y - right.y || left.x - right.x),
  }
}

export const decodeDiffRegions = (buffer: Buffer): Result<DiffRegions, Error> =>
  Result.fromThrowable(
    (source: Buffer) => {
      const image = PNG.sync.read(source)
      return regionsFromPixels(image.width, image.height, image.data)
    },
    (cause) => new DiffImageDecodeError(cause),
  )(buffer)
