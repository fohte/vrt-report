import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve, sep } from 'node:path'

import { ResultAsync } from 'neverthrow'

import { renderReport } from '#render'
import { buildReportModel, parseRegOutput } from '#report-model'

export type GenerateOptions = {
  inputPath: string
  assetsDirectory: string
  outputPath: string
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

class ReportAssetError extends Error {
  constructor(cause: unknown) {
    super('Could not read report assets', { cause })
    this.name = new.target.name
  }
}

export const generateReport = (
  options: GenerateOptions,
): ResultAsync<{ outputPath: string }, Error> => {
  const inputPath = resolve(options.inputPath)
  const assetsDirectory = resolve(options.assetsDirectory)
  const outputPath = resolve(options.outputPath)

  return ResultAsync.fromPromise(
    readFile(inputPath, 'utf8'),
    (cause) => new InputFileError(inputPath, cause),
  )
    .andThen(parseRegOutput)
    .andThen(buildReportModel)
    .andThen((model) => {
      const assetsPrefix = relative(dirname(outputPath), assetsDirectory)
        .split(sep)
        .join('/')

      return ResultAsync.fromPromise(
        Promise.all([
          readFile(new URL('./report-template.html', import.meta.url), 'utf8'),
          readFile(new URL('./report-client.js', import.meta.url), 'utf8'),
          readFile(new URL('./report-styles.css', import.meta.url), 'utf8'),
          readFile(new URL('./report-responsive.css', import.meta.url), 'utf8'),
        ]),
        (cause) => new ReportAssetError(cause),
      ).andThen(([template, clientScript, styles, responsiveStyles]) => {
        const combinedStyles = [styles, responsiveStyles].join('\n')
        const html = renderReport(
          model,
          {
            assetsPrefix,
            baselineDirectory: options.baselineDirectory,
          },
          template,
          combinedStyles,
          clientScript,
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
