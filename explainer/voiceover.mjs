// Generates scene narration with macOS `say`, then writes src/vo.json (seconds per scene).
// Better voice: System Settings → Accessibility → Spoken Content → Manage Voices → e.g. "Zoe (Premium)",
// then VOICE="Zoe (Premium)" node voiceover.mjs && npm run render
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const VOICE = process.env.VOICE ?? 'Samantha'
const RATE = process.env.RATE ?? '185' // words per minute

export const LINES = [
  'This is Rive Haptics Studio. Design haptics in the browser, feel them on your phone, and ship them with Pulsar.',
  'It has three pieces. The Studio, a web app where you design. The relay, a small server on your Mac. And the preview app on your iPhone, which plays the real haptics. Everything stays on your Wi-Fi.',
  'A haptic pattern is three layers over time: intensity, frequency, and individual taps. Draw one from scratch, or start from two hundred Pulsar presets. It is saved in Pulsar’s own format, so the SDK plays it as is.',
  'In Rive, you add trigger properties to the view model, and fire them from the state machine. Each trigger becomes a haptic slot, and you pick the pattern it plays.',
  'Press play with haptics. The relay tells every paired phone to restart. The phone replays the animation, and when a trigger fires, Pulsar plays the mapped pattern. The phone reports back, and the studio lights up the trigger that fired.',
  'To pair, scan the QR code with your iPhone camera. It opens the preview app, connects to your Mac, and downloads the animation and its mappings.',
  'When it feels right, export. In your app, listen to the same trigger and play the same pattern. What you felt in review is exactly what ships.',
  'Start everything with one command. N P M, run dev.',
]

const durations = LINES.map((text, i) => {
  const aiff = `public/vo/s${i}.aiff`
  const wav = `public/vo/s${i}.wav`
  execFileSync('say', ['-v', VOICE, '-r', RATE, '-o', aiff, text])
  execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16@44100', aiff, wav])
  execFileSync('rm', [aiff])
  const info = execFileSync('afinfo', [wav]).toString()
  return Number(info.match(/estimated duration: ([\d.]+)/)[1])
})
writeFileSync('src/vo.json', JSON.stringify(durations))
console.log(VOICE, durations.map((d) => d.toFixed(1) + 's').join(' · '))
