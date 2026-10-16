# Verification

## Repeatable checks

| Check                  | What it covers                                                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `bun run typecheck`    | Every workspace's TypeScript                                                                                         |
| `bun run lint`         | Vite+ lint with warnings rejected                                                                                    |
| `bun run format:check` | Repository formatting                                                                                                |
| `bun run test`         | Shared models/protocol, imports, DSP, generators, editor tools, presets, and relay units                             |
| `bun run test:relay`   | Miniflare integration: rooms, assets, sockets, project revisions, shares, and MCP                                    |
| `bun run build`        | Studio's production bundle                                                                                           |
| `bun run analyze`      | Fallow dead-code and dependency-boundary analysis                                                                    |
| `bun run test:browser` | Chromium layouts at 320–1920 px, persistence, media, timelines, light/dark axe scans, and hosted pairing/sharing/MCP |

`bun run check` runs types, lint, formatting, unit and relay integration tests, build, and analysis. `bun run check:all` also runs browser tests.

`analyze` fails on dead code or architecture violations. `bun run analyze:health` reports broader health and duplication findings for review without adding them to the quality gate.

The CI workflow repeats quality and browser checks. It separately checks Expo dependency compatibility and exports the iOS and Android JavaScript bundles. Exporting JavaScript does not compile a native app.

Treat command output from the current checkout as evidence. Test counts, dependency advisories, and review findings change as features and dependencies change. Fallow's health and duplication report is advisory; it does not establish security or measured test coverage.

## Sound reference checks

After installing Chromium, run the checked-in player and preset comparisons:

```bash
bunx playwright test __tests__/browser/sound.spec.ts __tests__/browser/sound-presets.spec.ts
```

To include the deployed Studio synth comparison, supply a saved Studio JavaScript bundle:

```bash
PULSAR_STUDIO_BUNDLE=/absolute/path/pulsar-studio.js bunx playwright test __tests__/browser/sound-presets.spec.ts
```

The deployed-bundle comparison skips when that variable is unset. These reference checks have run on macOS and Linux AMD64 with the saved bundle. Re-run them for the revision and browser being reviewed.

The oracle compares sound at 44.1 and 48 kHz. Buffer length, onset positions, zero-crossing counts, and the last audible sample index must match exactly. Sample, envelope, and tail amplitudes use a Float32 error bound derived from voice summing order and the lowpass filter's response and rounding. The reference player's own repeated render must satisfy the same bound.

## Native checks

```bash
bun test apps/preview/__tests__
```

These tests check model calculations, connection handling, and source-derived demo fixtures. Rebuild the native app after SDK or patch changes, then check the installed binary on each target platform. Balloon, Dot loader, Notifications, motion sensors, and AudioSync need physical playback checks. AudioSync's source-compatible path depends on the native Pulsar bundle/audio backport; unit tests and a successful build do not verify audio/haptic synchronization.

Confirm the native build uses the [pinned source revision and archive hash](development.md#dependency-patches). The compatibility metadata iOS 1.4.0 and Android 1.3.0 does not establish published support for these APIs. Check Fanfare controls and layout separately from audible playback, tactile output, and synchronized seeking. An idle screenshot comparison cannot verify those outputs, and each platform needs its own build and runtime result.

## Runtime walkthrough

1. Start `bun run dev` and open Studio. Test light, dark, and system themes at a narrow and wide viewport. Change grid density, precision, crosshairs, the time cursor, and multilayer selection in Settings. Run Learn's four walkthroughs.
2. Create and rename projects in Projects. Open their `/studio/projects/:id` URLs, reload, and use Back/Forward. Check a missing ID, another writing tab, and local persistence. In the editor, add a preset, select points, snap edits, add markers and a play range, undo, export, and reimport. Open a Library About dialog and audition without altering the project pattern.
3. Import real audio, change trim and frame size, enable all 12 metrics, inspect Fit to clip, True value, and dB overlays, and apply all nine approaches. Edit a generated pattern, switch approaches, preserve a copy, and restore. Load a different file while generation is running and check that stale results do not replace it.
4. Import Lottie JSON and a multi-animation dotLottie archive. Check playback, pause, seek, speed, preview layouts, channel choices, and all five approaches.
5. Exercise snippets, tap rhythm, microphone permission and recording, time warp, audio trim, signal analyzer, and compatibility linter.
6. Export a `.pulsar` with audio, animation, Rive, trim, markers, and mappings. Reimport and compare original attachment bytes and editor state. Reject corrupt hashes and invalid members without partial state changes.
7. Install Preview and pair locally. Confirm phone count, Rive mappings, play, pause, restart, reconnect, and a second Rive file. Repeat playback to check the composer backport.
8. For a deployed Worker, verify room isolation, code expiry, asset reads, sharing/revocation, project conflicts, and MCP against its actual hostname. Local Miniflare results do not complete this step.
9. On a physical phone, compare taps and continuous patterns by feel. Exercise Balloon, Dot loader, Notifications, sensors, and AudioSync, including stopping, restarting, and backgrounding. A simulator cannot establish haptic output or audio/haptic synchronization.

Hosted browser tests run the mounted editor against a local Worker and virtual phone WebSockets. They cover code renewal, a second phone, MCP updates, sharing, revocation, and private project isolation. They do not establish physical phone playback or deployed network behavior. Automated axe scans also need keyboard, screen-reader, and touch checks before claiming full accessibility.

## Current evidence limits

The sensor adapter selects the accelerometer on iOS and gyroscope on Android. Source-derived calculations and demo fixtures need physical sensor, gesture, and haptic comparisons on each platform. Personal signing values remain in ignored Xcode settings.

Type checks, JavaScript exports, and native compilation establish different things. Use the exact built app for native runtime checks. Simulator playback does not establish physical haptic output, signing on a user's phone, or long-running native stability. The presence of a CI workflow does not establish a green GitHub Actions run.

Signal and motion fixtures compare tested inputs with reference outputs. They do not establish physical perceptual accuracy, every browser's floating-point behavior, pixel parity across the whole UI, or official SDK bundle interoperability. Portable format metadata and hashes still need an official consumer runtime check. A Cloudflare dry run and local integration tests do not prove a live deployment.
