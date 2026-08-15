/** Run the pinned Cordis paper kit against the vendored implementation. */
import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
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
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
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
  return { scenarios, prerequisites, traceMatched: value.traceMatched }
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
  '--revision', revision,
  '--scenario-module', scenarioModule,
  '--trace-runtime-root', repository,
]

await execa('node', [runner, 'trace', ...common], {
  cwd: formalRepository,
  stdio: 'inherit',
})
await execa('node', [runner, 'mutation', ...common], {
  cwd: formalRepository,
  stdio: 'inherit',
})
await execa('tsx', [join(repository, 'scripts/verify-cordis-paper-observation.ts')], {
  cwd: repository,
  stdio: 'inherit',
})

const report = readConformanceReport(JSON.parse(await readFile(join(output, 'conformance-report.json'), 'utf8')))
assert.equal(report.traceMatched, 'pass', 'aggregate TraceMatched did not pass')
const required = new Set([
  'vendored-reentrant-dispose',
  'vendored-pending-effect',
  'vendored-async-cleanup-join',
  'deepseek-agent-loop-assembly',
])
for (const scenario of report.scenarios) {
  required.delete(scenario.name)
  assert.ok(typeof scenario.events === 'number' && scenario.events > 0, `${scenario.name} produced an empty trace`)
  assert.equal(scenario.traceMatched, 'pass', `${scenario.name} did not fully match`)
  assert.ok(Object.values(scenario.properties).every(status => status === 'pass'), `${scenario.name} has incomplete evidence`)
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
