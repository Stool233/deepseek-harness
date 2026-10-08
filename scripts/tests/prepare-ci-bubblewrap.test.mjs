import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { test } from 'node:test'

const script = resolve('scripts/prepare-ci-bubblewrap.sh')

for (const failure of ['update', 'download', 'extract', 'probe', 'none']) {
  test(`preparation ${failure === 'none' ? 'publishes a probed binary' : `fails closed on ${failure}`}`, () => {
    const root = mkdtempSync(`${tmpdir()}/prepare-bwrap-test-`)
    try {
      const bin = `${root}/bin`
      mkdirSync(bin)
      const githubPath = `${root}/github-path`
      writeFileSync(githubPath, '')
      const commands = {
        sudo: 'exec "$@"',
        uname: 'if [ "$1" = -s ]; then echo Linux; else echo x86_64; fi',
        'apt-get': `
case "$*" in
  *update) [ "$FAILURE" != update ] || exit 100 ;;
  *download*) [ "$FAILURE" != download ] || exit 100; touch bubblewrap_test_amd64.deb ;;
  *) exit 90 ;;
esac`,
        'dpkg-deb': `
if [ "$1" = --show ]; then echo 'bubblewrap test amd64'; exit; fi
[ "$FAILURE" != extract ] || exit 2
mkdir -p "$3/usr/bin"
printf '#!/bin/sh\n[ "$1" = --version ] || [ "$FAILURE" != probe ]\n' > "$3/usr/bin/bwrap"
chmod +x "$3/usr/bin/bwrap"`,
        sysctl: 'exit 1',
      }
      for (const [name, body] of Object.entries(commands)) {
        writeFileSync(`${bin}/${name}`, `#!/bin/sh\n${body}\n`, { mode: 0o755 })
      }
      const result = spawnSync('bash', [script], {
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, RUNNER_TEMP: root, GITHUB_PATH: githubPath, FAILURE: failure },
        encoding: 'utf8',
        timeout: 10000,
      })
      assert.ifError(result.error)
      assert.equal(result.signal, null)
      const exported = readFileSync(githubPath, 'utf8')
      if (failure === 'none') {
        assert.equal(result.status, 0, result.stderr)
        assert.match(exported, /\/root\/usr\/bin\n$/)
        assert.match(result.stdout, /functional probe passed/)
      } else {
        assert.notEqual(result.status, 0)
        assert.equal(exported, '')
        assert.doesNotMatch(result.stdout, /functional probe passed/)
      }
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
}
