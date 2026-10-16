// Copies Pulsar's built-in preset patterns (MIT, from the pulsar repo's docs assets) into the studio library.
// Usage: node scripts/sync-pulsar-presets.mjs [path/to/pulsar]   (default: ../../pulsar)
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(process.argv[2] ?? '../../pulsar', 'docs/src/content/docs/assets')
const dirs = ['presets', 'systemPresets/ios', 'systemPresets/android']
const out = []
for (const dir of dirs) {
  for (const f of readdirSync(join(root, dir)).filter((f) => f.endsWith('.json')).sort()) {
    const p = JSON.parse(readFileSync(join(root, dir, f), 'utf8'))
    out.push({
      name: p.name,
      description: p.description ?? '',
      tags: dir === 'presets' ? p.tags ?? [] : [dir.endsWith('ios') ? 'iOS' : 'Android', ...(p.tags ?? [])],
      pattern: { discretePattern: p.discretePattern, continuousPattern: p.continuousPattern },
    })
  }
}
writeFileSync('src/pulsar-presets.json', JSON.stringify(out))
console.log(`wrote ${out.length} presets to src/pulsar-presets.json`)
