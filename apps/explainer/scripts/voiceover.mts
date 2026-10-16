// Generate scene narration with macOS say, then record the duration of each clip.
import { execFileSync } from "node:child_process";
import { unlinkSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("../", import.meta.url)));

const VOICE = process.env.VOICE ?? "Samantha";
const RATE = process.env.RATE ?? "185"; // words per minute

const LINES = [
  "This is Buzzzz. Compose haptic patterns in the browser, preview them on your phone, and use them with Pulsar.",
  "The workspace follows the Pulsar blue palette. The layout adapts to narrow screens, with light, system, and dark themes. Use keyboard controls or edit point values directly.",
  "Buzzzz is a Bun monorepo. Studio is the web editor and local relay. Preview is the Expo phone app. Explainer makes this video. A shared core validates patterns, project files, and relay messages.",
  "A pattern has three layers over time. Intensity, frequency, and individual taps. Draw a pattern, or start from two hundred and six Pulsar presets. Export uses the Pulsar device format.",
  "Import a Rive file with view-model trigger properties. Buzzzz discovers those triggers. Map each one to a pattern in your project.",
  "Press play with haptics. The local relay forwards a restart message to paired phones. Each phone replays the Rive animation. When a trigger fires, Pulsar plays its mapped pattern. The phone reports the trigger back to Studio.",
  "First install the preview development build on your phone. Join the same Wi-Fi as your Mac, then scan the code in Studio, or paste the relay URL. The app receives the Rive file and trigger mappings.",
  "Export one pattern as Pulsar JSON, or save the whole project with its patterns, mappings, and Rive file. In your app, connect the Rive trigger to Pulsar playback. Check the final haptics on a physical phone.",
  "At the repository root, run bun run dev. That starts Studio, the relay, and Metro. Open Studio, connect your preview build, and make it feel right.",
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
