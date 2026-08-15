/** Verify that every paper-relevant vendored Cordis write has a trace observation. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

interface ManifestEntry {
  readonly file: string
  readonly category: string
  readonly source: string
  readonly occurrences: number
  readonly observer: string
}

const repository = resolve(import.meta.dirname, '..')
const manifestPath = join(repository, 'vendor/cordis/formal-observation-points.json')
const scanners: Record<string, readonly (readonly [string, RegExp])[]> = {
  'vendor/cordis/src/fiber.ts': [
    ['lifecycle', /(?:public\s+state\s*=(?!=)|this\.state\s*=(?!=))/],
    ['uid', /this\.uid\s*=(?!=)/],
    ['epoch', /(?:\bepoch:\s*(?:INACTIVE|''|true)|(?:runner|this\._runner)\.epoch\s*=(?!=))/],
    ['target', /(?:private\s+_target[^=]*=|(?:delete\s+)?this\._store\[name\]\s*=|delete\s+this\._store\[name\]|this\._target\s*=)/],
    ['committed', /this\.store\s*=/],
    ['registry', /(?:runtime\.fibers\.push\(|^\s*remove\(\))/],
  ],
  'vendor/cordis/src/reflect.ts': [
    ['service', /(?:public\s+store[^=]*=|this\.store\[key\]\s*=|this\.ctx\.fiber\.store!\[name\]\s*=|delete\s+this\.store\[key\]|delete\s+this\.ctx\.fiber\.store!\[name\])/],
  ],
  'vendor/cordis/src/registry.ts': [
    ['registry', /this\._internal\.(?:set|delete)\(/],
  ],
}

function entryKey(entry: Pick<ManifestEntry, 'file' | 'category' | 'source'>): string {
  return `${entry.file}\u0000${entry.category}\u0000${entry.source}`
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
  readonly schema: string
  readonly entries: readonly ManifestEntry[]
}
assert.equal(manifest.schema, 'cordis.paper-observation-points/v1')
const expected = new Map<string, number>()
for (const entry of manifest.entries) {
  assert.notEqual(entry.observer, '', `missing observer for ${entry.file}: ${entry.source}`)
  const key = entryKey(entry)
  assert.equal(expected.has(key), false, `duplicate observation entry: ${entry.file}: ${entry.source}`)
  expected.set(key, entry.occurrences)
}

const actual = new Map<string, number>()
for (const [file, rules] of Object.entries(scanners)) {
  const lines = (await readFile(join(repository, file), 'utf8')).split('\n')
  for (const line of lines) {
    for (const [category, pattern] of rules) {
      if (!pattern.test(line)) continue
      const key = entryKey({ file, category, source: line.trim() })
      actual.set(key, (actual.get(key) ?? 0) + 1)
    }
  }
}

const errors: string[] = []
for (const [key, count] of actual) {
  const wanted = expected.get(key)
  if (wanted === undefined) {
    errors.push(`unobserved write: ${key.split('\u0000').join(': ')}`)
  } else if (wanted !== count) {
    errors.push(`write count changed: ${key.split('\u0000').join(': ')}; expected ${wanted}, found ${count}`)
  }
}
for (const [key, count] of expected) {
  if (!actual.has(key)) errors.push(`stale manifest entry (${count} occurrence(s)): ${key.split('\u0000').join(': ')}`)
}

if (errors.length > 0) {
  throw new Error(`Cordis paper observation coverage failed:\n${errors.map(error => `- ${error}`).join('\n')}`)
}
console.log(`cordis paper observation coverage: ${manifest.entries.length} approved write points`)
