import { err, ok, type Result } from 'neverthrow'

import { type GenerateOptions, generateReport } from '#generate'
import { DEFAULT_BASELINE_DIR } from '#render'

type ParsedArgs = { kind: 'help' } | { kind: 'run'; options: GenerateOptions }

const usage = `Usage: vrt-report --input <out.json> --assets-dir <directory> --output <report.html> [--stories-dir <directory>] [--baseline-dir <relative-path-or-url>]

Generate a standalone HTML report from reg-cli output.

Options:
  --input         Path to .reg/out.json
  --assets-dir    Directory containing actual/ and diff/
  --output        Path to the generated HTML file
  --stories-dir   Storybook project root (requires Storybook >=9; default: current directory)
  --baseline-dir  Relative path or absolute URL to baseline/actual (default: ${DEFAULT_BASELINE_DIR})
  -h, --help      Show this help
`

const flagNames = new Set([
  '--input',
  '--assets-dir',
  '--output',
  '--stories-dir',
  '--baseline-dir',
])

const parseArgs = (args: string[]): Result<ParsedArgs, Error> => {
  if (args.includes('--help') || args.includes('-h'))
    return ok({ kind: 'help' })

  const values = new Map<string, string>()
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index]
    if (flag === undefined || !flagNames.has(flag)) {
      return err(new Error(`Unknown option: ${flag ?? ''}\n\n${usage}`))
    }
    if (values.has(flag))
      return err(new Error(`Option used more than once: ${flag}`))

    const value = args[index + 1]
    if (value === undefined || value.startsWith('--'))
      return err(new Error(`Missing value for ${flag}`))

    values.set(flag, value)
    index += 1
  }

  const inputPath = values.get('--input')
  const assetsDirectory = values.get('--assets-dir')
  const outputPath = values.get('--output')
  if (
    inputPath === undefined ||
    assetsDirectory === undefined ||
    outputPath === undefined
  ) {
    return err(
      new Error(
        `The --input, --assets-dir, and --output options are required.\n\n${usage}`,
      ),
    )
  }

  const baselineDirectory = values.get('--baseline-dir')
  return ok({
    kind: 'run',
    options: {
      inputPath,
      assetsDirectory,
      outputPath,
      storiesDirectory: values.get('--stories-dir'),
      baselineDirectory,
    },
  })
}

const describeError = (error: Error): string =>
  error.cause instanceof Error
    ? `${error.message}: ${describeError(error.cause)}`
    : error.message

export const runCli = async (args: string[]): Promise<void> => {
  const parsed = parseArgs(args)
  if (parsed.isErr()) {
    process.stderr.write(`vrt-report: ${parsed.error.message}\n`)
    process.exitCode = 2
    return
  }
  if (parsed.value.kind === 'help') {
    process.stdout.write(usage)
    return
  }

  const result = await generateReport(parsed.value.options)
  if (result.isErr()) {
    process.stderr.write(`vrt-report: ${describeError(result.error)}\n`)
    process.exitCode = 1
    return
  }

  process.stdout.write(`Generated report: ${result.value.outputPath}\n`)
}
