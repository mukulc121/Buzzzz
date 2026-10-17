import type { CSSAnimationKeyframes, CSSStyle } from "react-native-reanimated";
import type { ViewStyle } from "react-native";

const base: CSSStyle<ViewStyle> = {
  animationDuration: 2000,
  animationIterationCount: "infinite",
  animationTimingFunction: "ease-out",
};
const pulse: CSSAnimationKeyframes = {
  "0%": { transform: [{ scale: 1 }], opacity: 0 },
  "10%": { opacity: 1 },
  "70%": { transform: [{ scale: 1.2 }], opacity: 0 },
  "100%": { transform: [{ scale: 1.2 }], opacity: 0 },
};
const swipe: CSSAnimationKeyframes = {
  "0%": { transform: [{ translateX: 0 }, { translateY: 0 }], opacity: 0 },
  "10%": { transform: [{ translateX: 0 }, { translateY: 0 }], opacity: 1 },
  "80%": { transform: [{ translateX: 80 }, { translateY: -200 }], opacity: 1 },
  "100%": { transform: [{ translateX: 80 }, { translateY: -200 }], opacity: 0 },
};
export const tapCircleAnimation: CSSStyle<ViewStyle> = {
  ...base,
  justifyContent: "center",
  alignItems: "center",
  opacity: 0,
  animationName: pulse,
};
export const swipeCircleAnimation: CSSStyle<ViewStyle> = {
  ...base,
  justifyContent: "center",
  alignItems: "center",
  opacity: 0,
  animationDelay: 1000,
  animationName: swipe,
};
export const tapHandAnimation: CSSStyle<ViewStyle> = {
  ...base,
  animationDelay: 1000,
  animationName: {
    "0%": { transform: [{ scale: 1 }], opacity: 1 },
    "10%": { transform: [{ scale: 0.8 }], opacity: 0.8 },
    "20%": { transform: [{ scale: 1 }], opacity: 1 },
    "100%": { transform: [{ scale: 1 }], opacity: 1 },
  },
};
export const swipeHandAnimation: CSSStyle<ViewStyle> = {
  ...base,
  animationDelay: 1000,
  animationName: {
    "0%": { transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }], opacity: 1 },
    "10%": { transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 0.8 }], opacity: 0.8 },
    "80%": { transform: [{ translateX: 80 }, { translateY: -200 }, { scale: 0.8 }], opacity: 0.8 },
    "90%": { transform: [{ translateX: 80 }, { translateY: -200 }, { scale: 1 }], opacity: 1 },
    "100%": { transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }], opacity: 1 },
  },
};
