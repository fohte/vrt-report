import '#storybook.css'

import { createRoot } from 'react-dom/client'

import type { ReportStoryView } from '#report-logic'
import type { DiffRegions } from '#report-model'
import { isRecord } from '#report-model'
import { ReportApp } from '#vrt-components/report-app'

type EmbeddedReport = {
  stories: ReportStoryView[]
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.every((item: unknown) => typeof item === 'string')

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

const isReportVariantView = (
  value: unknown,
): value is ReportStoryView['variants'][number] =>
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

const rootElement = document.getElementById('report-root')
const dataElement = document.getElementById('report-data')

if (rootElement !== null && dataElement !== null) {
  const report: unknown = JSON.parse(dataElement.textContent)
  if (isEmbeddedReport(report)) {
    createRoot(rootElement).render(<ReportApp stories={report.stories} />)
  }
}
