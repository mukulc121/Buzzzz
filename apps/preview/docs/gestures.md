# Gesture Handler version

Preview pins Gesture Handler 3.3.0 for its `usePanGesture`, `useTapGesture`, and `useExclusiveGestures` APIs. Expo SDK 57 recommends 2.32, so `expo.install.exclude` names this one intentional version override. Other dependency checks stay enabled.

The installed Headout iPhone Debug build uses 3.3.0. Library replay, modal navigation, and source slider touch isolation were checked on that phone. This does not establish full Android native compatibility; CI checks both JavaScript exports.
