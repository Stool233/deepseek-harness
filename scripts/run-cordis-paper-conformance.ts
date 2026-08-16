/** Run the pinned Cordis paper kit against the vendored implementation. */
import assert from 'node:assert/strict'
import { access, readFile, readdir } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'
import { execa } from 'execa'

interface ScenarioReport {
  readonly name: string
  readonly events: unknown
  readonly traceMatched: unknown
  readonly properties: Readonly<Record<string, unknown>>
}

interface PrerequisiteReport {
  readonly name: string
  readonly properties: Readonly<Record<string, unknown>>
}

interface ConformanceReport {
  readonly scenarios: readonly ScenarioReport[]
  readonly prerequisites: readonly PrerequisiteReport[]
  readonly traceMatched: unknown
  readonly expectedFailures: unknown
}

const windowsAbsolute = /^(?:[A-Za-z]:[\\/]|\\\\)/
const embeddedUnixAbsolute = /(?:^|[:=;\s])\/(?!\/)/
const embeddedWindowsAbsolute = /(?:^|[=;\s])(?:[A-Za-z]:[\\/]|\\\\)/

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function parseJson(value: string): unknown {
  return JSON.parse(value) as unknown
}

function absolutePathAt(value: unknown, location = '$'): string | undefined {
  if (typeof value === 'string') {
    return isAbsolute(value) || windowsAbsolute.test(value) || embeddedUnixAbsolute.test(value) || embeddedWindowsAbsolute.test(value)
      ? location
      : undefined
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) {
      const found = absolutePathAt(value[index], `${location}[${index}]`)
      if (found) return found
    }
    return undefined
  }
  if (isRecord(value)) {
    for (const [key, item] of Object.entries(value)) {
      const found = absolutePathAt(item, `${location}.${key}`)
      if (found) return found
    }
  }
  return undefined
}

async function serializedEvidenceFiles(directory: string): Promise<string[]> {
  const files: string[] = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await serializedEvidenceFiles(path))
    else if (entry.isFile() && (path.endsWith('.json') || path.endsWith('.ndjson'))) files.push(path)
  }
  return files.sort()
}

async function assertPortableEvidence(directory: string): Promise<void> {
  const files = await serializedEvidenceFiles(directory)
  assert.ok(files.length > 0, 'Cordis conformance produced no serialized evidence')
  for (const path of files) {
    const content = await readFile(path, 'utf8')
    const value: unknown = path.endsWith('.ndjson')
      ? content.trim().split('\n').filter(Boolean).map(parseJson)
      : parseJson(content)
    const found = absolutePathAt(value)
    assert.equal(found, undefined, `${path} contains an absolute path at ${found}`)
  }
}

function readConformanceReport(value: unknown): ConformanceReport {
  assert.ok(isRecord(value), 'conformance report must be an object')
  assert.ok(Array.isArray(value.scenarios), 'conformance report must contain scenarios')
  assert.ok(Array.isArray(value.prerequisites), 'conformance report must contain prerequisite audits')
  const scenarios: ScenarioReport[] = []
  for (const candidate of value.scenarios as unknown[]) {
    assert.ok(isRecord(candidate), 'scenario report must be an object')
    assert.ok(typeof candidate.name === 'string', 'scenario report must contain a name')
    assert.ok('traceMatched' in candidate, `${candidate.name} must report TraceMatched`)
    assert.ok(isRecord(candidate.properties), `${candidate.name} must report property statuses`)
    scenarios.push({
      name: candidate.name,
      events: candidate.events,
      traceMatched: candidate.traceMatched,
      properties: candidate.properties,
    })
  }
  const prerequisites: PrerequisiteReport[] = []
  for (const candidate of value.prerequisites as unknown[]) {
    assert.ok(isRecord(candidate), 'prerequisite report must be an object')
    assert.ok(typeof candidate.name === 'string', 'prerequisite report must contain a name')
    assert.ok(isRecord(candidate.properties), `${candidate.name} must report property statuses`)
    prerequisites.push({
      name: candidate.name,
      properties: candidate.properties,
    })
  }
  return {
    scenarios,
    prerequisites,
    traceMatched: value.traceMatched,
    expectedFailures: value.expectedFailures,
  }
}

const repository = resolve(import.meta.dirname, '..')
const formalRepository = resolve(
  process.env.CORDIS_FORMAL_ROOT ?? join(import.meta.dirname, '../../../cordiverse/cordis'),
)
const runner = join(formalRepository, 'formal/tools/run.mjs')
const implementationRoot = join(repository, 'vendor/cordis')
const scenarioModule = join(repository, 'scripts/cordis-paper-scenarios.ts')
const output = resolve(process.env.CORDIS_FORMAL_OUTPUT ?? join(repository, '.artifacts/cordis-paper'))
const cache = join(output, 'cache')
const expectedFailuresFile = join(repository, 'scripts/cordis-paper-baseline-failures.json')
const behaviorProbe = join(repository, 'scripts/cordis-paper-baseline-behavior.ts')

await access(runner).catch(() => {
  throw new Error(`Cordis conformance kit not found at ${formalRepository}; set CORDIS_FORMAL_ROOT`)
})

const revision = process.env.CORDIS_IMPLEMENTATION_REVISION
  ?? (await execa('git', ['rev-parse', 'HEAD'], { cwd: repository })).stdout.trim()
const common = [
  '--quiet',
  '--output', output,
  '--cache', cache,
  '--implementation-root', implementationRoot,
  '--implementation-name', 'deepseek-harness-vendored-cordis',
  '--implementation-role', 'vendored-unmodified',
  '--revision', revision,
  '--scenario-module', scenarioModule,
  '--trace-runtime-root', repository,
]

await execa('tsx', [behaviorProbe, '--output', join(output, 'baseline-behavior-report.json'), '--revision', revision], {
  cwd: repository,
  stdio: 'inherit',
})
await execa('node', [runner, 'baseline', ...common, '--skip-baseline-behavior', '--expected-baseline-failures', expectedFailuresFile], {
  cwd: formalRepository,
  stdio: 'inherit',
})
await execa('tsx', [join(repository, 'scripts/verify-cordis-paper-observation.ts')], {
  cwd: repository,
  stdio: 'inherit',
})

await assertPortableEvidence(output)

const report = readConformanceReport(JSON.parse(await readFile(join(output, 'conformance-report.json'), 'utf8')))
const expectedTlcFailures = [
  'provider-consumer-reverse-exit',
  'async-consumer-teardown-guard',
  'concurrent-root-teardown-guard',
  'provider-identity-replacement',
  'dependency-loss-during-iteration',
  'dependency-return-during-unload',
  'isolation-realms',
  'deepseek-agent-loop-assembly',
  'confluence-left',
  'confluence-right',
]
assert.equal(report.traceMatched, 'expected-fail', 'aggregate baseline result must remain expected-fail')
assert.deepEqual(report.expectedFailures, expectedTlcFailures, 'the vendored TLC mismatch set changed')
const required = new Set([
  'vendored-reentrant-dispose',
  'vendored-pending-effect',
  'vendored-async-cleanup-join',
  'deepseek-agent-loop-assembly',
])
for (const scenario of report.scenarios) {
  required.delete(scenario.name)
  assert.ok(typeof scenario.events === 'number' && scenario.events > 0, `${scenario.name} produced an empty trace`)
  const expected = expectedTlcFailures.includes(scenario.name) ? 'expected-fail' : 'pass'
  assert.equal(scenario.traceMatched, expected, `${scenario.name} has an unexpected TraceMatched result`)
  assert.ok(Object.values(scenario.properties).every(status => status === expected), `${scenario.name} has inconsistent property evidence`)
}
assert.deepEqual([...required], [], 'one or more DeepSeek Harness scenarios were not executed')

const expectedPrerequisites: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  'cyclic-dependencies': { Progress: 'not-applicable' },
  'non-independent-effects': { Confluence: 'not-applicable' },
  'non-total-provision': { Progress: 'not-applicable' },
}
assert.deepEqual(
  Object.fromEntries(report.prerequisites.map(item => [item.name, item.properties])),
  expectedPrerequisites,
  'prerequisite failures must remain explicit not-applicable results',
)
