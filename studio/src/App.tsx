import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Chart, COLORS, type Selection } from './Chart'
import { Device } from './Device'
import { Library } from './Library'
import { Spark } from './Spark'
import { Bolt, Copy, Download, Monitor, Moon, Play, Plus, Stop, Sun, Upload, X } from './icons'
import { playSound, stopSound } from './audio'
import { useRelay } from './relay'
import { useRive } from './rive'
import { emptyPattern, isPattern, patternEnd, toDevice, type Layer, type Msg, type Pattern, type Project } from './types'

const KEY = 'rive-haptics-project'
const uid = () => Math.random().toString(36).slice(2, 9)

const starter = (): Project => ({
  presets: [
    {
      id: uid(),
      name: 'Thud',
      pattern: {
        discretePattern: [{ time: 0, amplitude: 1, frequency: 0.6 }],
        continuousPattern: {
          amplitude: [{ time: 0, value: 0.8 }, { time: 120, value: 0.3 }, { time: 300, value: 0 }],
          frequency: [{ time: 0, value: 0.4 }, { time: 300, value: 0.1 }],
        },
      },
    },
  ],
  map: {},
})

function load(): Project {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? '')
    if (Array.isArray(p?.presets) && p.presets.length) return p
  } catch { /* fall through */ }
  return starter()
}

function download(name: string, data: unknown) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  a.download = name
  // Attached + revoked later: Safari/Arc cancel the save if the URL dies in the same tick.
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
}

const toBase64 = (buf: ArrayBuffer) => {
  let bin = ''
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}
const fromBase64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)).buffer

type Theme = 'light' | 'dark' | 'system'
const THEME_KEY = 'rive-haptics-theme'

const slug = (s: string) => s.trim().replace(/\W+/g, '-').toLowerCase() || 'pattern'

export default function App() {
  const [project, setProject] = useState(load)
  const [currentId, setCurrentId] = useState(() => project.presets[0].id)
  const [layer, setLayer] = useState<Layer>('amplitude')
  const [selected, setSelected] = useState<Selection>(null)
  const [playhead, setPlayhead] = useState<number | null>(null)
  const [sound, setSound] = useState(true)
  const [onPhone, setOnPhone] = useState(true)
  const [log, setLog] = useState<{ id: number; time: string; text: string }[]>([])
  const [dragging, setDragging] = useState(false)
  const [theme, setTheme] = useState<Theme>(() => {
    try { return (localStorage.getItem(THEME_KEY) as Theme) || 'light' } catch { return 'light' }
  })
  const triggerRows = useRef<Record<string, HTMLDivElement | null>>({})
  const [tab, setTab] = useState<'project' | 'library'>('project')
  const history = useRef<Project[]>([])

  // Rive
  const canvas = useRef<HTMLCanvasElement>(null)
  const [riv, setRiv] = useState<{ name: string; buffer: ArrayBuffer } | null>(null)
  const [stateMachine, setStateMachine] = useState<string>()

  const preset = project.presets.find((p) => p.id === currentId) ?? project.presets[0]
  const pattern = preset.pattern

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(project)) } catch { /* private mode */ }
  }, [project])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem(THEME_KEY, theme) } catch { /* private mode */ }
  }, [theme])

  const begin = useCallback(() => {
    history.current.push(structuredClone(project))
    if (history.current.length > 100) history.current.shift()
  }, [project])

  const undo = () => {
    const prev = history.current.pop()
    if (prev) { setProject(prev); setSelected(null) }
  }

  const setPattern = (p: Pattern) =>
    setProject((pr) => ({ ...pr, presets: pr.presets.map((x) => (x.id === preset.id ? { ...x, pattern: p } : x)) }))

  const mapped = useMemo(() => {
    const out: Record<string, Pattern> = {}
    for (const [trigger, id] of Object.entries(project.map)) {
      const p = project.presets.find((x) => x.id === id)
      if (p) out[trigger] = toDevice(p.pattern)
    }
    return out
  }, [project])

  const addLog = (text: string) =>
    setLog((l) => [{ id: performance.now(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), text }, ...l].slice(0, 30))

  // Restart the row's highlight so you can see which slot just fired.
  const flash = (name: string) => {
    const el = triggerRows.current[name]
    if (!el) return
    el.classList.remove('fired')
    void el.offsetWidth
    el.classList.add('fired')
  }

  // Relay
  const sendLoadRef = useRef<() => void>(() => {})
  const { phones, send } = useRelay((m: Msg) => {
    if (m.type === 'hello') { addLog(`Phone joined · ${m.device}`); sendLoadRef.current() }
    if (m.type === 'fired') { addLog(`Phone fired “${m.name}”`); flash(m.name) }
  })

  const sendLoad = useCallback(async () => {
    if (!riv) return
    const { path } = await fetch('/riv', { method: 'POST', body: riv.buffer }).then((r) => r.json())
    send({ type: 'load', riv: path, stateMachine, map: mapped })
  }, [riv, stateMachine, mapped, send])
  sendLoadRef.current = sendLoad

  // Reload the file on the phone when it or its state machine changes; patch the map otherwise.
  useEffect(() => { if (phones) sendLoadRef.current() }, [riv, stateMachine, phones])
  useEffect(() => { send({ type: 'map', map: mapped }) }, [mapped, send])

  // Playback
  const raf = useRef(0)
  const play = (p: Pattern) => {
    cancelAnimationFrame(raf.current)
    if (sound) playSound(p)
    if (onPhone && phones) send({ type: 'play', pattern: toDevice(p) })
    const end = patternEnd(p)
    const t0 = performance.now()
    const tick = () => {
      const t = performance.now() - t0
      setPlayhead(t <= end ? t : null)
      if (t <= end) raf.current = requestAnimationFrame(tick)
    }
    tick()
  }
  const stop = () => { cancelAnimationFrame(raf.current); stopSound(); setPlayhead(null) }

  const { info, fire, restart, paused, setPause } = useRive(canvas, riv?.buffer ?? null, stateMachine, (name) => {
    addLog(`Studio fired “${name}”`)
    flash(name)
    const p = project.presets.find((x) => x.id === project.map[name])
    if (p && sound) playSound(p.pattern)
  })
  useEffect(() => {
    if (!stateMachine && info.stateMachines.length) setStateMachine(info.stateMachines[0])
  }, [info.stateMachines, stateMachine])

  // Keyboard: delete point, undo, play
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, select, textarea')) return
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') { e.preventDefault(); undo() }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        begin()
        const p = structuredClone(pattern)
        if (selected.layer === 'discrete') p.discretePattern.splice(selected.index, 1)
        else p.continuousPattern[selected.layer].splice(selected.index, 1)
        setPattern(p)
        setSelected(null)
      } else if (e.key === ' ') { e.preventDefault(); if (playhead === null) play(pattern); else stop() }
      else if (e.key === '1') setLayer('amplitude')
      else if (e.key === '2') setLayer('frequency')
      else if (e.key === '3') setLayer('discrete')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Presets
  const addPreset = (p: Pattern = emptyPattern(), name = 'Untitled') => {
    begin()
    const id = uid()
    setProject((pr) => ({ ...pr, presets: [...pr.presets, { id, name, pattern: p }] }))
    setCurrentId(id)
    setSelected(null)
  }
  const removePreset = (id: string) => {
    if (project.presets.length === 1) return
    begin()
    setProject((pr) => ({
      presets: pr.presets.filter((x) => x.id !== id),
      map: Object.fromEntries(Object.entries(pr.map).filter(([, v]) => v !== id)),
    }))
    if (id === currentId) setCurrentId(project.presets.find((x) => x.id !== id)!.id)
  }
  const rename = (name: string) =>
    setProject((pr) => ({ ...pr, presets: pr.presets.map((x) => (x.id === preset.id ? { ...x, name } : x)) }))

  const importFile = async (f: File) => {
    if (f.name.endsWith('.riv')) { setStateMachine(undefined); setRiv({ name: f.name, buffer: await f.arrayBuffer() }); return }
    try {
      const data = JSON.parse(await f.text())
      if (isPattern(data)) addPreset(data, f.name.replace(/\.json$/, ''))
      else if (Array.isArray(data?.presets) && data.presets.length) {
        begin()
        setProject({ presets: data.presets, map: data.map ?? {} })
        setCurrentId(data.presets[0].id)
        setSelected(null)
        if (data.riv?.data) { setStateMachine(data.riv.stateMachine); setRiv({ name: data.riv.name, buffer: fromBase64(data.riv.data) }) }
        addLog(`Opened project · ${data.presets.length} patterns${data.riv ? ' + ' + data.riv.name : ''}`)
      }
      else alert('Not a Pulsar pattern or project file')
    } catch { alert('Could not read ' + f.name) }
  }

  // Inspector
  const sel = selected && (selected.layer === 'discrete' ? pattern.discretePattern[selected.index] : pattern.continuousPattern[selected.layer][selected.index])
  const editSel = (field: string, v: number) => {
    if (!selected) return
    const p = structuredClone(pattern)
    const target = selected.layer === 'discrete' ? p.discretePattern[selected.index] : p.continuousPattern[selected.layer][selected.index]
    ;(target as Record<string, number>)[field] = field === 'time' ? Math.max(0, v) : Math.min(1, Math.max(0, v / 100))
    setPattern(p)
  }

  const viewMs = Math.max(1000, Math.ceil((patternEnd(pattern) + 250) / 500) * 500)


  const LAYERS: { id: Layer; label: string; key: string }[] = [
    { id: 'amplitude', label: 'Intensity', key: '1' },
    { id: 'frequency', label: 'Frequency', key: '2' },
    { id: 'discrete', label: 'Taps', key: '3' },
  ]
  const playing = playhead !== null

  return (
    <div
      className="shell"
      onDragEnter={(e) => { if (e.dataTransfer.types.includes('Files')) setDragging(true) }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => { if (!e.relatedTarget) setDragging(false) }}
      onDrop={(e) => { e.preventDefault(); setDragging(false); [...e.dataTransfer.files].forEach(importFile) }}
    >
      <header className="topbar">
        <div className="brand">
          <span className="mark"><Bolt /></span>
          Haptics Studio
        </div>
        <span className={phones ? 'status on' : 'status'}>
          <i className="dot" key={phones ? 'on' : 'off'} />
          {phones ? `${phones} phone${phones > 1 ? 's' : ''} connected` : 'No phone'}
        </span>
        <div className="seg theme" role="radiogroup" aria-label="Theme">
          {([['light', Sun, 'Light'], ['system', Monitor, 'System'], ['dark', Moon, 'Dark']] as const).map(([id, Icon, label]) => (
            <button key={id} role="radio" aria-checked={theme === id} className={theme === id ? 'on' : ''} title={label} onClick={() => setTheme(id)}>
              <Icon />
            </button>
          ))}
        </div>
      </header>

      <div className="app">
        <aside className="col left">
          <div className="seg tabs">
            <button className={tab === 'project' ? 'on' : ''} onClick={() => setTab('project')}>Project <span className="count">{project.presets.length}</span></button>
            <button className={tab === 'library' ? 'on' : ''} onClick={() => setTab('library')}>Pulsar library</button>
          </div>

          {tab === 'library' ? (
            <Library onPreview={play} onAdd={(p, name) => { addPreset(p, name); setTab('project') }} />
          ) : (
            <>
              <div className="row">
                <button className="grow" onClick={() => addPreset()}><Plus /> New</button>
                <button className="grow" onClick={() => addPreset(structuredClone(pattern), preset.name + ' copy')}><Copy /> Duplicate</button>
              </div>
              <ul className="list">
                {project.presets.map((p) => {
                  const triggers = Object.entries(project.map).filter(([, id]) => id === p.id).map(([t]) => t)
                  return (
                    <li key={p.id} className={p.id === preset.id ? 'active' : ''} onClick={() => { setCurrentId(p.id); setSelected(null) }}>
                      <Spark pattern={p.pattern} />
                      <span className="grow">
                        {p.name}
                        {triggers.length > 0 && <small>▸ {triggers.join(', ')}</small>}
                      </span>
                      {project.presets.length > 1 && (
                        <button className="icon reveal" title="Delete" onClick={(e) => { e.stopPropagation(); removePreset(p.id) }}><X /></button>
                      )}
                    </li>
                  )
                })}
              </ul>
            </>
          )}

          <footer className="files">
            <label className="button">
              <Upload /> Import
              <input type="file" accept=".json,.riv" hidden onChange={(e) => { if (e.target.files?.[0]) importFile(e.target.files[0]); e.target.value = '' }} />
            </label>
            <button onClick={() => download(slug(preset.name) + '.json', toDevice(pattern))} title="This pattern, in Pulsar's device format"><Download /> Pattern</button>
            <button
              onClick={() => download('haptics-project.json', { ...project, riv: riv && { name: riv.name, stateMachine, data: toBase64(riv.buffer) } })}
              title="Everything: patterns, trigger mappings and the Rive file"
            >
              <Download /> Project
            </button>
          </footer>
        </aside>

        <main className="col main">
          <div className="toolbar">
            <input className="name" value={preset.name} aria-label="Pattern name" onChange={(e) => rename(e.target.value)} />
            <span className="spacer" />
            <label className="chip"><input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} /> Sound</label>
            <label className={phones ? 'chip' : 'chip disabled'} title={phones ? '' : 'No phone connected'}>
              <input type="checkbox" checked={onPhone} disabled={!phones} onChange={(e) => setOnPhone(e.target.checked)} /> Phone
            </label>
            <button className="primary play" onClick={() => (playing ? stop() : play(pattern))}>
              {playing ? <Stop /> : <Play />} {playing ? 'Stop' : 'Play'} <kbd>Space</kbd>
            </button>
          </div>

          <div className="chart-card">
            <div className="chart-head">
              <div className="seg layers">
                {LAYERS.map((l) => (
                  <button key={l.id} className={l.id === layer ? 'on' : ''} onClick={() => setLayer(l.id)} style={{ '--c': COLORS[l.id] } as CSSProperties}>
                    <i /> {l.label} <kbd>{l.key}</kbd>
                  </button>
                ))}
              </div>
              <span className="muted small">Double-click to add · drag to move · ⌫ delete · ⌘Z undo</span>
            </div>
            <Chart
              pattern={pattern}
              layer={layer}
              viewMs={viewMs}
              selected={selected}
              playhead={playhead}
              onSelect={setSelected}
              onBegin={begin}
              onChange={setPattern}
            />
            <div className="inspector">
              {sel ? (
                <>
                  <strong style={{ '--c': COLORS[selected!.layer] } as CSSProperties}>
                    <i /> {selected!.layer === 'discrete' ? 'Tap' : selected!.layer === 'amplitude' ? 'Intensity point' : 'Frequency point'}
                  </strong>
                  <label>Time <input type="number" min={0} value={Math.round(sel.time)} onFocus={begin} onChange={(e) => editSel('time', +e.target.value)} /> <span className="unit">ms</span></label>
                  {'value' in sel ? (
                    <label>Value <input type="number" min={0} max={100} value={Math.round(sel.value * 100)} onFocus={begin} onChange={(e) => editSel('value', +e.target.value)} /> <span className="unit">%</span></label>
                  ) : (
                    <>
                      <label>Intensity <input type="number" min={0} max={100} value={Math.round(sel.amplitude * 100)} onFocus={begin} onChange={(e) => editSel('amplitude', +e.target.value)} /> <span className="unit">%</span></label>
                      <label>Frequency <input type="number" min={0} max={100} value={Math.round(sel.frequency * 100)} onFocus={begin} onChange={(e) => editSel('frequency', +e.target.value)} /> <span className="unit">%</span></label>
                    </>
                  )}
                </>
              ) : (
                <dl className="stats">
                  <div><dt>Intensity</dt><dd>{pattern.continuousPattern.amplitude.length}</dd></div>
                  <div><dt>Frequency</dt><dd>{pattern.continuousPattern.frequency.length}</dd></div>
                  <div><dt>Taps</dt><dd>{pattern.discretePattern.length}</dd></div>
                  <div><dt>Length</dt><dd>{patternEnd(pattern)} ms</dd></div>
                </dl>
              )}
            </div>
          </div>
        </main>

        <aside className="col right">
          <section className="card">
            <header className="card-head">
              <h3>Rive</h3>
              {riv && <small className="muted" title={riv.name}>{riv.name}</small>}
            </header>
            <div className={riv ? 'stage' : 'stage empty'}>
              <canvas ref={canvas} className="rive" />
              {!riv && (
                <label className="dropzone">
                  <strong>Drop a .riv file</strong>
                  <span>Its view-model triggers become haptic slots</span>
                  <span className="button">Choose file</span>
                  <input type="file" accept=".riv" hidden onChange={(e) => { if (e.target.files?.[0]) importFile(e.target.files[0]); e.target.value = '' }} />
                </label>
              )}
            </div>
            {riv && (
              <div className="transport">
                <button
                  className="primary grow"
                  title="Restart the animation here and on the phone; mapped triggers play their haptics"
                  onClick={() => { restart(); send({ type: 'restart' }); addLog('Restarted animation') }}
                >
                  <Play /> Play with haptics
                </button>
                <button onClick={() => { setPause(!paused); send({ type: 'pause', paused: !paused }) }}>
                  {paused ? <><Play /> Resume</> : <><Stop /> Pause</>}
                </button>
              </div>
            )}
            {info.stateMachines.length > 1 && (
              <select value={stateMachine} aria-label="State machine" onChange={(e) => setStateMachine(e.target.value)}>
                {info.stateMachines.map((s) => <option key={s}>{s}</option>)}
              </select>
            )}
            {riv && !info.triggers.length && (
              <p className="hint">No trigger properties found. In Rive, add a <b>Trigger</b> to the artboard’s view model and fire it from the state machine.</p>
            )}
            {info.triggers.length > 0 && (
              <div className="triggers">
                {info.triggers.map((t) => (
                  <div key={t} className="trigger" ref={(el) => { triggerRows.current[t] = el }} onAnimationEnd={(e) => e.currentTarget.classList.remove('fired')}>
                    <span className="tname" title={t}>{t}</span>
                    <select
                      value={project.map[t] ?? ''}
                      aria-label={`Pattern for ${t}`}
                      onChange={(e) => {
                        begin()
                        const v = e.target.value
                        setProject((pr) => {
                          const map = { ...pr.map }
                          if (v) map[t] = v
                          else delete map[t]
                          return { ...pr, map }
                        })
                      }}
                    >
                      <option value="">No haptic</option>
                      {project.presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <button className="icon" title="Fire here and on the phone" onClick={() => { fire(t); send({ type: 'fire', name: t }) }}><Bolt /></button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Device phones={phones} />

          <section className="card grow-card">
            <header className="card-head"><h3>Activity</h3></header>
            {log.length ? (
              <ul className="log">
                {log.map((l) => <li key={l.id}><time>{l.time}</time>{l.text}</li>)}
              </ul>
            ) : (
              <p className="hint">Triggers fired here or on the phone show up here.</p>
            )}
          </section>
        </aside>
      </div>

      <div className={dragging ? 'drop-overlay on' : 'drop-overlay'} aria-hidden>
        <div>Drop a <b>.riv</b>, a Pulsar pattern <b>.json</b>, or a project file</div>
      </div>
    </div>
  )
}
