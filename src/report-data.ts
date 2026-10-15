import { err, ok, Result } from 'neverthrow'

import type { ReportStoryView, ReportVariantView } from '#report-logic'
import type { DiffRegions } from '#report-model'
import { isRecord, isStringArray } from '#report-model'

export type EmbeddedReport = {
  stories: ReportStoryView[]
}

class InvalidReportDataError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause })
    this.name = new.target.name
  }
}

const isDiffRegions = (value: unknown): value is DiffRegions =>
  isRecord(value) &&
  typeof value['width'] === 'number' &&
  typeof value['height'] === 'number' &&
  Array.isArray(value['rectangles']) &&
  value['rectangles'].every(
    (rectangle: unknown) =>
      isRecord(rectangle) &&
      typeof rectangle['x'] === 'number' &&
      typeof rectangle['y'] === 'number' &&
      typeof rectangle['width'] === 'number' &&
      typeof rectangle['height'] === 'number',
  )

const isReportVariantView = (value: unknown): value is ReportVariantView =>
  isRecord(value) &&
  typeof value['name'] === 'string' &&
  ['changed', 'new', 'deleted', 'unchanged'].some(
    (status) => value['status'] === status,
  ) &&
  (typeof value['before'] === 'string' || value['before'] === null) &&
  (typeof value['after'] === 'string' || value['after'] === null) &&
  (typeof value['diff'] === 'string' || value['diff'] === null) &&
  (value['diffRegions'] === undefined ||
    value['diffRegions'] === null ||
    isDiffRegions(value['diffRegions']))

const isReportStoryView = (value: unknown): value is ReportStoryView =>
  isRecord(value) &&
  typeof value['id'] === 'string' &&
  typeof value['storyId'] === 'string' &&
  (value['displayName'] === undefined ||
    typeof value['displayName'] === 'string') &&
  typeof value['component'] === 'string' &&
  typeof value['sourcePath'] === 'string' &&
  isStringArray(value['directories']) &&
  Array.isArray(value['variants']) &&
  value['variants'].every(isReportVariantView)

const isEmbeddedReport = (value: unknown): value is EmbeddedReport =>
  isRecord(value) &&
  Array.isArray(value['stories']) &&
  value['stories'].every(isReportStoryView)

export const parseEmbeddedReport = (
  source: string,
): Result<EmbeddedReport, Error> => {
  const parsed = Result.fromThrowable(
    (raw: string) => JSON.parse(raw) as unknown,
    (cause) =>
      new InvalidReportDataError('Embedded report is not valid JSON', cause),
  )(source)

  return parsed.andThen((value) =>
    isEmbeddedReport(value)
      ? ok(value)
      : err(new InvalidReportDataError('Embedded report has an invalid shape')),
  )
}
