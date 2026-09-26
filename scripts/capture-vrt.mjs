import { spawnSync } from 'node:child_process'
import { once } from 'node:events'
import { createReadStream } from 'node:fs'
import { copyFile, mkdir, readdir, readFile } from 'node:fs/promises'
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
  'vrt-report-comparison',
)
const workDirectory = join(repositoryDirectory, '.vrt-report-capture')
const comparisonDirectory = join(workDirectory, 'comparisons')
const reportDirectory = join(workDirectory, 'reports')
const screenshotDirectory = join(
  repositoryDirectory,
  '__screenshots__',
  'vrt-report',
)
const cliPath = join(repositoryDirectory, 'bin', 'vrt-report.js')
const allowedRoots = [workDirectory]

const passedImageKey =
  'mobile/demos/workflows/reviews/priority/FictionalReviewQueue.stories.tsx/displays-review-routing-summary.png'

const reportCaptures = [
  {
    report: 'mixed',
    filename: 'mixed-desktop.png',
    viewport: { width: 1440, height: 960 },
    showUnchanged: true,
  },
  {
    report: 'mixed',
    filename: 'mixed-mobile.png',
    viewport: { width: 390, height: 844 },
    showUnchanged: true,
  },
  {
    report: 'passed-only',
    filename: 'unchanged-only.png',
    viewport: { width: 1440, height: 960 },
  },
  {
    report: 'empty',
    filename: 'empty.png',
    viewport: { width: 1440, height: 960 },
  },
]

const resources = { browser: undefined, server: undefined }

const toPosixPath = (path) => path.split(sep).join('/')

const resetGeneratedOutput = () => {
  const result = spawnSync(
    'git',
    [
      'clean',
      '-fdX',
      '--',
      '.vrt-report-capture',
      '__screenshots__/vrt-report',
    ],
    { cwd: repositoryDirectory, encoding: 'utf8' },
  )

  if (result.error !== undefined)
    return err(
      new Error('Could not clear previous capture output.', {
        cause: result.error,
      }),
    )
  if (result.status !== 0)
    return err(
      new Error(result.stderr || 'Could not clear previous capture output.'),
    )

  return ok(undefined)
}

const listHtmlFiles = async (directory) => {
  const entries = (await readdir(directory, { withFileTypes: true })).toSorted(
    (left, right) => left.name.localeCompare(right.name),
  )
  const files = []

  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await listHtmlFiles(path)))
    else if (entry.isFile() && extname(entry.name) === '.html') files.push(path)
  }

  return files
}

const captureHtmlDirectory = async (browser, side) => {
  const sourceDirectory = join(fixtureDirectory, side)
  const outputDirectory = join(comparisonDirectory, 'mixed', side)
  const context = await browser.newContext({
    colorScheme: 'dark',
    deviceScaleFactor: 1,
    locale: 'en-US',
    reducedMotion: 'reduce',
    timezoneId: 'UTC',
    viewport: { width: 1440, height: 960 },
  })

  for (const sourcePath of await listHtmlFiles(sourceDirectory)) {
    const relativePath = relative(sourceDirectory, sourcePath)
    const outputPath = join(
      outputDirectory,
      relativePath.replace(/\.html$/, '.png'),
    )
    const viewport = relativePath.startsWith(`mobile${sep}`)
      ? { width: 390, height: 844 }
      : { width: 1440, height: 960 }
    const page = await context.newPage()

    await mkdir(resolve(outputPath, '..'), { recursive: true })
    await page.setViewportSize(viewport)
    await page.setContent(await readFile(sourcePath, 'utf8'))
    await page.evaluate(async () => {
      for (const image of document.images) image.loading = 'eager'
      await document.fonts.ready
      await Promise.all(Array.from(document.images, (image) => image.decode()))
    })
    await page.mouse.move(0, 0)
    await page.evaluate(
      () => new Promise((resolveFrame) => requestAnimationFrame(resolveFrame)),
    )
    await page.screenshot({
      path: outputPath,
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    })
    await page.close()
  }

  await context.close()
  return ok(undefined)
}

const createComparisonDirectories = async (name) => {
  const directory = join(comparisonDirectory, name)
  const directories = {
    root: directory,
    actual: join(directory, 'actual'),
    expected: join(directory, 'expected'),
    diff: join(directory, 'diff'),
    json: join(directory, 'out.json'),
  }

  await Promise.all(
    [directories.actual, directories.expected, directories.diff].map((path) =>
      mkdir(path, { recursive: true }),
    ),
  )

  return directories
}

const createPassedOnlyComparison = async () => {
  const mixed = join(comparisonDirectory, 'mixed')
  const passedOnly = await createComparisonDirectories('passed-only')
  const pathSegments = passedImageKey.split('/')

  for (const side of ['actual', 'expected']) {
    const sourcePath = join(mixed, side, ...pathSegments)
    const outputPath = join(passedOnly[side], ...pathSegments)
    await mkdir(resolve(outputPath, '..'), { recursive: true })
    await copyFile(sourcePath, outputPath)
  }

  return passedOnly
}

const runRegCli = async ({ root, actual, expected, diff, json }) => {
  const result = spawnSync(
    'reg-cli',
    [
      actual,
      expected,
      diff,
      '--json',
      json,
      '--matchingThreshold',
      '0.01',
      '--enableAntialias',
      '--thresholdPixel',
      '10',
      '--diffFormat',
      'png',
      '--ignoreChange',
    ],
    { cwd: repositoryDirectory, encoding: 'utf8' },
  )

  if (result.error !== undefined)
    return err(new Error(`Could not compare ${root}.`, { cause: result.error }))
  if (result.status !== 0)
    return err(
      new Error(
        result.stderr || `reg-cli exited with status ${result.status}.`,
      ),
    )

  process.stdout.write(result.stdout)
  return ok(undefined)
}

const runReportCli = async (name) => {
  const scenarioDirectory = join(comparisonDirectory, name)
  const outputDirectory = join(reportDirectory, name)
  const outputPath = join(outputDirectory, 'report.html')
  const baselineUrl = toPosixPath(
    relative(outputDirectory, join(scenarioDirectory, 'expected')),
  )

  await mkdir(outputDirectory, { recursive: true })

  const result = spawnSync(
    process.execPath,
    [
      cliPath,
      '--input',
      join(scenarioDirectory, 'out.json'),
      '--assets-dir',
      scenarioDirectory,
      '--output',
      outputPath,
      '--baseline-dir',
      baselineUrl,
    ],
    { cwd: repositoryDirectory, encoding: 'utf8' },
  )

  if (result.error !== undefined)
    return err(
      new Error(`Could not generate the ${name} report.`, {
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
  const mixed = await createComparisonDirectories('mixed')
  for (const side of ['expected', 'actual']) {
    const result = await captureHtmlDirectory(resources.browser, side)
    if (result.isErr()) return result
  }

  const passedOnly = await createPassedOnlyComparison()
  const empty = await createComparisonDirectories('empty')
  for (const comparison of [mixed, passedOnly, empty]) {
    const result = await runRegCli(comparison)
    if (result.isErr()) return result
  }

  for (const name of ['mixed', 'passed-only', 'empty']) {
    const result = await runReportCli(name)
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
      '.png': 'image/png',
      '.webp': 'image/webp',
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
      join(reportDirectory, entry.report, 'report.html'),
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
  const reset = resetGeneratedOutput()
  if (reset.isErr()) return reset

  await mkdir(screenshotDirectory, { recursive: true })
  resources.browser = await chromium.launch({ headless: true })
  const generated = await generateReports()
  if (generated.isErr()) return generated

  const server = await startStaticServer()
  if (server.isErr()) return server

  for (const entry of reportCaptures)
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
