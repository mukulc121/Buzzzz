# Third-party notices

## Pulsar

Studio's preset library in `packages/core/src/presets/pulsar-presets.json` is copied from [Pulsar's documentation assets](https://github.com/software-mansion/pulsar/tree/main/docs/src/content/docs/assets). Studio's sound preview in `apps/studio/src/features/composer/soundGraph.ts` adapts [Pulsar's audio player](https://github.com/software-mansion/pulsar/blob/abdee706282598ab0194ba739dce835dc828f164/docs/src/content/docs/components/Preset/audio-player.ts). The `react-native-pulsar@1.7.0` dependency patch backports the React Native composer fix from [Pulsar PR #294](https://github.com/software-mansion/pulsar/pull/294), commit `dc0a711a95806b91cf8d05771c6c601e0d5657a8`.

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

## Expo

The preview app retains its Expo template license in [`apps/preview/LICENSE`](apps/preview/LICENSE), copyright 2015-present 650 Industries, Inc. Dependencies retain their own licenses.

## Rive

The local `@rive-app/react-native@0.5.5` patch changes Android surface resizing and redraw scheduling, and the shared hook's readiness handling. Rive's React Native runtime is distributed under its [MIT license](https://github.com/rive-app/rive-react-native/blob/main/LICENSE). The patch and its removal checks are documented in `docs/development.md`.

## Mediabunny

Studio uses `mediabunny@1.61.3` for decoder-free audio container metadata. It is distributed under the Mozilla Public License 2.0. Its unmodified source and license are available in the [Mediabunny repository](https://github.com/Vanilagy/mediabunny).
