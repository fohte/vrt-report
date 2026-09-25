import { err, ok, Result } from 'neverthrow'

type ChangeStatus = 'changed' | 'new' | 'deleted' | 'unchanged'

export type ReportVariant = {
  name: string
  status: ChangeStatus
  key: string
}

type ReportStory = {
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
  const variant = segments[0]
  const storyFile = segments.at(-2)
  const imageFile = segments.at(-1)
  if (
    key.startsWith('/') ||
    key.includes('\\') ||
    segments.some(
      (segment) => segment.length === 0 || segment === '.' || segment === '..',
    ) ||
    imageFile === undefined
  ) {
    return err(new InvalidReportError(`Invalid screenshot key: ${key}`))
  }

  const hasStorybookLayout =
    segments.length >= 3 && /\.stories\.(?:[cm]?[jt]sx?)$/.test(storyFile ?? '')
  const directories = hasStorybookLayout
    ? segments.slice(1, -2)
    : segments.slice(0, -2)
  const storyId = imageFile.replace(/\.[^.]+$/, '')
  const component = hasStorybookLayout
    ? (storyFile ?? '').replace(/\.stories\.(?:[cm]?[jt]sx?)$/, '')
    : (storyFile ?? 'Screenshots')
  const sourcePath = hasStorybookLayout
    ? segments.slice(1, -1).join('/')
    : segments.slice(0, -1).join('/')
  const storyPath = hasStorybookLayout ? segments.slice(1).join('/') : key

  return ok({
    variant: hasStorybookLayout ? (variant ?? 'default') : 'default',
    storyPath,
    storyId,
    component,
    sourcePath,
    directories,
  })
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
  const storiesById = new Map<string, ReportStory>()
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
