// Generate scene narration with macOS say, then record the duration of each clip.
import { execFileSync } from "node:child_process";
import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("../", import.meta.url)));

const VOICE = process.env.VOICE ?? "Samantha";
const RATE = process.env.RATE ?? "185"; // words per minute

const LINES = [
  "This is Buzzzz. Compose haptic patterns, generate them from sound or animation, and preview them on your phone with Pulsar.",
  "Projects opens your saved work. Each project has a local URL. Project records stay in this browser's local storage, with original media in Indexed D B. Sharing a local URL does not transfer them.",
  "The editor combines a navigation rail, library, central chart, timeline, and inspector. Switch between point editing, Sound, and Animation. Light and dark layouts adapt to smaller screens.",
  "Draw intensity, frequency, and taps. Select multiple points, snap edits, add markers, and set a play range. Undo changes. Patterns use milliseconds and normalized values, up to sixty seconds.",
  "Open a Library preset's About dialog, then press Play to audition it without changing your project. The plus button or a drag onto the chart appends the pattern.",
  "Sound has Track, Signal analysis, Generate, and Approaches sections. Inspect twelve metrics and compare nine generators. Trim attached audio, adjust settings, preserve manual edits when switching, or restore your original pattern.",
  "Load Lottie JSON or dot Lottie. Seek, change speed, and compare five motion or channel approaches. Physics values are motion estimates. Complex animation effects may differ.",
  "Tools include snippets, tap rhythm, microphone sketching, time warp, and compatibility checks. Settings controls the editor's appearance and interactions. Learn provides guided walkthroughs for editing, pairing, sound, and animation.",
  "Import a Rive file with view-model trigger properties. Buzzzz discovers those triggers. Map each one to a pattern in your project.",
  "Press play with haptics. The relay asks paired phones to restart Rive. When a view-model trigger fires, Pulsar plays its mapped pattern. The phone reports the trigger back to Studio.",
  "Preview is a native development build with Home, Presets, Playground, Demos, and Rive Preview. Search presets, save favorites, sketch touch patterns, and explore demos. Check final haptic feel on a physical phone.",
  "Pair locally on trusted Wi-Fi, or configure a Cloudflare relay. Hosted rooms use separate tokens and single-use pairing codes. They do not synchronize your local project catalog. Hosted deployment and remote phone playback need separate verification.",
  "Use a portable Pulsar archive to transfer patterns, original media, trim windows, mappings, markers, and Rive. A configured hosted share link is another explicit transfer. Local project URLs alone carry no project data.",
  "Four apps share a Bun workspace. Studio edits, Preview runs natively, Relay provides Cloudflare rooms, and Explainer makes this video. Core validates shared pattern, project, and relay contracts.",
  "Run bun run dev at the repository root. That starts Studio, the local relay, and Metro. Create a project, load your media, and make it feel right.",
];

mkdirSync("out/public/vo", { recursive: true });
const durations = LINES.map((text, i) => {
  const aiff = `out/public/vo/s${i}.aiff`;
  const wav = `out/public/vo/s${i}.wav`;
  execFileSync("say", ["-v", VOICE, "-r", RATE, "-o", aiff, text]);
  execFileSync("afconvert", ["-f", "WAVE", "-d", "LEI16@44100", aiff, wav]);
  unlinkSync(aiff);
  const info = execFileSync("afinfo", [wav]).toString();
  const match = info.match(/estimated duration: ([\d.]+)/);
  if (!match) throw new Error(`Could not read duration for ${wav}`);
  return Number(match[1]);
});
writeFileSync("src/data/vo.json", JSON.stringify(durations) + "\n");
console.log(VOICE, durations.map((d) => d.toFixed(1) + "s").join(" · "));
