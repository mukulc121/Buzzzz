# Third-party notices

## Pulsar

Studio's preset library in `packages/core/src/presets/pulsar-presets.json` is copied from [Pulsar's documentation assets](https://github.com/software-mansion/pulsar/tree/main/docs/src/content/docs/assets). Studio's sound preview in `apps/studio/src/features/composer/soundGraph.ts` adapts [Pulsar's audio player](https://github.com/software-mansion/pulsar/blob/abdee706282598ab0194ba739dce835dc828f164/docs/src/content/docs/components/Preset/audio-player.ts). The `react-native-pulsar@1.7.0` dependency patch backports the React Native composer fix from [Pulsar PR #294](https://github.com/software-mansion/pulsar/pull/294), commit `dc0a711a95806b91cf8d05771c6c601e0d5657a8`.

The native preset catalog, chart images, and `pulsar-icons.ttf` with its layer metadata are copied from the published Pulsar app. The icon font is identical in its iOS and Android distributions.

The Studio rail logo in `apps/studio/src/assets/pulsar-logo.svg` is copied from Pulsar Studio's published SVG asset, with unchanged geometry and equivalent RGBA colors.

The patched native cores use unreleased source at revision `abdee706282598ab0194ba739dce835dc828f164`, pinned in [`source.json`](apps/preview/native/pulsar/source.json), with their license retained in [`native/pulsar/LICENSE`](apps/preview/native/pulsar/LICENSE).

These use Pulsar's [MIT license](https://github.com/software-mansion/pulsar/blob/main/LICENSE):

```text
MIT License

Copyright (c) 2025 Krzysztof Piaskowy

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Fanfare audio

The Fanfare sound in the native [`PulsarAppBundle.pulsar`](apps/preview/assets/bundles/PulsarAppBundle.pulsar) is by [freesound_community](https://pixabay.com/users/freesound_community-46691455/) from Pixabay, under the [Pixabay Content License](https://pixabay.com/service/license-summary/). It is part of the synchronized audio/haptics example and is not relicensed under MIT. The [starter attribution](apps/studio/src/features/project/starter/ATTRIBUTION.md) records its provenance and matching SHA-256.

## Expo

The preview app retains its Expo template license in [`apps/preview/LICENSE`](apps/preview/LICENSE), copyright 2015-present 650 Industries, Inc. Dependencies retain their own licenses.

## Rive

The local `@rive-app/react-native@0.5.5` patch changes Android surface resizing and redraw scheduling, and the shared hook's readiness handling. Rive's React Native runtime is distributed under its [MIT license](https://github.com/rive-app/rive-react-native/blob/main/LICENSE). The patch and its removal checks are documented in `docs/development.md`.

## Lottie React Native

The local `lottie-react-native@7.3.8` patch fixes Android loading of cached animation file URLs. The runtime retains its [Apache License 2.0](https://github.com/lottie-react-native/lottie-react-native/blob/master/LICENSE).

## Mediabunny

Studio uses `mediabunny@1.61.3` for decoder-free audio container metadata. It is distributed under the Mozilla Public License 2.0. Its unmodified source and license are available in the [Mediabunny repository](https://github.com/Vanilagy/mediabunny).

## DM Sans

Studio bundles DM Sans from Google Fonts under the SIL Open Font License 1.1. The copyright and full license are included in `apps/studio/src/assets/fonts/OFL.txt`.

## Lucide

Studio adapts Lucide icon paths under the ISC license:

```text
ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

Inherited Feather icon paths also retain their MIT license:

```text
The MIT License (MIT) (for the icons listed above)

Copyright (c) 2013-present Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Driver.js

Studio uses Driver.js for guided walkthroughs.

```text
The MIT License

Copyright (c) Kamran Ahmed

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

## canvas-confetti

Studio uses canvas-confetti for walkthrough completion.

```text
ISC License

Copyright (c) 2020, Kiril Vatev

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

## canvas-confetti types

The development type declarations retain their MIT license.

```text
MIT License

    Copyright (c) Microsoft Corporation.

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE
```

## Ionicons

The native Notification demo and Demos list bundle subsets of Ionicons, distributed under the [MIT license](https://github.com/ionic-team/ionicons/blob/main/LICENSE).

```text
The MIT License (MIT)

Copyright (c) 2015-present Ionic (http://ionic.io/)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

## Material Icons

The Android connection help chevron uses a one-glyph subset of Google Material Icons, Copyright 2018 Google, under the Apache License 2.0. The font was subsetted for this app. The full license is included in [MaterialIcons.LICENSE](apps/preview/src/features/home/assets/MaterialIcons.LICENSE).
