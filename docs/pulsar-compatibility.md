# Pulsar app compatibility

Buzzzz and Pulsar share the pattern format. Their preview protocols differ.

| Capability                         | Official Pulsar app                        | Buzzzz preview                                     |
| ---------------------------------- | ------------------------------------------ | -------------------------------------------------- |
| Pattern playback                   | Pulsar relay and pairing code              | Buzzzz relay URL                                   |
| Animation                          | Lottie and dotLottie messages              | Rive file and view-model triggers                  |
| Rive trigger mapping and reporting | No handler found in the inspected receiver | `load`, `map`, `fire`, `restart`, `pause`, `fired` |

## What was checked

The official Android app, `com.swmansion.pulsar.app` version 1.3.0, was updated through Google Play and opened on a Samsung phone. REA pulled and inventoried the installed APK. The base APK's SHA-256 was `5e7c948b5e68263b48060c7d720ff25cb49d1452732957c4f7a258794a54b208`.

REA's Android decompiler was unavailable because its JADX MCP provider was not configured. The installed JADX CLI and matching Hermes compiler provided separate static inspection of the manifest, resources, and packaged JavaScript bytecode. This is static evidence, not proof that every code path ran.

A separate test sender paired with the official app through Pulsar's hosted relay. A Buzzzz-format pattern sent as a `haptic-preset` packet received HTTP 200 and appeared by name in the app's haptics library. This proves delivery and recognition, not physical haptic fidelity or compatibility with Buzzzz's relay.

The inspected receiver selects Pulsar's production relay configuration. It handles `haptic-preset`, `audio-haptics`, `animation-haptics`, and `library-manifest`. No custom relay setting or Rive message handler was established by this inspection.

Its Figma WebView also has a custom-pattern haptic bridge. The native entry accepts a preview token and loads Pulsar's own preview website; it does not accept an arbitrary page URL. Loading Buzzzz's Rive page through that website was not established. The bridge alone does not make the stock app a Buzzzz preview client.

## Practical options

Export a Buzzzz pattern and import it into official Studio to audition it with the official app. A direct sender adapter would depend on Pulsar's hosted service and its undocumented wire protocol; none is included here. Full Rive preview continues to use the Buzzzz app.

The SDK and bundled presets have their own MIT license. That license does not establish permission to depend on the hosted relay. See Pulsar's [playback documentation](https://docs.swmansion.com/pulsar/studio/playback/), [service terms](https://pulsar.swmansion.com/terms/), and [repository license](https://github.com/software-mansion/pulsar/blob/main/LICENSE).
