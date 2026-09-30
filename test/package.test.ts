import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('..', import.meta.url))

function packedFiles(): string[] {
  const output = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: root,
    encoding: 'utf8',
  })
  const [pack] = JSON.parse(output) as { files: { path: string }[] }[]
  return pack.files.map((file) => file.path)
}

describe('published package', () => {
  it('ships only the build output and package metadata', () => {
    const topLevel = new Set(packedFiles().map((path) => path.split('/')[0]))

    expect([...topLevel].sort()).toEqual(['LICENSE', 'README.md', 'dist', 'package.json'])
  })
})
