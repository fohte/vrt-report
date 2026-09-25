import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { err, errAsync, ok, okAsync, Result, ResultAsync } from 'neverthrow'

import {
  isRecord,
  isStorybookSourcePath,
  type ReportModel,
} from '#report-model'

type CsfTools = {
  loadCsf: (
    source: string,
    options: { fileName: string; makeTitle: (title: string) => string },
  ) => { parse: () => ParsedCsf }
}

type ParsedCsf = { getStoryExport: (exportName: string) => unknown }
type StorySource = { filePath: string; source: string }

const storyExpressionWrappers = new Set([
  'TSAsExpression',
  'TSSatisfiesExpression',
  'TSNonNullExpression',
])

class StorySourceError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause })
    this.name = new.target.name
  }
}

const isCsfTools = (value: unknown): value is CsfTools =>
  isRecord(value) && typeof value['loadCsf'] === 'function'

const isNotFound = (error: Error): boolean =>
  isRecord(error.cause) && error.cause['code'] === 'ENOENT'

const isNameProperty = (value: unknown): value is Record<string, unknown> => {
  if (!isRecord(value) || value['type'] !== 'ObjectProperty') return false

  const key = value['key']
  return (
    (isRecord(key) && key['type'] === 'Identifier' && key['name'] === 'name') ||
    (isRecord(key) &&
      key['type'] === 'StringLiteral' &&
      key['value'] === 'name')
  )
}

const readExplicitName = (storyExport: unknown): string | undefined => {
  let node = storyExport
  while (
    isRecord(node) &&
    typeof node['type'] === 'string' &&
    storyExpressionWrappers.has(node['type'])
  ) {
    node = node['expression']
  }

  if (!isRecord(node) || node['type'] !== 'ObjectExpression') return undefined
  const properties = node['properties']
  if (!Array.isArray(properties)) return undefined

  const nameProperty = properties.find(isNameProperty)
  if (!isRecord(nameProperty)) return undefined
  const value = nameProperty['value']
  const name = isRecord(value) ? value['value'] : undefined
  if (
    !isRecord(value) ||
    value['type'] !== 'StringLiteral' ||
    typeof name !== 'string' ||
    name.length === 0
  ) {
    return undefined
  }

  return name
}

const readStorySources = (
  sourcePaths: string[],
  storiesDirectory: string,
): ResultAsync<Map<string, StorySource>, Error> =>
  sourcePaths.reduce<ResultAsync<Map<string, StorySource>, Error>>(
    (sourcesResult, sourcePath) =>
      sourcesResult.andThen((sources) => {
        const filePath = resolve(storiesDirectory, sourcePath)
        return ResultAsync.fromPromise(
          readFile(filePath, 'utf8'),
          (cause) =>
            new StorySourceError(
              `Could not read Storybook source: ${filePath}`,
              cause,
            ),
        )
          .map((source) => {
            sources.set(sourcePath, { filePath, source })
            return sources
          })
          .orElse((error) =>
            isNotFound(error) ? okAsync(sources) : errAsync(error),
          )
      }),
    okAsync(new Map<string, StorySource>()),
  )

const loadCsfTools = (
  storiesDirectory: string,
): ResultAsync<CsfTools, Error> => {
  const packageSpecifier = 'storybook/internal/csf-tools'
  const resolvedPath = Result.fromThrowable(
    () =>
      createRequire(resolve(storiesDirectory, 'package.json')).resolve(
        packageSpecifier,
      ),
    (cause) =>
      new StorySourceError(
        `Could not resolve ${packageSpecifier} from ${storiesDirectory}`,
        cause,
      ),
  )()
  if (resolvedPath.isErr()) return errAsync(resolvedPath.error)

  return ResultAsync.fromPromise(
    import(pathToFileURL(resolvedPath.value).href),
    (cause) =>
      new StorySourceError(
        `Could not load ${packageSpecifier} from ${storiesDirectory}`,
        cause,
      ),
  ).andThen((value) =>
    isCsfTools(value)
      ? okAsync(value)
      : errAsync(
          new StorySourceError(`${packageSpecifier} does not export loadCsf`),
        ),
  )
}

const applyCsfDisplayNames = (
  model: ReportModel,
  sources: Map<string, StorySource>,
  csfTools: CsfTools,
): Result<ReportModel, Error> => {
  const displayNamesById = new Map<string, string>()
  const parsedCsfByPath = new Map<string, ParsedCsf>()

  for (const story of model.stories) {
    const storySource = sources.get(story.sourcePath)
    if (storySource === undefined) continue

    let csf = parsedCsfByPath.get(story.sourcePath)
    if (csf === undefined) {
      const parsed = Result.fromThrowable(
        () =>
          csfTools
            .loadCsf(storySource.source, {
              fileName: storySource.filePath,
              makeTitle: (title) => title,
            })
            .parse(),
        (cause) =>
          new StorySourceError(
            `Could not parse Storybook source: ${storySource.filePath}`,
            cause,
          ),
      )()
      if (parsed.isErr()) return err(parsed.error)

      csf = parsed.value
      parsedCsfByPath.set(story.sourcePath, csf)
    }

    const storyExport = Result.fromThrowable(
      () => csf.getStoryExport(story.storyId),
      (cause) =>
        new StorySourceError(
          `Could not read story export ${story.storyId}: ${storySource.filePath}`,
          cause,
        ),
    )()
    if (storyExport.isErr()) return err(storyExport.error)

    const displayName = readExplicitName(storyExport.value)
    if (displayName !== undefined) displayNamesById.set(story.id, displayName)
  }

  return ok({
    ...model,
    stories: model.stories.map((story) => {
      const displayName = displayNamesById.get(story.id)
      return displayName === undefined ? story : { ...story, displayName }
    }),
  })
}

export const addCsfDisplayNames = (
  model: ReportModel,
  storiesDirectory: string,
  warnWhenSourcesAreMissing: boolean,
): ResultAsync<ReportModel, Error> => {
  const sourcePaths = [
    ...new Set(
      model.stories
        .map((story) => story.sourcePath)
        .filter(isStorybookSourcePath),
    ),
  ]
  if (sourcePaths.length === 0) return okAsync(model)

  return readStorySources(sourcePaths, storiesDirectory)
    .andThen((sources) => {
      if (sources.size === 0) {
        if (warnWhenSourcesAreMissing)
          process.stderr.write(
            `vrt-report: warning: no Storybook source files found under ${storiesDirectory}; using export names\n`,
          )
        return okAsync(model)
      }

      return loadCsfTools(storiesDirectory).andThen((csfTools) =>
        applyCsfDisplayNames(model, sources, csfTools),
      )
    })
    .orElse((error) => {
      process.stderr.write(
        `vrt-report: warning: ${error.message}; using Storybook export names\n`,
      )
      return okAsync(model)
    })
}
