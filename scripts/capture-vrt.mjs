import { spawnSync } from 'node:child_process'
import { once } from 'node:events'
import { createReadStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { err, ok, ResultAsync } from 'neverthrow'
import { chromium } from 'playwright'

const repositoryDirectory = resolve(
  fileURLToPath(new URL('..', import.meta.url)),
)
const fixtureDirectory = join(
  repositoryDirectory,
  'fixtures',
  'self-vrt-capture',
)
const reportDirectory = join(repositoryDirectory, '.vrt-report-capture')
const screenshotDirectory = join(
  repositoryDirectory,
  '__screenshots__',
  'vrt-report',
)
const cliPath = join(repositoryDirectory, 'bin', 'vrt-report.js')
const allowedRoots = [reportDirectory, fixtureDirectory]

const captureEntries = [
  {
    fixture: 'mixed',
    filename: 'mixed-desktop.png',
    viewport: { width: 1440, height: 960 },
    showUnchanged: true,
  },
  {
    fixture: 'mixed',
    filename: 'mixed-mobile.png',
    viewport: { width: 390, height: 844 },
    showUnchanged: true,
  },
  {
    fixture: 'passed-only',
    filename: 'unchanged-only.png',
    viewport: { width: 1440, height: 960 },
  },
  {
    fixture: 'empty',
    filename: 'empty.png',
    viewport: { width: 1440, height: 960 },
  },
]

const resources = { browser: undefined, server: undefined }

const toPosixPath = (path) => path.split(sep).join('/')

const runReportCli = async (fixture) => {
  const scenarioDirectory = join(fixtureDirectory, fixture)
  const outputDirectory = join(reportDirectory, fixture)
  const outputPath = join(outputDirectory, 'report.html')
  const assetsDirectory = join(scenarioDirectory, 'assets')
  const baselineDirectory = join(scenarioDirectory, 'baseline', 'actual')
  const baselineUrl = toPosixPath(relative(outputDirectory, baselineDirectory))

  await mkdir(outputDirectory, { recursive: true })

  const result = spawnSync(
    process.execPath,
    [
      cliPath,
      '--input',
      join(scenarioDirectory, 'out.json'),
      '--assets-dir',
      assetsDirectory,
      '--output',
      outputPath,
      '--baseline-dir',
      baselineUrl,
    ],
    { cwd: repositoryDirectory, encoding: 'utf8' },
  )

  if (result.error !== undefined)
    return err(
      new Error(`Could not generate the ${fixture} report.`, {
        cause: result.error,
      }),
    )
  if (result.status !== 0)
    return err(
      new Error(
        result.stderr ||
          `Report generation exited with status ${result.status}.`,
      ),
    )

  process.stdout.write(result.stdout)
  return ok(undefined)
}

const generateReports = async () => {
  const fixtures = new Set(captureEntries.map(({ fixture }) => fixture))
  for (const fixture of fixtures) {
    const result = await runReportCli(fixture)
    if (result.isErr()) return result
  }
  return ok(undefined)
}

const createStaticServer = () =>
  createServer((request, response) => {
    const pathname = decodeURIComponent(
      new URL(request.url ?? '/', 'http://127.0.0.1').pathname,
    )
    const filePath = resolve(repositoryDirectory, `.${pathname}`)
    const isAllowedPath = allowedRoots.some((root) =>
      filePath.startsWith(`${root}${sep}`),
    )

    if (!isAllowedPath) {
      response.writeHead(404).end()
      return
    }

    const contentType = {
      '.html': 'text/html; charset=utf-8',
      '.svg': 'image/svg+xml',
    }[extname(filePath)]
    if (contentType !== undefined)
      response.setHeader('Content-Type', contentType)

    createReadStream(filePath)
      .on('error', () => {
        if (!response.headersSent) response.writeHead(404)
        response.end()
      })
      .pipe(response)
  })

const startStaticServer = async () => {
  resources.server = createStaticServer()
  const listening = once(resources.server, 'listening')
  resources.server.listen(0, '127.0.0.1')
  await listening

  const address = resources.server.address()
  if (address === null || typeof address === 'string')
    return err(new Error('Could not start the local report server.'))
  return ok(`http://127.0.0.1:${address.port}`)
}

const captureReport = async (browser, baseUrl, entry) => {
  const reportPath = toPosixPath(
    relative(
      repositoryDirectory,
      join(reportDirectory, entry.fixture, 'report.html'),
    ),
  )
  const context = await browser.newContext({
    colorScheme: 'dark',
    deviceScaleFactor: 1,
    locale: 'en-US',
    reducedMotion: 'reduce',
    timezoneId: 'UTC',
    viewport: entry.viewport,
  })
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === baseUrl
      ? route.continue()
      : route.abort(),
  )

  const page = await context.newPage()
  await page.goto(`${baseUrl}/${reportPath}`, { waitUntil: 'networkidle' })
  if (entry.showUnchanged) await page.locator('.show-unchanged').click()

  await page.evaluate(async () => {
    for (const image of document.images) image.loading = 'eager'
    await document.fonts.ready
    await Promise.all(Array.from(document.images, (image) => image.decode()))
  })
  await page.evaluate(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  })
  await page.mouse.move(0, 0)
  await page.evaluate(
    () => new Promise((resolveFrame) => requestAnimationFrame(resolveFrame)),
  )
  await page.screenshot({
    path: join(screenshotDirectory, entry.filename),
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
    scale: 'css',
  })

  await context.close()
  process.stdout.write(
    `Captured ${join('__screenshots__', 'vrt-report', entry.filename)}\n`,
  )
}

const closeResources = async () => {
  const closing = []
  if (resources.browser !== undefined)
    closing.push(Promise.resolve().then(() => resources.browser.close()))
  if (resources.server?.listening) {
    closing.push(
      new Promise((resolveClose) => resources.server.close(resolveClose)),
    )
  }
  await Promise.allSettled(closing)
}

const capture = async () => {
  const generated = await generateReports()
  if (generated.isErr()) return generated

  await mkdir(screenshotDirectory, { recursive: true })
  const server = await startStaticServer()
  if (server.isErr()) return server

  resources.browser = await chromium.launch({ headless: true })
  for (const entry of captureEntries)
    await captureReport(resources.browser, server.value, entry)

  return ok(undefined)
}

const result = await ResultAsync.fromPromise(capture(), (cause) =>
  cause instanceof Error ? cause : new Error(String(cause)),
).andThen((captureResult) => captureResult)

await result.match(
  () => closeResources(),
  async (error) => {
    console.error(error)
    process.exitCode = 1
    await closeResources()
  },
)
