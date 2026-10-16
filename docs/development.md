# Development

## Tools

Use Bun 1.4.0 and Node.js 22. The workspace uses Bun's hoisted linker and one root lockfile. Run `bun install` from the repository root; do not create app-level lockfiles.

Vite+ 1.3.0 runs the parallel development tasks, Studio's dev server/build, linting, and formatting. Its lint and format settings live in the root `vite.config.mts`. Bun remains the package manager and unit-test runner. Preset maintenance uses `apps/studio/scripts/sync-pulsar-presets.mts`.

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
| `bun run check`          | Types, lint, format check, unit tests, build, and Fallow |
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
| Static editor will not pair                  | Use `bun run dev:studio`; `vp preview` has no relay.                                                                |
| Native build fails after a dependency change | Regenerate the native project with Expo after reviewing local native changes. Generated directories are disposable. |

## Dependency patches

`react-native-pulsar@1.7.0` reparses a pattern without releasing its previous native composer. The workspace backports the React Native hook fix from [Pulsar PR #294](https://github.com/software-mansion/pulsar/pull/294), commit [`dc0a711a95806b91cf8d05771c6c601e0d5657a8`](https://github.com/software-mansion/pulsar/commit/dc0a711a95806b91cf8d05771c6c601e0d5657a8), through Bun's `patchedDependencies`.

`bun install` applies the checked-in patch. Keep it until a released Pulsar version includes the fix, then remove the patch and its manifest entry together, reinstall, and verify repeated playback on a physical phone. The upstream commit also changes the separate native iOS SDK; the package backport covers the React Native hook used here.

See [third-party notices](../THIRD_PARTY_NOTICES.md) for Pulsar's license.

## Explainer

Use `bun run --filter @buzzzz/explainer studio` to edit the Remotion composition. The `voiceover` script uses macOS speech tools; `VOICE` and `RATE` control narration. `render` writes an ignored MP4 under `apps/explainer/out`. Run all three commands from the root.
