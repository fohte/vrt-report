import '#storybook.css'

import { createRoot } from 'react-dom/client'

import { parseEmbeddedReport } from '#report-data'
import { ReportApp } from '#vrt-components/report-app'

const rootElement = document.getElementById('report-root')
const dataElement = document.getElementById('report-data')

if (rootElement !== null && dataElement !== null) {
  const report = parseEmbeddedReport(dataElement.textContent)
  if (report.isOk()) {
    createRoot(rootElement).render(<ReportApp stories={report.value.stories} />)
  } else {
    rootElement.textContent = 'Unable to load report data.'
  }
}
