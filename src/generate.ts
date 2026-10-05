import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'

import { errAsync, okAsync, ResultAsync } from 'neverthrow'

import { decodeDiffRegions } from '#diff-regions'
import { renderReport } from '#render'
import type { DiffRegions, ReportModel } from '#report-model'
import { buildReportModel, parseRegOutput } from '#report-model'
import { addCsfDisplayNames } from '#story-name'

export type GenerateOptions = {
  inputPath: string
  assetsDirectory: string
  outputPath: string
  storiesDirectory?: string | undefined
  baselineDirectory?: string | undefined
}

class InputFileError extends Error {
  constructor(path: string, cause: unknown) {
    super(`Could not read report data: ${path}`, { cause })
    this.name = new.target.name
  }
}

class OutputFileError extends Error {
  constructor(path: string, cause: unknown) {
    super(`Could not write HTML report: ${path}`, { cause })
    this.name = new.target.name
  }
}

class ReportTemplateError extends Error {
  constructor(cause: unknown) {
    super('Could not read report template', { cause })
    this.name = new.target.name
  }
}

class DiffImageError extends Error {
  constructor(path: string, cause: unknown) {
    super(`Could not process diff image: ${path}`, { cause })
    this.name = new.target.name
  }
}

const isMissingFile = (cause: unknown): boolean =>
  typeof cause === 'object' &&
  cause !== null &&
  'code' in cause &&
  cause.code === 'ENOENT'

const readDiffRegions = (path: string) =>
  ResultAsync.fromPromise(
    readFile(path),
    (cause) => new DiffImageError(path, cause),
  )
    .andThen((buffer) =>
      decodeDiffRegions(buffer).mapErr(
        (cause) => new DiffImageError(path, cause),
      ),
    )
    .orElse((error) =>
      isMissingFile(error.cause) ? okAsync(null) : errAsync(error),
    )

const diffReadBatchSize = 32

const addDiffRegions = (model: ReportModel, assetsDirectory: string) => {
  const changedVariants = model.stories.flatMap((story) =>
    story.variants.filter((variant) => variant.status === 'changed'),
  )

  const readBatch = (
    offset: number,
    entries: Array<readonly [string, DiffRegions | null]>,
  ): ResultAsync<Map<string, DiffRegions | null>, Error> => {
    const batch = changedVariants.slice(offset, offset + diffReadBatchSize)
    if (batch.length === 0) return okAsync(new Map(entries))

    return ResultAsync.combine(
      batch.map((variant) =>
        readDiffRegions(join(assetsDirectory, 'diff', variant.key)).map(
          (regions) => [variant.key, regions] as const,
        ),
      ),
    ).andThen((batchEntries) =>
      readBatch(offset + batch.length, [...entries, ...batchEntries]),
    )
  }

  return readBatch(0, []).map((regionsByKey) => {
    return {
      ...model,
      stories: model.stories.map((story) => ({
        ...story,
        variants: story.variants.map((variant) =>
          variant.status === 'changed'
            ? {
                ...variant,
                diffRegions: regionsByKey.get(variant.key) ?? null,
              }
            : variant,
        ),
      })),
    }
  })
}

export const generateReport = (
  options: GenerateOptions,
): ResultAsync<{ outputPath: string }, Error> => {
  const inputPath = resolve(options.inputPath)
  const assetsDirectory = resolve(options.assetsDirectory)
  const outputPath = resolve(options.outputPath)
  const storiesDirectory = resolve(options.storiesDirectory ?? process.cwd())

  return ResultAsync.fromPromise(
    readFile(inputPath, 'utf8'),
    (cause) => new InputFileError(inputPath, cause),
  )
    .andThen(parseRegOutput)
    .andThen(buildReportModel)
    .andThen((model) => addDiffRegions(model, assetsDirectory))
    .andThen((model) =>
      addCsfDisplayNames(
        model,
        storiesDirectory,
        options.storiesDirectory !== undefined,
      ),
    )
    .andThen((model) => {
      const assetsPrefix = relative(dirname(outputPath), assetsDirectory)
        .split(sep)
        .join('/')
      return ResultAsync.fromPromise(
        readFile(new URL('./report-template.html', import.meta.url), 'utf8'),
        (cause) => new ReportTemplateError(cause),
      ).andThen((template) => {
        const html = renderReport(
          model,
          {
            assetsPrefix,
            baselineDirectory: options.baselineDirectory,
          },
          template,
        )

        return ResultAsync.fromPromise(
          mkdir(dirname(outputPath), { recursive: true }),
          (cause) => new OutputFileError(outputPath, cause),
        )
          .andThen(() =>
            ResultAsync.fromPromise(
              writeFile(outputPath, html, 'utf8'),
              (cause) => new OutputFileError(outputPath, cause),
            ),
          )
          .map(() => ({ outputPath }))
      })
    })
}
