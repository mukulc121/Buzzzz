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

## Runtime walkthrough

1. Start `bun run dev` and open Studio. Test light, dark, and system themes at a narrow and wide viewport.
2. Create and rename a pattern, add a preset, select multiple points, snap edits, add markers and a play range, undo, export, and reimport.
3. Import real audio, change trim and frame size, inspect Fit/True and dB overlays, apply each generator, preserve a copy, and restore. Cancel an analysis by loading a different file.
4. Import Lottie JSON and a multi-animation dotLottie archive. Check playback, pause, seek, speed, preview layouts, channel choices, and all five approaches.
5. Exercise snippets, tap rhythm, microphone permission and recording, time warp, audio trim, signal analyzer, and compatibility linter.
6. Export a `.pulsar` with audio, animation, Rive, trim, markers, and mappings. Reimport and compare original attachment bytes and editor state. Reject corrupt hashes and invalid members without partial state changes.
7. Install Preview and pair locally. Confirm phone count, Rive mappings, play, pause, restart, reconnect, and a second Rive file. Repeat playback to check the composer backport.
8. For a deployed Worker, verify room isolation, code expiry, asset reads, sharing/revocation, project conflicts, and MCP against its actual hostname. Local Miniflare results do not complete this step.
9. On a physical phone, compare taps and continuous patterns by feel. A simulator cannot complete this step.

Hosted browser tests run the mounted editor against a local Worker and virtual phone WebSockets. They cover code renewal, a second phone, MCP updates, sharing, revocation, and private project isolation. They do not establish physical phone playback or deployed network behavior. Automated axe scans also need keyboard, screen-reader, and touch checks before claiming full accessibility.

## Current evidence limits

Type checks, JavaScript exports, and native compilation establish different things. Use the exact built app for native runtime checks. Simulator playback does not establish physical haptic output, signing on a user's phone, or long-running native stability. The presence of a CI workflow does not establish a green GitHub Actions run.

Synthetic signal and motion tests validate independent algorithms against known inputs. They do not establish equivalence to proprietary Studio algorithms, perceptual accuracy, or official SDK bundle interoperability. Portable format metadata and hashes still need an official consumer runtime check. A Cloudflare dry run and local integration tests do not prove a live deployment.
