import { useState } from 'react'
import presets from './pulsar-presets.json'
import { Spark } from './Spark'
import { Plus } from './icons'
import type { Pattern } from './types'

type LibraryPreset = { name: string; description: string; tags: string[]; pattern: Pattern }
const all = presets as LibraryPreset[]

/** Pulsar's built-in presets (synced by `npm run sync-presets`). Click to feel, + to copy into the project. */
export function Library({ onPreview, onAdd }: { onPreview: (p: Pattern) => void; onAdd: (p: Pattern, name: string) => void }) {
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const list = needle
    ? all.filter((p) => [p.name, ...p.tags].some((s) => s.toLowerCase().includes(needle)))
    : all

  return (
    <>
      <input className="search" type="search" placeholder={`Search ${all.length} presets or tags`} value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="list">
        {list.map((p) => (
          <li key={p.tags[0] + p.name} title={p.description} onClick={() => onPreview(p.pattern)}>
            <Spark pattern={p.pattern} />
            <span className="grow">
              {p.name}
              <small>{p.tags.slice(0, 3).join(' · ')}</small>
            </span>
            <button className="icon" title="Add to project" onClick={(e) => { e.stopPropagation(); onAdd(structuredClone(p.pattern), p.name) }}>
              <Plus />
            </button>
          </li>
        ))}
        {!list.length && <li className="empty">No presets match “{q}”.</li>}
      </ul>
    </>
  )
}
