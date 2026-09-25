import { err, ok, Result } from 'neverthrow'

export type ChangeStatus = 'changed' | 'new' | 'deleted' | 'unchanged'

export type ReportVariant = {
  name: string
  status: ChangeStatus
  key: string
}

export type ReportStory = {
  id: string
  storyId: string
  component: string
  sourcePath: string
  directories: string[]
  variants: ReportVariant[]
}

export type ReportModel = {
  counts: {
    changed: number
    new: number
    deleted: number
    passed: number
  }
  stories: ReportStory[]
}

export type RegOutput = {
  failedItems: string[]
  newItems: string[]
  deletedItems: string[]
  passedItems: string[]
}

type ImageKey = {
  variant: string
  storyPath: string
  storyId: string
  component: string
  sourcePath: string
  directories: string[]
}

type MutableStory = Omit<ReportStory, 'variants'> & {
  variants: ReportVariant[]
}

class InvalidReportError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause })
    this.name = new.target.name
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')

const isRegOutput = (value: unknown): value is RegOutput =>
  isRecord(value) &&
  isStringArray(value['failedItems']) &&
  isStringArray(value['newItems']) &&
  isStringArray(value['deletedItems']) &&
  isStringArray(value['passedItems'])

const parseImageKey = (key: string): Result<ImageKey, Error> => {
  const segments = key.split('/')
  if (
    key.startsWith('/') ||
    key.includes('\\') ||
    segments.length < 3 ||
    segments.some(
      (segment) => segment.length === 0 || segment === '.' || segment === '..',
    )
  ) {
    return err(new InvalidReportError(`Invalid screenshot key: ${key}`))
  }

  const variant = segments[0]
  const storyFile = segments.at(-2)
  const storyFileName = segments.at(-1)
  if (
    variant === undefined ||
    storyFile === undefined ||
    storyFileName === undefined
  ) {
    return err(new InvalidReportError(`Invalid screenshot key: ${key}`))
  }

  const directories = segments.slice(1, -2)
  const storyId = storyFileName.replace(/\.[^.]+$/, '')
  const component = storyFile.replace(/\.stories\.(?:[cm]?[jt]sx?)$/, '')
  const sourcePath = segments.slice(1, -1).join('/')
  const storyPath = segments.slice(1).join('/')

  return ok({ variant, storyPath, storyId, component, sourcePath, directories })
}

export const parseRegOutput = (source: string): Result<RegOutput, Error> => {
  const parsed = Result.fromThrowable(
    (raw: string) => JSON.parse(raw) as unknown,
    (cause) => new InvalidReportError('out.json is not valid JSON', cause),
  )(source)

  return parsed.andThen((value) =>
    isRegOutput(value)
      ? ok(value)
      : err(
          new InvalidReportError(
            'out.json must contain failedItems, newItems, deletedItems, and passedItems string arrays',
          ),
        ),
  )
}

export const buildReportModel = (
  input: RegOutput,
): Result<ReportModel, Error> => {
  const storiesById = new Map<string, MutableStory>()
  const categories: Array<[ChangeStatus, string[]]> = [
    ['changed', input.failedItems],
    ['new', input.newItems],
    ['deleted', input.deletedItems],
  ]

  for (const [status, keys] of categories) {
    for (const key of keys) {
      const imageKey = parseImageKey(key)
      if (imageKey.isErr()) return err(imageKey.error)

      let story = storiesById.get(imageKey.value.storyPath)
      if (story === undefined) {
        story = {
          id: imageKey.value.storyPath,
          storyId: imageKey.value.storyId,
          component: imageKey.value.component,
          sourcePath: imageKey.value.sourcePath,
          directories: imageKey.value.directories,
          variants: [],
        }
        storiesById.set(story.id, story)
      }

      if (
        story.variants.some(
          (variant) => variant.name === imageKey.value.variant,
        )
      ) {
        return err(new InvalidReportError(`Duplicate screenshot key: ${key}`))
      }

      story.variants.push({ name: imageKey.value.variant, status, key })
    }
  }

  for (const key of input.passedItems) {
    const imageKey = parseImageKey(key)
    if (imageKey.isErr()) return err(imageKey.error)

    const story = storiesById.get(imageKey.value.storyPath)
    if (
      story === undefined ||
      story.variants.some((variant) => variant.name === imageKey.value.variant)
    ) {
      continue
    }

    story.variants.push({
      name: imageKey.value.variant,
      status: 'unchanged',
      key,
    })
  }

  const stories = [...storiesById.values()]
    .map((story) => ({
      ...story,
      variants: story.variants.toSorted((left, right) =>
        left.name.localeCompare(right.name),
      ),
    }))
    .toSorted((left, right) => left.id.localeCompare(right.id))

  return ok({
    counts: {
      changed: input.failedItems.length,
      new: input.newItems.length,
      deleted: input.deletedItems.length,
      passed: input.passedItems.length,
    },
    stories,
  })
}
