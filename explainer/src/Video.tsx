import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion'
import { C } from './kit'
import vo from './vo.json'
import { LiveLoop, Outro, Pairing, PatternScene, Pieces, Ship, Title, TriggerScene } from './scenes'

export const SCENES = [
  { C: Title, d: 110 },
  { C: Pieces, d: 210 },
  { C: PatternScene, d: 230 },
  { C: TriggerScene, d: 230 },
  { C: LiveLoop, d: 320 },
  { C: Pairing, d: 200 },
  { C: Ship, d: 210 },
  { C: Outro, d: 110 },
]
const LEAD = 12 // frames before narration starts in each scene
// Each scene lasts at least as long as its narration plus a short breath.
const DUR = SCENES.map((s, i) => Math.max(s.d, LEAD + Math.ceil(vo[i] * 30) + 24))
export const TOTAL = DUR.reduce((n, d) => n + d, 0)

export function Explainer() {
  let at = 0
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {SCENES.map(({ C: S }, i) => {
        const d = DUR[i]
        const from = at
        at += d
        return (
          <Sequence key={i} from={from} durationInFrames={d}>
            <S />
            <Sequence from={LEAD}>
              <Audio src={staticFile(`vo/s${i}.wav`)} />
            </Sequence>
          </Sequence>
        )
      })}
    </AbsoluteFill>
  )
}
