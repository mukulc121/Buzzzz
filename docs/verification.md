# Verification

## Repeatable checks

| Check                  | What it covers                                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `bun run typecheck`    | Every workspace's TypeScript                                                                                      |
| `bun run lint`         | Vite+ lint with warnings rejected                                                                                 |
| `bun run format:check` | Repository formatting                                                                                             |
| `bun run test`         | Shared model/protocol tests and preset validation                                                                 |
| `bun run build`        | Studio's production bundle                                                                                        |
| `bun run analyze`      | Fallow dead-code and dependency-boundary analysis                                                                 |
| `bun run test:browser` | Chromium layouts at 320–1920 px, preset use, persistence, undo, invalid import handling, and light/dark axe scans |

`bun run check` runs the first six checks. `bun run check:all` also runs the browser tests.

`analyze` fails on dead code or architecture violations. `bun run analyze:health` reports broader health and duplication findings for review without adding them to the quality gate.

The CI workflow repeats quality and browser checks. It separately checks Expo dependency compatibility and exports the iOS and Android JavaScript bundles. Exporting JavaScript does not compile a native app.

The current local run passed 28 unit tests and 13 browser tests, plus types, strict lint, formatting, the production build, and Fallow's dead-code and architecture checks. Fallow reported no security candidates or duplicate blocks. Its broader health report still flags complexity hotspots, with estimated coverage; it is advisory and does not establish test coverage or security.

Claude reviewed correctness, UI layout, relay boundaries, imports, native callbacks, and the Pulsar dependency patch. The review found and prompted fixes for chart clipping, relay host validation, shortcut handling, partial imports, Rive playback selection, suspended audio, and rejected native trigger discovery.

`bun audit` still reports transitive advisories for `braces@3.0.3`, `node-forge@1.4.0`, and `uuid@7.0.3` through Expo/Metro tooling. Static caller tracing did not find a matching exploit path in this app. The first two have no patched release at the time of this review; clearing UUID would require overriding Xcode tooling's major-version range. These remain dependency advisories, not resolved findings.

## Runtime walkthrough

1. Start `bun run dev` and open Studio. Test light, dark, and system themes at a narrow and wide viewport.
2. Create and rename a pattern, add a preset, edit a point, undo, export, and reimport it.
3. Install the preview app and pair it. Confirm Studio updates its phone count.
4. Import a Rive file with view-model triggers, map patterns, and fire each trigger from Studio and the phone.
5. Test pause, restart, disconnect, reconnect, and a second Rive file. Repeat playback to check the composer backport.
6. On a physical iPhone, compare taps and continuous patterns by feel. A simulator cannot complete this step.

Browser automation checks the editor, rather than native playback or a complete phone pairing flow. Automated axe scans also need keyboard, screen-reader, and touch checks before claiming full accessibility.

## Current evidence limits

The iOS simulator build succeeded. An earlier runtime check used a binary from before the automatic light/dark configuration, so it does not verify that change. The latest simulator runtime check is blocked by host simulator startup and attachment failures. No physical iPhone was used, so haptic feel, physical-device signing, and long-running native playback remain unverified. The presence of a CI workflow does not establish a green GitHub Actions run.

The iPhone 17 simulator failed with `LaunchdSimError code=124: Process spawn via launchd failed`, caused by `SimXPCErrorDomain code=124: Domain is tearing down`. It was shut down. Attaching the requested iPhone 13 mini simulator failed with `Device attach stream failed: Could not communicate with device support. Try refreshing devices.` Metro served the current iOS bundle, but no app debugger connected. These host failures leave native runtime verification incomplete.
