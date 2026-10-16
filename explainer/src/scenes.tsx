import { interpolate, useCurrentFrame } from 'remotion'
import { Appear, C, Card, Code, FONT, Line, MONO, Packet, Pill, Scene, useIn } from './kit'

/* 1 ─ Title */
export function Title() {
  const frame = useCurrentFrame()
  const pulse = (d: number) => 1 + 0.5 * Math.max(0, Math.sin(((frame - d) / 30) * Math.PI)) * (frame > d ? 1 : 0)
  return (
    <Scene kicker="" title="">
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
        <Appear>
          <div style={{ width: 120, height: 120, borderRadius: 32, background: C.accent, display: 'grid', placeItems: 'center', transform: `scale(${0.95 + 0.05 * pulse(20)})` }}>
            <svg width="62" height="62" viewBox="0 0 16 16"><path d="M9.2 1.5 3.5 9h3.8l-.9 5.5L12.5 7H8.6l.6-5.5Z" fill="#fff" /></svg>
          </div>
        </Appear>
        <Appear delay={8}>
          <div style={{ fontSize: 96, fontWeight: 750, letterSpacing: -2.5 }}>Rive Haptics Studio</div>
        </Appear>
        <Appear delay={16}>
          <div style={{ fontSize: 36, color: C.fg2 }}>Design haptics in the browser. Feel them on your phone. Ship them with Pulsar.</div>
        </Appear>
      </div>
    </Scene>
  )
}

/* 2 ─ The three pieces */
const Node = ({ x, title, sub, items, delay, color }: { x: number; title: string; sub: string; items: string[]; delay: number; color: string }) => (
  <Appear delay={delay}>
    <Card x={x} y={300} w={480}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 16, height: 16, borderRadius: 8, background: color }} />
        <div style={{ fontSize: 36, fontWeight: 700 }}>{title}</div>
      </div>
      <div style={{ fontSize: 24, color: C.muted, marginTop: 6 }}>{sub}</div>
      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((it) => (
          <div key={it} style={{ fontSize: 24, color: C.fg2, display: 'flex', gap: 12 }}>
            <span style={{ color }}>●</span>
            {it}
          </div>
        ))}
      </div>
    </Card>
  </Appear>
)

export function Pieces() {
  return (
    <Scene kicker="The product" title="Three pieces, one Wi-Fi">
      <Line x1={600} y1={420} x2={720} y2={420} delay={30} />
      <Line x1={1200} y1={420} x2={1320} y2={420} delay={40} />
      <Node x={120} delay={6} color={C.accent} title="Studio" sub="Web app · React + Vite" items={['Pattern editor', 'Pulsar preset library', 'Rive player + trigger mapping', 'Export Pulsar JSON']} />
      <Node x={720} delay={18} color={C.freq} title="Relay" sub="The Studio's dev server on your Mac" items={['WebSocket hub at /relay', 'Hosts .riv files at /riv', 'LAN address for the QR', 'Started by npm run dev']} />
      <Node x={1320} delay={30} color={C.ok} title="Preview app" sub="iPhone · Expo debug build" items={['Pulsar SDK plays haptics', 'Rive runtime plays the .riv', 'Listens to view-model triggers', 'Code from Metro on :8082']} />
      <Appear delay={60} style={{ position: 'absolute', left: 120, top: 900 }}>
        <div style={{ fontSize: 28, color: C.fg2 }}>Everything runs locally. The browser and the phone talk through your Mac — no cloud, no account.</div>
      </Appear>
    </Scene>
  )
}

/* 3 ─ What a pattern is */
const W = 980
const H = 420
const amp = [[0, 0.85], [90, 0.95], [260, 0.35], [520, 0.6], [760, 0.1], [1000, 0]]
const freq = [[0, 0.3], [400, 0.7], [1000, 0.2]]
const taps = [[0, 1], [260, 0.7], [520, 0.85]]
const px = (t: number) => (t / 1000) * W
const py = (v: number) => H - v * H
const path = (pts: number[][]) => pts.map(([t, v], i) => `${i ? 'L' : 'M'}${px(t)},${py(v)}`).join(' ')

export function PatternScene() {
  const frame = useCurrentFrame()
  const draw = (start: number) => interpolate(frame, [start, start + 50], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const tapIn = (i: number) => interpolate(frame, [80 + i * 10, 96 + i * 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const json = `{
  "discretePattern": [
    { "time": 0,
      "amplitude": 1,
      "frequency": 0.6 }, …
  ],
  "continuousPattern": {
    "amplitude": [
      { "time": 0, "value": 0.85 }, …
    ],
    "frequency": [
      { "time": 0, "value": 0.3 }, …
    ]
  }
}`
  const chars = Math.floor(interpolate(frame, [110, 190], [0, json.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }))
  return (
    <Scene kicker="1 · Design" title="A pattern is three layers over time">
      <Card x={120} y={270} w={1060} h={600}>
        <div style={{ display: 'flex', gap: 14, marginBottom: 24 }}>
          <Pill color={C.amp}>Intensity</Pill>
          <Pill color={C.freq}>Frequency</Pill>
          <Pill color={C.tap}>Taps</Pill>
        </div>
        <svg width={W} height={H} style={{ overflow: 'visible' }}>
          {[0, 0.5, 1].map((v) => <line key={v} x1={0} x2={W} y1={py(v)} y2={py(v)} stroke={C.line} strokeWidth={2} />)}
          <path d={`${path(amp)} L${W},${H} L0,${H} Z`} fill={C.amp} fillOpacity={0.1 * (1 - draw(10))} />
          <path d={path(amp)} fill="none" stroke={C.amp} strokeWidth={5} pathLength={1} strokeDasharray={1} strokeDashoffset={draw(10)} strokeLinejoin="round" />
          <path d={path(freq)} fill="none" stroke={C.freq} strokeWidth={4} pathLength={1} strokeDasharray={1} strokeDashoffset={draw(40)} />
          {taps.map(([t, v], i) => (
            <g key={t} opacity={tapIn(i)}>
              <line x1={px(t)} x2={px(t)} y1={H} y2={py(v * tapIn(i))} stroke={C.tap} strokeWidth={7} strokeLinecap="round" />
              <circle cx={px(t)} cy={py(v * tapIn(i))} r={10} fill={C.tap} stroke="#fff" strokeWidth={3} />
            </g>
          ))}
        </svg>
      </Card>
      <Appear delay={100}>
        <Card x={1230} y={270} w={570} h={600} style={{ background: '#16161a', borderColor: '#16161a' }}>
          <div style={{ fontSize: 20, color: '#8d8c93', marginBottom: 16, fontFamily: FONT }}>Pulsar device format — what the SDK plays</div>
          <Code style={{ color: '#e6e6ea', fontSize: 19 }}>{json.slice(0, chars)}</Code>
        </Card>
      </Appear>
      <Appear delay={150} style={{ position: 'absolute', left: 120, top: 920 }}>
        <div style={{ fontSize: 26, color: C.fg2 }}>Start from scratch or from 206 Pulsar presets in the library. Values 0–1, time in ms.</div>
      </Appear>
    </Scene>
  )
}

/* 4 ─ Rive triggers → patterns */
const TRIG = [
  { name: 'impact', pattern: 'Thud', color: C.amp },
  { name: 'snap', pattern: 'Tick', color: C.tap },
  { name: 'success', pattern: 'Celebrate', color: C.ok },
]
export function TriggerScene() {
  return (
    <Scene kicker="2 · Map" title="Rive triggers become haptic slots">
      <Appear delay={6}>
        <Card x={120} y={330} w={420} h={420}>
          <div style={{ fontSize: 22, color: C.muted }}>card.riv</div>
          <div style={{ fontSize: 34, fontWeight: 700, marginTop: 6 }}>State machine</div>
          <div style={{ marginTop: 30, fontSize: 24, color: C.fg2, lineHeight: 1.5 }}>
            In the Rive editor, add <b>Trigger</b> properties to the view model and fire them from the timeline or listeners.
          </div>
        </Card>
      </Appear>
      <Line x1={540} y1={540} x2={660} y2={540} delay={20} />
      <Appear delay={24}>
        <Card x={660} y={330} w={420} h={420}>
          <div style={{ fontSize: 22, color: C.muted }}>View model</div>
          <div style={{ fontSize: 34, fontWeight: 700, marginTop: 6 }}>Triggers</div>
          <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {TRIG.map((t, i) => (
              <Appear key={t.name} delay={34 + i * 8}>
                <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 600, padding: '10px 16px', background: C.sunken, borderRadius: 12 }}>{t.name}</div>
              </Appear>
            ))}
          </div>
        </Card>
      </Appear>
      {TRIG.map((t, i) => (
        <Line key={t.name} x1={1080} y1={470 + i * 78} x2={1300} y2={430 + i * 130} delay={70 + i * 12} dashed />
      ))}
      {TRIG.map((t, i) => (
        <Appear key={t.name} delay={78 + i * 12} style={{ position: 'absolute', left: 1300, top: 390 + i * 130 }}>
          <Card x={0} y={0} w={480} style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 18 }}>
            <svg width="90" height="40"><path d="M0,40 L0,8 L20,4 L40,26 L70,32 L90,40 Z" fill={t.color} fillOpacity={0.18} stroke={t.color} strokeWidth={2.5} /></svg>
            <div style={{ fontSize: 30, fontWeight: 650 }}>{t.pattern}</div>
          </Card>
        </Appear>
      ))}
      <Appear delay={120} style={{ position: 'absolute', left: 120, top: 860 }}>
        <div style={{ fontSize: 26, color: C.fg2, maxWidth: 1600 }}>
          Why triggers, not Rive Events? Rive deprecated Events in its web and React Native runtimes — data-binding triggers are the supported path.
        </div>
      </Appear>
    </Scene>
  )
}

/* 5 ─ The live loop */
const SX = 330, RX = 960, PX = 1590, NY = 470
// Paced to the narration: all beats scaled by K.
const K = 1.45
const STEPS = [
  { at: 0, text: 'Press “Play with haptics” in the Studio' },
  { at: 40 * K, text: 'Relay forwards restart to every paired phone' },
  { at: 90 * K, text: 'Phone replays the Rive animation from frame 0' },
  { at: 150 * K, text: 'Trigger fires → Pulsar plays the mapped pattern' },
  { at: 210 * K, text: 'Phone reports “fired” → Studio row lights up' },
]
export function LiveLoop() {
  const frame = useCurrentFrame() / K
  const ballY = frame < 90 ? 0 : Math.abs(Math.sin(((frame - 90) / 60) * Math.PI)) * -110
  const hit = frame >= 150 && frame < 175
  const shake = hit ? Math.sin(frame * 2.2) * 7 : 0
  const ring = interpolate(frame, [150, 185], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const studioFlash = interpolate(frame, [250, 262, 300], [0, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const pressed = frame >= 6 && frame < 14
  return (
    <Scene kicker="3 · Feel" title="One press, end to end">
      {/* Studio */}
      <Card x={SX - 210} y={NY - 140} w={420} h={280}>
        <div style={{ fontSize: 30, fontWeight: 700 }}>Studio</div>
        <div style={{ marginTop: 22, display: 'inline-flex', padding: '14px 24px', borderRadius: 14, background: C.accent, color: '#fff', fontSize: 24, fontWeight: 700, transform: `scale(${pressed ? 0.96 : 1})` }}>▶ Play with haptics</div>
        <div style={{ marginTop: 18, fontFamily: MONO, fontSize: 22, padding: '8px 12px', borderRadius: 10, background: `rgba(79,70,229,${0.2 * studioFlash})` }}>impact → Thud</div>
      </Card>
      {/* Relay */}
      <Card x={RX - 170} y={NY - 90} w={340} h={180} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ fontSize: 30, fontWeight: 700 }}>Relay</div>
        <div style={{ fontFamily: MONO, fontSize: 20, color: C.muted, marginTop: 6 }}>ws://192.168.0.12:5173</div>
      </Card>
      {/* Phone */}
      <div style={{ position: 'absolute', left: PX - 150, top: NY - 270, width: 300, height: 560, borderRadius: 52, background: '#16161a', padding: 14, boxSizing: 'border-box', transform: `translateX(${shake}px)` }}>
        <div style={{ width: '100%', height: '100%', borderRadius: 40, background: C.panel, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 120, height: 3, background: C.line }} />
          <div style={{ position: 'absolute', left: 110, bottom: 123, width: 52, height: 52, borderRadius: 26, background: C.accent, transform: `translateY(${ballY}px)` }} />
          {hit && <div style={{ position: 'absolute', left: 136 - 60 * ring, bottom: 123 - 30 * ring, width: 120 * ring, height: 60 * ring, borderRadius: '50%', border: `3px solid ${C.tap}`, opacity: 1 - ring }} />}
          <div style={{ position: 'absolute', bottom: 34, left: 0, right: 0, textAlign: 'center', fontSize: 20, fontWeight: 600, color: C.fg2 }}>{frame >= 150 ? '▸ impact' : 'Preview app'}</div>
        </div>
      </div>
      <Line x1={SX + 210} y1={NY} x2={RX - 170} y2={NY} />
      <Line x1={RX + 170} y1={NY} x2={PX - 150} y2={NY} />
      <Packet x1={SX + 210} y1={NY} x2={RX - 170} y2={NY} from={14 * K} to={40 * K} label="restart" />
      <Packet x1={RX + 170} y1={NY} x2={PX - 150} y2={NY} from={44 * K} to={80 * K} label="restart" />
      <Packet x1={PX - 150} y1={NY} x2={RX + 170} y2={NY} from={190 * K} to={220 * K} color={C.ok} label="fired: impact" />
      <Packet x1={RX - 170} y1={NY} x2={SX + 210} y2={NY} from={222 * K} to={250 * K} color={C.ok} label="fired: impact" />
      {/* Step list */}
      <div style={{ position: 'absolute', left: 120, top: 800, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 18, width: 1680 }}>
        {STEPS.map((s, i) => {
          const on = frame * K >= s.at
          const current = on && (i === STEPS.length - 1 || frame * K < STEPS[i + 1].at)
          return (
            <div key={i} style={{ padding: 18, borderRadius: 16, background: current ? C.panel : 'transparent', border: `1.5px solid ${current ? C.accent : C.line}`, opacity: on ? 1 : 0.35 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: current ? C.accent : C.muted }}>STEP {i + 1}</div>
              <div style={{ fontSize: 22, color: C.fg2, marginTop: 6, lineHeight: 1.35 }}>{s.text}</div>
            </div>
          )
        })}
      </div>
    </Scene>
  )
}

/* 6 ─ Pairing */
function FakeQr({ size }: { size: number }) {
  const n = 21
  const cell = size / n
  const on = (x: number, y: number) => {
    const finder = (fx: number, fy: number) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7 && (x === fx || x === fx + 6 || y === fy || y === fy + 6 || (x > fx + 1 && x < fx + 5 && y > fy + 1 && y < fy + 5))
    if (finder(0, 0) || finder(14, 0) || finder(0, 14)) return true
    if ((x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12)) return false
    return ((x * 7 + y * 13 + x * y) % 5) < 2
  }
  return (
    <svg width={size} height={size} style={{ background: '#fff', borderRadius: 12 }}>
      {Array.from({ length: n * n }, (_, i) => [i % n, Math.floor(i / n)]).filter(([x, y]) => on(x, y)).map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell + 0.5} height={cell + 0.5} fill="#1a1a1c" />
      ))}
    </svg>
  )
}

export function Pairing() {
  return (
    <Scene kicker="Pairing" title="Scan once, stay connected">
      <Appear delay={6}>
        <Card x={120} y={300} w={420} h={480} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <FakeQr size={300} />
          <div style={{ fontSize: 24, color: C.fg2, textAlign: 'center' }}>Studio’s Phone card</div>
        </Card>
      </Appear>
      <Line x1={540} y1={540} x2={640} y2={540} delay={30} />
      <Appear delay={36}>
        <Card x={640} y={410} w={640} style={{ padding: 24 }}>
          <div style={{ fontSize: 22, color: C.muted }}>iPhone Camera opens the deep link</div>
          <Code style={{ marginTop: 10, fontSize: 21, color: C.accent }}>{'rivehaptics://connect?url=\n  ws://192.168.0.12:5173/relay'}</Code>
        </Card>
      </Appear>
      <Line x1={1280} y1={540} x2={1380} y2={540} delay={60} />
      <Appear delay={66}>
        <Card x={1380} y={300} w={420} h={480}>
          <div style={{ fontSize: 30, fontWeight: 700 }}>Preview app</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 24, fontSize: 23, color: C.fg2 }}>
            <div><Pill color={C.ok}>● Live</Pill></div>
            <div>Says <span style={{ fontFamily: MONO }}>hello</span> → Studio sends the .riv + trigger map</div>
            <div>Downloads <span style={{ fontFamily: MONO }}>/riv/&lt;hash&gt;.riv</span> over HTTP</div>
            <div>Reconnects by itself if Wi-Fi blips</div>
          </div>
        </Card>
      </Appear>
      <Appear delay={100} style={{ position: 'absolute', left: 120, top: 860 }}>
        <div style={{ fontSize: 26, color: C.fg2 }}>Pair as many phones as you like — every message goes to all of them.</div>
      </Appear>
    </Scene>
  )
}

/* 7 ─ Ship it */
export function Ship() {
  return (
    <Scene kicker="4 · Ship" title="Same triggers, same patterns, in your app">
      <Appear delay={6}>
        <Card x={120} y={300} w={640} h={500}>
          <div style={{ fontSize: 30, fontWeight: 700 }}>Export from the Studio</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22, marginTop: 30 }}>
            <div style={{ fontSize: 24, color: C.fg2 }}><b>Pattern</b> — one Pulsar JSON, drop-in for every Pulsar SDK</div>
            <div style={{ fontSize: 24, color: C.fg2 }}><b>Project</b> — all patterns, trigger map and the .riv in one file; re-import to pick up where you left off</div>
          </div>
        </Card>
      </Appear>
      <Line x1={760} y1={550} x2={860} y2={550} delay={30} />
      <Appear delay={36}>
        <Card x={860} y={300} w={940} h={500} style={{ background: '#16161a', borderColor: '#16161a' }}>
          <div style={{ fontSize: 20, color: '#8d8c93', fontFamily: FONT, marginBottom: 18 }}>Your React Native app</div>
          <Code style={{ color: '#e6e6ea', fontSize: 21 }}>
            {`import thud from './haptics/thud.json'

const haptic = usePatternComposer(thud)
const { instance } = useViewModelInstance(file, { async: true })

useRiveTrigger('impact', instance, {
  onTrigger: () => haptic.play(),
})`}
          </Code>
        </Card>
      </Appear>
      <Appear delay={80} style={{ position: 'absolute', left: 120, top: 860 }}>
        <div style={{ fontSize: 26, color: C.fg2 }}>The preview app runs exactly this code path — what you feel in review is what ships.</div>
      </Appear>
    </Scene>
  )
}

/* 8 ─ Outro */
export function Outro() {
  const p = useIn(10)
  return (
    <Scene kicker="" title="">
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 36 }}>
        <Appear><div style={{ fontSize: 40, color: C.fg2 }}>Start everything with one command</div></Appear>
        <div style={{ opacity: p, transform: `scale(${0.96 + 0.04 * p})`, fontFamily: MONO, fontSize: 72, fontWeight: 700, padding: '28px 56px', borderRadius: 28, background: '#16161a', color: '#fff' }}>
          npm run dev
        </div>
        <Appear delay={24}>
          <div style={{ display: 'flex', gap: 20 }}>
            <Pill>Studio · localhost:5173</Pill>
            <Pill color={C.freq}>Metro · :8082</Pill>
            <Pill color={C.ok}>Phone · scan the QR</Pill>
          </div>
        </Appear>
      </div>
    </Scene>
  )
}
