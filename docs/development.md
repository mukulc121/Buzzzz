# Development

## Tools

Use Bun 1.4.0 and Node.js 22. The workspace uses Bun's hoisted linker and one root lockfile. Run `bun install` from the repository root; do not create app-level lockfiles.

Vite+ 1.3.0 runs the parallel development tasks, Studio's dev server/build, linting, and formatting. Its lint and format settings live in the root `vite.config.mts`. Bun remains the package manager and unit-test runner. Preset maintenance uses `packages/core/scripts/sync-presets.mts`.

iOS builds need macOS, Xcode, and CocoaPods. Android builds need the Android SDK, a compatible JDK, and a configured device or emulator.

## Commands

Run these from the root:

| Command                  | Result                                                   |
| ------------------------ | -------------------------------------------------------- |
| `bun run dev`            | Studio on 5173 and Metro on 8082                         |
| `bun run dev:studio`     | Studio and its relay only                                |
| `bun run dev:preview`    | Metro on 8082 only                                       |
| `bun run ios`            | Generate, build, and install the iOS preview app         |
| `bun run android`        | Generate, build, and install the Android preview app     |
| `bun run build`          | Static Studio build in `apps/studio/dist`                |
| `bun run check`          | Types, lint, format, unit and relay tests, build, Fallow |
| `bun run test:relay`     | Cloudflare Worker integration tests in Miniflare         |
| `bun run test:browser`   | Playwright Chromium tests                                |
| `bun run check:all`      | Quality and browser checks                               |
| `bun run analyze:health` | Advisory Fallow health and duplication report            |
| `bun run format`         | Format the workspace                                     |

Install Chromium once with `bunx playwright install chromium` before browser tests. Playwright starts Studio when needed. Its report and test artifacts are ignored.

For a focused run, use `bunx playwright test __tests__/browser/sound.spec.ts`. See [sound reference checks](verification.md#sound-reference-checks) for the full preset suite and optional saved Studio bundle comparison. Refresh the checked-in sound preview oracle from an existing Pulsar checkout with `bun run sync:sound-reference /path/to/pulsar`; review fixture changes before accepting new reference output.

The preview app uses Expo SDK 57 and React Native 0.86. Use `bunx expo install <package>` inside `apps/preview` for Expo-compatible dependency versions, then review the root lockfile. Run `bunx expo install --check` there to check compatibility.

## First iPhone build

1. Connect the iPhone by USB, trust the Mac, and enable Developer Mode in Settings.
2. Start `bun run dev`, then run `bun run ios` in another terminal to generate the native project.
3. Open the generated `.xcworkspace` under `apps/preview/ios`, select the app target, and set your signing team and personal bundle identifier in Signing & Capabilities.
4. Build and run on the phone from Xcode. Keep personal signing values in the ignored native project. Regenerating that project resets those local settings.
5. Allow Local Network access, then scan Studio's pairing QR or paste its relay URL into the app.

For a simulator UI check, choose an iOS simulator as the build target. It cannot prove haptic playback. Expo Go cannot run the preview app's native modules.

Rebuild after changing native dependencies, `app.json`, config plugins, or a native dependency patch. Normal JavaScript edits use Metro.

## Troubleshooting

| Symptom                                      | Check                                                                                                               |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Phone cannot pair                            | Same Wi-Fi, iOS Local Network permission, and the relay URL's LAN address. Guest Wi-Fi may block peer traffic.      |
| QR link does nothing                         | Install the native preview app first.                                                                               |
| Development server error                     | Confirm Metro is listening on 8082 and the phone can reach the computer.                                            |
| Port already in use                          | Inspect the process using 5173 or 8082. Stop it only if it belongs to this session.                                 |
| Rive file disappears                         | Restarting the relay clears uploads; the store also evicts older files. Reimport the file.                          |
| Static editor will not pair                  | Build with `VITE_RELAY_URL` pointing to your deployed Worker, or use the local Vite relay.                          |
| Native build fails after a dependency change | Regenerate the native project with Expo after reviewing local native changes. Generated directories are disposable. |

## Media analysis

Sound checks container metadata before decoding. Files are limited to 20 MiB, 60 seconds, eight channels, and a projected 96 MiB PCM budget at 48 kHz. Web Audio decodes at 44.1 kHz. Signal analysis reads the trimmed mono mix; generation runs in a worker on its 22.05 kHz mono clip. Decoding holds the source PCM in memory.

The Sound inspector has Track, Signal analysis, Generate, and Approaches sections. Open trimming tool changes the attached window without changing the original file. Analysis defaults to 20 ms frames and supports 2–100 ms. Enable any of these 12 metrics:

| Group              | Metrics                                                                                |
| ------------------ | -------------------------------------------------------------------------------------- |
| Intensity          | Vibrotactile loudness, envelope follower, band energy, roughness, fluctuation strength |
| Frequency          | Sharpness, spectral centroid                                                           |
| Discrete and tempo | Transient sharpness, onset novelty, tempo / beat                                       |
| Source character   | Percussive share, tonality                                                             |

Fit to clip scales each overlay to its own peak. True value uses the metric's full scale where defined. The dB curve applies to raw level metrics over a 60 dB range. Analysis display settings persist in this browser.

The nine approaches are Multiband split, Transient taps, Percussive / harmonic split, Impact follower, RMS envelope, Filter-chain transcode, Perceptual loudness, Beat grid, and Melodic transcode. Attaching or trimming audio and changing generation settings reruns them. Contrast, gamma, silence floor, transient ducking, envelope resolution, and each approach's parameters control the result. Choosing an approach applies it to the pattern; switching after manual edits asks whether to preserve those edits. Restore my pattern returns the pattern saved before generation.

Lottie JSON and dotLottie archives use the canvas renderer. The five generation approaches are hybrid, energy, kinematic, impulse, and channel. Analysis defaults to 240 samples per second and 12 ms smoothing. It evaluates transforms, keyframes, parent transforms, and selected channels. Physics is a motion-based estimate without actual mass or collision geometry. Path morphs use initial bounds; masks and effects are excluded, 3D projects into 2D, and time remapping is not analyzed. Expressions are rejected. Multi-animation archives allow selecting a clip; dotLottie themes and state machines are not applied.

Sound metrics and generators follow the inspected Pulsar Studio source and have reference comparisons. Loudness and psychoacoustic values, melodic pitch on polyphonic material, and motion physics remain estimates. Review candidates by eye and on the target phone. Reference agreement on tested inputs does not establish identical output on every browser or physical device.

## Projects and navigation

`/studio/projects` opens the full Projects page. Create, open, rename, import, search, sort, and delete projects there. `/studio/projects/:id` opens a saved local project; browser Back and Forward follow project navigation. A missing local ID shows the Projects page with a notice. Static hosts must serve Studio's `index.html` for `/studio/*` paths so direct links and reloads work.

Project records live in localStorage. IndexedDB stores original media blobs and their project or preset attachments, including trim windows. Settings and Learn completion also stay in this browser. Local project URLs do not transfer these records. Export/import a `.pulsar` archive for a portable copy, or use a configured hosted share link. Clearing site data removes local projects, media, and saved share revocation credentials.

A Web Lock limits each project to one writing tab. Other tabs can view it. Library's About dialog has its own Play/Stop audition; adding a library entry is a separate action. Settings changes the real editor grid, precision, pointer, playback cursor, selection, and theme. Learn provides four guided walkthroughs with 27 steps and saves completion locally.

## Project files

Imports inspect contents rather than trusting extensions: Rive magic, audio metadata, Lottie JSON, dotLottie ZIP, Pulsar JSON, AHAP, Lofelt, and portable `.pulsar` archives. Audio imports validate metadata first. Loading a track performs the bounded browser decode and reports unsupported codecs or corrupt audio. Ogg-wrapped FLAC is rejected. AHAP audio events and attack/decay/release behavior are not reproduced; overlapping continuous events become one envelope with explicit conversion warnings.

A portable export stores `manifest.json`, haptic JSON, and original media. Its public manifest uses `pulsar.bundle/1` and a canonical SHA-256 content hash. A `buzzzz` extension preserves original IDs, mappings, Rive, media windows, markers, play range, and editor duration. Referenced files pass format and metadata checks before the project is saved; audio codec errors can still surface when loading a track. Imports limit archives to 32 MiB compressed, 20 MiB per member, 100 MiB expanded, 1,024 members, and 20 MiB of referenced haptic JSON. Official SDK interoperability still needs runtime verification.

## Hosted relay

Run `bun run --cwd apps/relay dev` for the local Cloudflare runtime on port 8787. Installation generates the Worker's runtime types for the editor; rerun `bun run --cwd apps/relay typegen` after changing its configuration. Build Studio with `VITE_RELAY_URL` set to the relay origin. Before deploying, create the private R2 bucket and configure the Worker hostname and exact `STUDIO_ORIGINS` allowlist. `bun run --cwd apps/relay build` is a deployment dry run. It does not deploy. See [relay setup and API](../apps/relay/README.md).

## MCP media commands

Media tools require an open hosted editor with the relevant attachment loaded. Headless project tools do not load local browser media. Call `tools/list` for the current schemas; generation uses `{approach, options, action}`, where `action` is `apply` or `add` and option values are finite numbers.

Audio approach IDs are `multiband-split`, `transient-taps`, `percussive-harmonic`, `impact-follower`, `rms-envelope`, `aosp-transcode`, `perceptual-loudness`, `beat-grid`, and `melodic-transcode`. `audio_analyze.metrics` accepts `vibrotactile`, `envelope`, `band`, `roughness`, `fluctuation`, `sharpness`, `centroid`, `transient`, `novelty`, `beat`, `hpss`, and `tonality`.

For example, `audio_generate` accepts:

```json
{
  "approach": "rms-envelope",
  "options": { "frameMs": 20, "releaseMs": 80, "gamma": 0.5 },
  "action": "add"
}
```

Animation approach IDs remain `hybrid`, `energy`, `kinematic`, `impulse`, and `channel`. Animation options use numeric controls such as `smoothingMs`, `contrast`, and the selected approach's gains or thresholds. Unknown options and out-of-range animation values fail validation. Update clients that used the earlier audio approach aliases or option types.

## Dependency patches

`react-native-pulsar@1.7.0` reparses a pattern without releasing its previous native composer. The workspace backports the React Native hook fix from [Pulsar PR #294](https://github.com/software-mansion/pulsar/pull/294), commit [`dc0a711a95806b91cf8d05771c6c601e0d5657a8`](https://github.com/software-mansion/pulsar/commit/dc0a711a95806b91cf8d05771c6c601e0d5657a8), through Bun's `patchedDependencies`.

`bun install` applies the checked-in React Native patch. Both native cores build unreleased Pulsar source at revision [`abdee706282598ab0194ba739dce835dc828f164`](https://github.com/software-mansion/pulsar/commit/abdee706282598ab0194ba739dce835dc828f164), pinned in [`source.json`](../apps/preview/native/pulsar/source.json). Native builds verify the downloaded archive against SHA-256 `5faa6afd096edbaaad19d263baa54091fb92aa5039a0cb57798e7570b42c76aa`.

The local podspec reports iOS `1.4.0` and the Gradle source project reports Android `1.3.0` to satisfy dependency constraints. Those version labels do not make these bundle/audio APIs published releases. The source revision and archive hash identify the code used for AudioSync.

Keep the backport until compatible upstream releases contain the required APIs and composer fix. Then upgrade, remove the native-source override and corresponding React Native patch changes, reinstall, rebuild both platforms, and verify physical playback and seeking.

See [third-party notices](../THIRD_PARTY_NOTICES.md) for Pulsar's license.

The local `@rive-app/react-native@0.5.5` patch resizes Android's Rive surface and waits for two presented frames after a resize, including paused fullscreen changes. It permits one outstanding draw and tracks resize generations so older callbacks cannot acknowledge a newer resize. Hidden views skip rendering. It also removes the hook's five-second readiness timeout so a hidden scene can become ready when opened, with stale results ignored after detaching. The surface fix targets the bundled Rive Android 11.12.1 runtime and uses its internal resize API. See the [React Native runtime source](https://github.com/rive-app/rive-react-native) and [Android runtime source](https://github.com/rive-app/rive-android). Remove the patch when an upgraded runtime passes paused fullscreen changes and delayed hidden-scene loading. Rebuild and verify scene and view-model identity after any runtime upgrade.

## Explainer

Use `bun run --filter @buzzzz/explainer studio` to edit the Remotion composition. The `voiceover` script uses macOS speech tools; `VOICE` and `RATE` control narration. `render` writes an ignored MP4 under `apps/explainer/out`. Run all three commands from the root.
