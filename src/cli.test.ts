import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { join, resolve } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

const reportInput = {
  failedItems: ['desktop/ui/example-card.stories.tsx/shows-panel.png'],
  newItems: ['mobile/ui/example-card.stories.tsx/opens-dialog.png'],
  deletedItems: [
    'tablet/legacy/removed-card.stories.tsx/renders-old-control.png',
  ],
  passedItems: ['mobile/ui/example-card.stories.tsx/shows-panel.png'],
}

let tempDirectory: string | undefined

const installPackage = (): { directory: string; binPath: string } => {
  const directory = mkdtempSync('/tmp/vrt-report-smoke-')
  tempDirectory = directory
  const packageDirectory = join(
    directory,
    'node_modules',
    '@fohte',
    'vrt-report',
  )
  mkdirSync(packageDirectory, { recursive: true })
  cpSync(resolve('bin'), join(packageDirectory, 'bin'), { recursive: true })
  cpSync(resolve('dist'), join(packageDirectory, 'dist'), { recursive: true })
  copyFileSync(resolve('package.json'), join(packageDirectory, 'package.json'))
  symlinkSync(
    resolve('node_modules/neverthrow'),
    join(directory, 'node_modules', 'neverthrow'),
    'dir',
  )
  return { directory, binPath: join(packageDirectory, 'bin', 'vrt-report.js') }
}

const readEmbeddedReport = (html: string | null): unknown => {
  const source = html?.match(
    /<script id="report-data" type="application\/json">([\s\S]*?)<\/script>/,
  )?.[1]
  return source === undefined ? null : (JSON.parse(source) as unknown)
}

const runCli = (binPath: string, args: string[], outputPath: string) => {
  const run = spawnSync(process.execPath, [binPath, ...args], {
    encoding: 'utf8',
  })
  const html = existsSync(outputPath) ? readFileSync(outputPath, 'utf8') : null
  return {
    status: run.status,
    stdout: run.stdout,
    stderr: run.stderr,
    error: run.error,
    reportData: readEmbeddedReport(html),
  }
}

const runUsageScenarios = (binPath: string, outputPath: string) => ({
  help: runCli(binPath, ['--help'], outputPath),
  missingOptions: runCli(binPath, [], outputPath),
})

const normalizeTempPath = (
  result: ReturnType<typeof runCli>,
  directory: string,
): ReturnType<typeof runCli> => ({
  ...result,
  stderr: result.stderr.replaceAll(directory, '<temp>'),
})

afterEach(() => {
  if (tempDirectory !== undefined)
    rmSync(tempDirectory, { recursive: true, force: true })
  tempDirectory = undefined
})

describe('vrt-report CLI', () => {
  it('prints help and returns a usage error for missing required options', () => {
    const { directory, binPath } = installPackage()
    const outputPath = join(directory, 'unused.html')
    const usage = `Usage: vrt-report --input <out.json> --assets-dir <directory> --output <report.html> [--stories-dir <directory>] [--baseline-dir <relative-path>]

Generate a standalone HTML report from reg-cli output.

Options:
  --input         Path to .reg/out.json
  --assets-dir    Directory containing actual/ and diff/
  --output        Path to the generated HTML file
  --stories-dir   Root directory containing Storybook stories (default: current directory)
  --baseline-dir  Relative URL to baseline/actual (default: ../../baseline/actual)
  -h, --help      Show this help
`
    expect(runUsageScenarios(binPath, outputPath)).toEqual({
      help: {
        status: 0,
        stdout: usage,
        stderr: '',
        error: undefined,
        reportData: null,
      },
      missingOptions: {
        status: 2,
        stdout: '',
        stderr: `vrt-report: The --input, --assets-dir, and --output options are required.\n\n${usage}\n`,
        error: undefined,
        reportData: null,
      },
    })
  })

  it('generates an HTML report when launched from an installed package', () => {
    const { directory, binPath } = installPackage()
    const inputPath = join(directory, 'out.json')
    const outputPath = join(directory, 'reports', 'report.html')
    writeFileSync(inputPath, JSON.stringify(reportInput))

    expect(
      runCli(
        binPath,
        [
          '--input',
          inputPath,
          '--assets-dir',
          join(directory, 'assets'),
          '--output',
          outputPath,
        ],
        outputPath,
      ),
    ).toEqual({
      status: 0,
      stdout: `Generated report: ${outputPath}\n`,
      stderr: '',
      error: undefined,
      reportData: {
        counts: { changed: 1, new: 1, deleted: 1, passed: 1 },
        stories: [
          {
            id: 'legacy/removed-card.stories.tsx/renders-old-control.png',
            storyId: 'renders-old-control',
            component: 'removed-card',
            sourcePath: 'legacy/removed-card.stories.tsx',
            directories: ['legacy'],
            variants: [
              {
                name: 'tablet',
                status: 'deleted',
                before:
                  '../../baseline/actual/tablet/legacy/removed-card.stories.tsx/renders-old-control.png',
                after: null,
                diff: null,
              },
            ],
          },
          {
            id: 'ui/example-card.stories.tsx/opens-dialog.png',
            storyId: 'opens-dialog',
            component: 'example-card',
            sourcePath: 'ui/example-card.stories.tsx',
            directories: ['ui'],
            variants: [
              {
                name: 'mobile',
                status: 'new',
                before: null,
                after:
                  '../assets/actual/mobile/ui/example-card.stories.tsx/opens-dialog.png',
                diff: null,
              },
            ],
          },
          {
            id: 'ui/example-card.stories.tsx/shows-panel.png',
            storyId: 'shows-panel',
            component: 'example-card',
            sourcePath: 'ui/example-card.stories.tsx',
            directories: ['ui'],
            variants: [
              {
                name: 'desktop',
                status: 'changed',
                before:
                  '../../baseline/actual/desktop/ui/example-card.stories.tsx/shows-panel.png',
                after:
                  '../assets/actual/desktop/ui/example-card.stories.tsx/shows-panel.png',
                diff: '../assets/diff/desktop/ui/example-card.stories.tsx/shows-panel.png',
              },
              {
                name: 'mobile',
                status: 'unchanged',
                before:
                  '../../baseline/actual/mobile/ui/example-card.stories.tsx/shows-panel.png',
                after:
                  '../../baseline/actual/mobile/ui/example-card.stories.tsx/shows-panel.png',
                diff: null,
              },
            ],
          },
        ],
      },
    })
  })

  it('uses the supplied baseline directory', () => {
    const { directory, binPath } = installPackage()
    const inputPath = join(directory, 'out.json')
    const outputPath = join(directory, 'report.html')
    const key = 'desktop/ui/example-card.stories.tsx/shows-panel.png'
    writeFileSync(
      inputPath,
      JSON.stringify({
        failedItems: [key],
        newItems: [],
        deletedItems: [],
        passedItems: [],
      }),
    )
    expect(
      runCli(
        binPath,
        [
          '--input',
          inputPath,
          '--assets-dir',
          join(directory, 'assets'),
          '--output',
          outputPath,
          '--baseline-dir',
          '../baseline-copy',
        ],
        outputPath,
      ),
    ).toEqual({
      status: 0,
      stdout: `Generated report: ${outputPath}\n`,
      stderr: '',
      error: undefined,
      reportData: {
        counts: { changed: 1, new: 0, deleted: 0, passed: 0 },
        stories: [
          {
            id: 'ui/example-card.stories.tsx/shows-panel.png',
            storyId: 'shows-panel',
            component: 'example-card',
            sourcePath: 'ui/example-card.stories.tsx',
            directories: ['ui'],
            variants: [
              {
                name: 'desktop',
                status: 'changed',
                before:
                  '../baseline-copy/desktop/ui/example-card.stories.tsx/shows-panel.png',
                after:
                  'assets/actual/desktop/ui/example-card.stories.tsx/shows-panel.png',
                diff: 'assets/diff/desktop/ui/example-card.stories.tsx/shows-panel.png',
              },
            ],
          },
        ],
      },
    })
  })

  it('returns the underlying read error when the input file is missing', () => {
    const { directory, binPath } = installPackage()
    const inputPath = join(directory, 'missing.json')
    const outputPath = join(directory, 'report.html')
    const result = runCli(
      binPath,
      [
        '--input',
        inputPath,
        '--assets-dir',
        join(directory, 'assets'),
        '--output',
        outputPath,
      ],
      outputPath,
    )
    expect(normalizeTempPath(result, directory)).toEqual({
      status: 1,
      stdout: '',
      stderr:
        "vrt-report: Could not read report data: <temp>/missing.json: ENOENT: no such file or directory, open '<temp>/missing.json'\n",
      error: undefined,
      reportData: null,
    })
  })
})
