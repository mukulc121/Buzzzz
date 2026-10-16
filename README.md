# Buzzzz

Compose haptics in your browser, generate patterns from audio or Lottie, map Rive triggers, and preview on your phone with Pulsar.

| Workspace        | Purpose                                               |
| ---------------- | ----------------------------------------------------- |
| `apps/studio`    | React + Vite+ editor and local development relay      |
| `apps/preview`   | Expo app with Rive and Pulsar native playback         |
| `apps/relay`     | Cloudflare rooms, assets, project sharing, and MCP    |
| `apps/explainer` | Remotion video and narration                          |
| `packages/core`  | Shared pattern format, validation, and relay messages |

## Get started

Use Bun 1.4.0 and Node.js 22. Expo's CLI needs Node even though Bun manages the workspace.

```bash
git clone https://github.com/mukulc121/Buzzzz.git
cd Buzzzz
bun install
bun run dev
```

Open [localhost:5173](http://localhost:5173). This starts Studio on port 5173 and Metro on port 8082. `Ctrl-C` stops both. For the editor alone, run `bun run dev:studio`.

Bun installs dependencies and runs unit tests. Vite+ runs development tasks, builds Studio, and handles linting and formatting.

The editor works without a phone. Patterns, editor state, and trigger mappings save locally; imported media stays in the browser's media library. Export a portable `.pulsar` archive to keep patterns, original media, trim windows, mappings, markers, and the Rive file together.

## Preview on a phone

The native app needs a development build. Expo Go does not include its native dependencies. For iOS, use macOS, Xcode, CocoaPods, and an Apple account. For Android, install the Android SDK and configure a device or emulator.

1. For your own iPhone, set `ios.bundleIdentifier` in `apps/preview/app.json` and choose your signing team in Xcode. Connect and trust the phone, then enable Developer Mode.
2. With `bun run dev` running, run `bun run ios` and select a target. Use `bun run android` for Android.
3. Keep the phone and computer on the same Wi-Fi. Allow Local Network access on iOS.
4. Scan Studio's pairing QR in Preview, or paste its relay address. Confirm the destination host before connecting. Plain WebSocket connections require a private or loopback IP address; remote relays require WSS.
5. Press Play in Studio. Use a physical phone to judge haptics. A simulator only verifies the app's UI and connection behavior.

Preview has Home, Presets, Playground, Demos, and Rive Preview tabs. Presets support search and saved favorites; Playground records and exports touch patterns. Rive can expand fullscreen while keeping the same scene and view model.

Native projects under `apps/preview/ios` and `apps/preview/android` are generated and ignored. Rebuild after native dependency or configuration changes. See [development](docs/development.md) for setup and troubleshooting.

## Make a pattern

1. Open Patterns to draw intensity, frequency, and taps, or start from the Pulsar library. Use multi-selection, snapping, markers, a play range, and undo.
2. Open Sound to import and trim audio, inspect analysis overlays, and compare nine generation approaches. Open Animation for Lottie or dotLottie playback and five motion/channel approaches.
3. Use Tools for snippets, tap rhythm, microphone voice sketch, time warp, audio trim, signal analysis, and compatibility checks.
4. Import a `.riv` with view-model Trigger properties. Map triggers to patterns, then interact in Studio or Preview.
5. Export a pattern as Pulsar JSON, a project as JSON, or a portable `.pulsar` archive. Imports also accept AHAP and Lofelt, with conversion warnings where needed.

Pattern time is in milliseconds; amplitude and frequency use values from 0 to 1. The shared model accepts patterns up to 60 seconds. The exported `discretePattern` and `continuousPattern` fields match Pulsar's device format.

Keyboard shortcuts outside form controls: Space plays or stops, `1`/`2`/`3` select a layer, Delete removes the selected point, and Cmd/Ctrl+Z undoes an edit.

Audio is decoded with Web Audio and analyzed in a cancellable worker. Loudness, roughness, fluctuation, sharpness, pitch, and motion-derived physics are estimates. The independently implemented generators do not establish identical output to Pulsar Studio. See [development](docs/development.md#media-analysis) for limits.

## Checks

```bash
bun run check          # types, lint, formatting, unit and relay tests, build, Fallow
bunx playwright install chromium
bun run test:browser   # responsive editor and accessibility checks
bun run check:all      # both
```

[GitHub Actions](.github/workflows/ci.yml) runs quality checks, Chromium tests, Expo compatibility checks, and iOS and Android JavaScript exports. It does not build or test a native app. Browser tests cover widths from 320 to 1920 pixels and scan light and dark themes with axe. See [verification](docs/verification.md) for the checks' limits.

## Relay limits

The Vite relay is for development on a trusted LAN. It has no authentication, pairing isolation, or persistent storage. Every connected Studio can control every connected phone. Cross-host browser requests are rejected; native clients can connect without an Origin header.

Rive uploads are limited to 20 MiB each. The relay keeps at most 10 files and 100 MiB in memory, then evicts older files. Restarting Studio clears them. Do not expose the development server to the internet.

`bun run build` produces a static editor. A static deployment needs a separate relay for phone preview. Set `VITE_RELAY_URL` to your configured Cloudflare Worker origin when building Studio. The Worker uses token-isolated rooms, SQLite Durable Objects, and private R2 storage; pairing codes expire after ten minutes and rooms after 24 hours. See [relay setup](apps/relay/README.md). Deployment, remote pairing, and hardware playback require their own verification.

## Explainer video

```bash
bun run --filter @buzzzz/explainer studio
bun run --filter @buzzzz/explainer voiceover
bun run --filter @buzzzz/explainer render
```

Narration uses macOS `say` and `afconvert`. Set `VOICE` and `RATE` to change the voice or speed. Rendering writes `apps/explainer/out/explainer.mp4`, which is ignored.

## Contributing

Install from the repository root and keep the single `bun.lock`. Apps may import `@buzzzz/core`; shared packages must not import apps. Read [architecture](docs/architecture.md) before changing the relay or shared format.

The preview app includes a Pulsar 1.7.0 composer leak backport and a local Rive Android surface fix. See [dependency patches](docs/development.md#dependency-patches) and [third-party notices](THIRD_PARTY_NOTICES.md).

The official Pulsar app can audition exported patterns through official Studio. Full Rive preview uses this repository's app. See [Pulsar compatibility](docs/pulsar-compatibility.md) for the tested boundaries.
