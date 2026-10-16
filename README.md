# Buzzzz

Design haptic patterns on your laptop, wire them to Rive animations, and feel them on your iPhone in real time.

- **`studio/`** — web editor (Vite + React). Draw [Pulsar](https://github.com/software-mansion/pulsar)-compatible haptic patterns, drop in a `.riv` file, map each Rive trigger to a pattern. Its dev server is also the relay your phone connects to.
- **`preview/`** — iPhone app (Expo + `react-native-pulsar` + `@rive-app/react-native`). Plays the Rive animation and fires the mapped haptics.
- **`explainer/`** — optional Remotion project for the ~54 s explainer video.

```
 laptop                                   iPhone (same Wi-Fi)
┌─────────────────────────┐   ws://…/relay   ┌───────────────────┐
│ Studio  :5173           │ ◄──────────────► │ Haptics Preview   │
│ Metro   :8082 (JS code) │ ───────────────► │ app               │
└─────────────────────────┘                  └───────────────────┘
```

---

## Requirements

| What | Why |
|---|---|
| **Mac** with **Node.js 20+** | runs the studio and Metro bundler |
| **Xcode** (latest, from the App Store) | builds the iPhone app. Newer iPhones need the newest Xcode (e.g. iPhone 18 Pro needs Xcode 27+) |
| **CocoaPods** — `brew install cocoapods` | iOS native dependencies |
| **A real iPhone** + USB cable | haptics don't work in the Simulator, and Expo Go won't work (custom native modules) |
| **Apple ID** signed into Xcode | free account is fine for installing on your own device |

Laptop and phone must be on the **same Wi-Fi network**.

---

## 1. Clone and install

```bash
git clone https://github.com/mukulc121/Buzzzz.git
cd Buzzzz
npm run setup        # installs studio + preview dependencies
```

## 2. Run the studio (web app)

```bash
npm run dev
```

This starts both:
- **Studio** → http://localhost:5173 (open in your browser)
- **Metro** (the phone app's JS bundler) → port 8082

`Ctrl-C` stops both. Only want the studio? `npm --prefix studio run dev`.

## 3. Install the app on your iPhone (first time only)

### 3a. Point the project at your Apple account

Open `preview/app.json` and change two values to your own:

```jsonc
"ios": {
  "bundleIdentifier": "com.yourname.buzzzz",   // must be unique to you
  "appleTeamId": "YOUR_TEAM_ID"                // or delete this line and pick a team in Xcode
}
```

Find your Team ID in Xcode → Settings → Accounts → select your Apple ID → Team. (With a free account, you can also delete `appleTeamId` and choose your "Personal Team" in Xcode when prompted.)

### 3b. Prepare the iPhone

1. Plug the iPhone into the Mac and tap **Trust This Computer**.
2. Turn on **Developer Mode**: Settings → Privacy & Security → Developer Mode → On (phone restarts).

### 3c. Build and install

With `npm run dev` running in one terminal, in another:

```bash
npm run ios
```

This generates the native iOS project, installs pods, builds, and installs **Haptics Preview** on the plugged-in phone. The first build takes a few minutes.

If it fails on signing: open `preview/ios/HapticsPreview.xcworkspace` in Xcode → select the **HapticsPreview** target → **Signing & Capabilities** → tick *Automatically manage signing* and pick your team → press ▶︎ with your iPhone selected.

### 3d. Trust the developer (free Apple accounts)

First launch may say "Untrusted Developer". On the phone: Settings → General → VPN & Device Management → your Apple ID → **Trust**.

> Free accounts: the app expires after 7 days. Re-run `npm run ios` to reinstall.

When asked, **allow Local Network access** — the app needs it to reach the studio.

You only need `npm run ios` again when native code or native dependencies change. For everyday use, just `npm run dev` and open the app.

## 4. Connect phone ↔ studio

1. Open the studio at http://localhost:5173.
2. In the **Phone** card, scan the QR code with the iPhone camera → it opens the app via `rivehaptics://` and connects.
3. Or, in the app, paste the relay URL shown in the studio (`ws://192.168.x.x:5173/relay`).

The studio shows the number of connected phones. Press **Play** in the studio to feel the current pattern.

---

## Using it

1. **Design a pattern** in the studio, or start from Pulsar's built-in presets in the Library.
2. **Drop in a `.riv` file.** It's sent to the phone automatically.
3. **Map triggers to patterns.** Every view-model Trigger in the Rive file shows up; pick a pattern for each.
4. Interact with the animation on the phone and feel the haptics.

### Rive setup

Haptic slots are **Trigger properties on the artboard's view model** (data binding) — Rive Events are deprecated in both the web and React Native runtimes. In the Rive editor:

1. Add a **Trigger** to the view model.
2. Fire it from the state machine — a transition's *Set property value* action, or a listener.

### Exporting patterns

Patterns export in Pulsar's device format (`discretePattern` + `continuousPattern`), which `usePatternComposer().parse()` and every Pulsar SDK accept directly. In your own app, listen to the same triggers (see `RivePlayer` in `preview/App.tsx`) and play the mapped pattern.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Phone won't connect | Same Wi-Fi? Local Network permission allowed (Settings → Haptics Preview)? Guest/office Wi-Fi often blocks device-to-device traffic — try a phone hotspot. |
| QR opens nothing | App isn't installed yet — do step 3. |
| App shows a red "could not connect to development server" | `npm run dev` isn't running, or the Mac's IP changed. Restart it and reopen the app. |
| Port 8081 / 8082 in use | Metro uses 8082 on purpose (8081 is often taken). Kill the other process or change the port in `package.json`. |
| No haptics | Use a real iPhone (not Simulator), and make sure the phone isn't in Low Power Mode. |
| Build error after pulling changes | `rm -rf preview/ios && npm run ios` to regenerate the native project. |

---

## Explainer video (optional)

```bash
npm --prefix explainer install
npm --prefix explainer run studio      # edit in Remotion
npm --prefix explainer run voiceover   # regenerate narration (VOICE="Zoe (Premium)" for a nicer voice)
npm --prefix explainer run render      # exports explainer/out/explainer.mp4
```

If Remotion's bundled browser crashes on launch, add `--browser-executable=<path to any Chromium>`.

## Updating Pulsar presets

```bash
npm --prefix studio run sync-presets -- path/to/pulsar   # clone of software-mansion/pulsar
```
