import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { err, ok, okAsync, Result, ResultAsync } from 'neverthrow'

import type { ReportModel } from '#report-model'

type CsfTools = {
  loadCsf: (
    source: string,
    options: { fileName: string; makeTitle: (title: string) => string },
  ) => { parse: () => ParsedCsf }
}

type ParsedCsf = { getStoryExport: (exportName: string) => unknown }

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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isCsfTools = (value: unknown): value is CsfTools =>
  isRecord(value) && typeof value['loadCsf'] === 'function'

const isNotFound = (error: Error): boolean =>
  isRecord(error.cause) && error.cause['code'] === 'ENOENT'

const isStorybookSourcePath = (path: string): boolean =>
  /\.stories\.(?:[cm]?[jt]sx?)$/.test(path)

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

export const addCsfDisplayNames = (
  model: ReportModel,
  storiesDirectory: string,
): ResultAsync<ReportModel, Error> => {
  const sourcePaths = [
    ...new Set(
      model.stories
        .map((story) => story.sourcePath)
        .filter(isStorybookSourcePath),
    ),
  ]
  if (sourcePaths.length === 0) return okAsync(model)

  return ResultAsync.fromPromise(
    (async () => {
      const sources = new Map<string, string>()
      for (const sourcePath of sourcePaths) {
        const filePath = resolve(storiesDirectory, sourcePath)
        const source = await ResultAsync.fromPromise(
          readFile(filePath, 'utf8'),
          (cause) =>
            new StorySourceError(
              `Could not read Storybook source: ${filePath}`,
              cause,
            ),
        )

        if (source.isErr()) {
          if (isNotFound(source.error)) continue
          return err(source.error)
        }

        sources.set(sourcePath, source.value)
      }

      if (sources.size === 0) return ok(model)

      const csfToolsModuleName: string = 'storybook/internal/csf-tools'
      const csfTools = await ResultAsync.fromPromise(
        import(csfToolsModuleName),
        (cause) =>
          new StorySourceError(
            'Could not load Storybook CSF tools. Install Storybook in the source project to read story names.',
            cause,
          ),
      )
      if (csfTools.isErr()) return err(csfTools.error)
      if (!isCsfTools(csfTools.value))
        return err(
          new StorySourceError('Storybook CSF tools does not export loadCsf.'),
        )
      const { loadCsf } = csfTools.value

      const displayNamesById = new Map<string, string>()
      const parsedCsfByPath = new Map<string, ParsedCsf>()
      for (const story of model.stories) {
        const source = sources.get(story.sourcePath)
        if (source === undefined) continue

        const filePath = resolve(storiesDirectory, story.sourcePath)
        let csf = parsedCsfByPath.get(story.sourcePath)
        if (csf === undefined) {
          const parsed = Result.fromThrowable(
            () =>
              loadCsf(source, {
                fileName: filePath,
                makeTitle: (title) => title,
              }).parse(),
            (cause) =>
              new StorySourceError(
                `Could not parse Storybook source: ${filePath}`,
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
              `Could not read story export ${story.storyId}: ${filePath}`,
              cause,
            ),
        )()
        if (storyExport.isErr()) return err(storyExport.error)

        const displayName = readExplicitName(storyExport.value)
        if (displayName !== undefined)
          displayNamesById.set(story.id, displayName)
      }

      return ok({
        ...model,
        stories: model.stories.map((story) => {
          const displayName = displayNamesById.get(story.id)
          return displayName === undefined ? story : { ...story, displayName }
        }),
      })
    })(),
    (cause) =>
      cause instanceof Error
        ? cause
        : new StorySourceError('Could not load Storybook display names', cause),
  ).andThen((result) => result)
}
