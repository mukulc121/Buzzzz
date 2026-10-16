// Generate scene narration with macOS say, then record the duration of each clip.
import { execFileSync } from "node:child_process";
import { unlinkSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("../", import.meta.url)));

const VOICE = process.env.VOICE ?? "Samantha";
const RATE = process.env.RATE ?? "185"; // words per minute

const LINES = [
  "This is Buzzzz. Compose haptic patterns, generate them from sound or animation, and preview them on your phone with Pulsar.",
  "The Studio has a navigation rail, pattern library, central composer, and an inspector for points, sound, and animation. Panels adapt to smaller screens. Light, system, and dark themes share the blue palette.",
  "Four apps share a Bun workspace. Studio edits, Preview plays on the phone, Relay provides Cloudflare rooms, and Explainer makes this video. Core validates shared contracts. Source folders separate application wiring, features, components, and tests.",
  "A pattern has intensity, frequency, and individual taps. Draw or select multiple points, snap edits, add markers, and choose a play range. Undo restores edits. Patterns use milliseconds and normalized values, up to sixty seconds.",
  "Import sound and analyze real decoded audio in a worker. Trim the source, inspect spectral and loudness overlays, and compare nine generation approaches. Adjust contrast, gamma, silence floor, transient ducking, and envelope resolution. Psychoacoustic measurements are estimates.",
  "Import Lottie JSON or a dot Lottie archive. Preview, seek, and change playback speed. Five approaches turn motion and selected channels into patterns. Sample rate, smoothing, and hybrid controls tune the result. Physics values are motion estimates; complex effects may differ.",
  "Tools include the preset library, snippets, tap rhythm, microphone voice sketch, time warp, audio trim, signal analysis, and compatibility checks. Apply a generated candidate, preserve an edited copy, or restore the original pattern.",
  "Import a Rive file with view-model trigger properties. Buzzzz discovers those triggers. Map each one to a pattern in your project.",
  "Press play with haptics. The relay forwards a restart message to paired phones. Each phone replays the Rive animation. When a trigger fires, Pulsar plays its mapped pattern. The phone reports the trigger back to Studio.",
  "For local pairing, install the Preview development build and join the same Wi-Fi. For hosting, configure the Cloudflare Worker, private R two bucket, and allowed Studio origins. Rooms use tokens and short-lived pairing codes. Verify the hosted service after deployment.",
  "Import Pulsar files, A H A P, Lofelt, Rive, audio, and Lottie. Export a portable Pulsar archive containing patterns, original media, mappings, trims, markers, and play ranges. All referenced files are validated. Check converted patterns and final haptics on your target phone.",
  "At the repository root, run bun run dev. That starts Studio, the local relay, and Metro. Open Studio, load your media, and make it feel right.",
];

const durations = LINES.map((text, i) => {
  const aiff = `public/vo/s${i}.aiff`;
  const wav = `public/vo/s${i}.wav`;
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
