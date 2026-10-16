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

The preview app uses Expo SDK 57 and React Native 0.86. Use `bunx expo install <package>` inside `apps/preview` for Expo-compatible dependency versions, then review the root lockfile. Run `bunx expo install --check` there to check compatibility.

## First iPhone build

1. Change `ios.bundleIdentifier` in `apps/preview/app.json`. Choose your signing team in Xcode, or add `ios.appleTeamId` to the config.
2. Connect the iPhone by USB, trust the Mac, and enable Developer Mode in Settings.
3. Start `bun run dev`, then run `bun run ios` in another terminal and select the phone.
4. If signing needs attention, open the generated `.xcworkspace` under `apps/preview/ios`, select the app target, and choose your team in Signing & Capabilities.
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

Sound checks container metadata before decoding. Files are limited to 20 MiB, 60 seconds, eight channels, and a projected 96 MiB PCM budget at 48 kHz. Web Audio decodes the selected track; a worker computes RMS, envelopes, FFT spectra, spectral onsets, tempo, percussive share, tonality, pitch, and psychoacoustic estimates. Analysis defaults to 20 ms frames, supports 2–100 ms, and downsamples to at most 24 kHz. Decoding holds the source PCM in memory.

The nine audio approaches are RMS, perceptual, impact, transients, beats, percussive, multiband, melodic, and filter chain. Contrast, gamma, silence floor, transient ducking, and envelope resolution change the generated result. Fit scales an overlay to its peak; True retains its normalized magnitude. The optional dB view uses a −60 dB display floor.

Lottie JSON and dotLottie archives use the canvas renderer. The five generation approaches are hybrid, energy, kinematic, impulse, and channel. Analysis defaults to 240 samples per second and 12 ms smoothing. It evaluates transforms, keyframes, parent transforms, and selected channels. Physics is a motion-based estimate without actual mass or collision geometry. Path morphs use initial bounds; masks and effects are excluded, 3D projects into 2D, and time remapping is not analyzed. Expressions are rejected. Multi-animation archives allow selecting a clip; dotLottie themes and state machines are not applied.

These are independent algorithms. Loudness and psychoacoustic values, pitch on polyphonic material, and motion physics are approximations. Review candidates by eye and on the target phone. Replacing a pattern can preserve a copy; Restore returns its original pattern.

## Project files

Imports inspect contents rather than trusting extensions: Rive magic, audio metadata, Lottie JSON, dotLottie ZIP, Pulsar JSON, AHAP, Lofelt, and portable `.pulsar` archives. Audio imports validate metadata first. Loading a track performs the bounded browser decode and reports unsupported codecs or corrupt audio. Ogg-wrapped FLAC is rejected. AHAP audio events and attack/decay/release behavior are not reproduced; overlapping continuous events become one envelope with explicit conversion warnings.

A portable export stores `manifest.json`, haptic JSON, and original media. Its public manifest uses `pulsar.bundle/1` and a canonical SHA-256 content hash. A `buzzzz` extension preserves original IDs, mappings, Rive, media windows, markers, play range, and editor duration. Referenced files pass format and metadata checks before the project is saved; audio codec errors can still surface when loading a track. Imports limit archives to 32 MiB compressed, 20 MiB per member, 100 MiB expanded, 1,024 members, and 20 MiB of referenced haptic JSON. Official SDK interoperability still needs runtime verification.

## Hosted relay

Run `bun run --cwd apps/relay dev` for the local Cloudflare runtime on port 8787. Installation generates the Worker's runtime types for the editor; rerun `bun run --cwd apps/relay typegen` after changing its configuration. Build Studio with `VITE_RELAY_URL` set to the relay origin. Before deploying, create the private R2 bucket and configure the Worker hostname and exact `STUDIO_ORIGINS` allowlist. `bun run --cwd apps/relay build` is a deployment dry run. It does not deploy. See [relay setup and API](../apps/relay/README.md).

## Dependency patches

`react-native-pulsar@1.7.0` reparses a pattern without releasing its previous native composer. The workspace backports the React Native hook fix from [Pulsar PR #294](https://github.com/software-mansion/pulsar/pull/294), commit [`dc0a711a95806b91cf8d05771c6c601e0d5657a8`](https://github.com/software-mansion/pulsar/commit/dc0a711a95806b91cf8d05771c6c601e0d5657a8), through Bun's `patchedDependencies`.

`bun install` applies the checked-in patch. Keep it until a released Pulsar version includes the fix, then remove the patch and its manifest entry together, reinstall, and verify repeated playback on a physical phone. The upstream commit also changes the separate native iOS SDK; the package backport covers the React Native hook used here.

See [third-party notices](../THIRD_PARTY_NOTICES.md) for Pulsar's license.

The local `@rive-app/react-native@0.5.5` patch resizes Android's Rive surface and waits for two presented frames after a resize, including paused fullscreen changes. It permits one outstanding draw and tracks resize generations so older callbacks cannot acknowledge a newer resize. Hidden views skip rendering. It also removes the hook's five-second readiness timeout so a hidden scene can become ready when opened, with stale results ignored after detaching. The surface fix targets the bundled Rive Android 11.12.1 runtime and uses its internal resize API. See the [React Native runtime source](https://github.com/rive-app/rive-react-native) and [Android runtime source](https://github.com/rive-app/rive-android). Remove the patch when an upgraded runtime passes paused fullscreen changes and delayed hidden-scene loading. Rebuild and verify scene and view-model identity after any runtime upgrade.

## Explainer

Use `bun run --filter @buzzzz/explainer studio` to edit the Remotion composition. The `voiceover` script uses macOS speech tools; `VOICE` and `RATE` control narration. `render` writes an ignored MP4 under `apps/explainer/out`. Run all three commands from the root.
