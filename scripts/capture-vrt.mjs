import { spawnSync } from 'node:child_process'
import { once } from 'node:events'
import { createReadStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

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

const captures = [
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

const generateReport = async (fixture) => {
  const scenarioDirectory = join(fixtureDirectory, fixture)
  const outputDirectory = join(reportDirectory, fixture)
  const outputPath = join(outputDirectory, 'report.html')
  const assetsDirectory = join(scenarioDirectory, 'assets')
  const baselineDirectory = join(scenarioDirectory, 'baseline', 'actual')
  const baselineUrl = relative(outputDirectory, baselineDirectory)
    .split(sep)
    .join('/')

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

  if (result.error !== undefined) {
    console.error(result.error)
    process.exitCode = 1
    return false
  }
  if (result.status !== 0) {
    process.stderr.write(
      result.stderr ||
        `Report generation exited with status ${result.status}.\n`,
    )
    process.exitCode = 1
    return false
  }

  process.stdout.write(result.stdout)
  return true
}

const createStaticServer = () =>
  createServer((request, response) => {
    const pathname = decodeURIComponent(
      new URL(request.url ?? '/', 'http://127.0.0.1').pathname,
    )
    const filePath = resolve(repositoryDirectory, `.${pathname}`)
    const projectPath = relative(repositoryDirectory, filePath)
    const isAllowedPath =
      projectPath.startsWith(`.vrt-report-capture${sep}`) ||
      projectPath.startsWith(`fixtures${sep}self-vrt-capture${sep}`)

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
  await mkdir(screenshotDirectory, { recursive: true })

  for (const fixture of new Set(captures.map(({ fixture }) => fixture))) {
    if (!(await generateReport(fixture))) return
  }

  resources.server = createStaticServer()
  const listening = once(resources.server, 'listening')
  resources.server.listen(0, '127.0.0.1')
  await listening

  const address = resources.server.address()
  if (address === null || typeof address === 'string') {
    console.error('Could not start the local report server.')
    process.exitCode = 1
    return
  }

  const baseUrl = `http://127.0.0.1:${address.port}`
  resources.browser = await chromium.launch({ headless: true })

  for (const capture of captures) {
    const reportPath = relative(
      repositoryDirectory,
      join(reportDirectory, capture.fixture, 'report.html'),
    )
      .split(sep)
      .join('/')
    const context = await resources.browser.newContext({
      colorScheme: 'dark',
      deviceScaleFactor: 1,
      locale: 'en-US',
      reducedMotion: 'reduce',
      timezoneId: 'UTC',
      viewport: capture.viewport,
    })
    await context.route('**/*', (route) =>
      new URL(route.request().url()).origin === baseUrl
        ? route.continue()
        : route.abort(),
    )

    const page = await context.newPage()
    await page.goto(`${baseUrl}/${reportPath}`, { waitUntil: 'networkidle' })
    if (capture.showUnchanged) await page.locator('.show-unchanged').click()

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
      path: join(screenshotDirectory, capture.filename),
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    })

    await context.close()
    process.stdout.write(
      `Captured ${join('__screenshots__', 'vrt-report', capture.filename)}\n`,
    )
  }
}

await capture().then(
  () => closeResources(),
  async (error) => {
    console.error(error)
    process.exitCode = 1
    await closeResources()
  },
)
