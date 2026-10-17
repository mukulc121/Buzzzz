import type { ReactNode } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Icon } from "../../components/Icon";
import { colors } from "../../theme/colors";
import {
  swipeCircleAnimation,
  swipeHandAnimation,
  tapCircleAnimation,
  tapHandAnimation,
} from "./tutorialAnimations";

interface IPlaygroundTutorial {
  step: 1 | 2 | 3;
  children: ReactNode;
}

const hand = require("./assets/hand.png");

export function PlaygroundTutorial(props: IPlaygroundTutorial) {
  const { step, children } = props;
  if (step === 3) return children;
  const tap = step === 1;
  return (
    <Animated.View key={step} style={styles.container} entering={FadeIn} exiting={FadeOut}>
      {children}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Text style={styles.label}>
          {tap ? "Tap to trigger haptic impulse" : "Swipe to play continuous haptics"}
        </Text>
        <View style={[styles.circles, tap ? styles.tapCircles : styles.swipeCircles]}>
          {[60, 90, 120, 150, 180].map((size, index) => (
            <Animated.View
              key={size}
              style={[
                styles.circle,
                tap ? tapCircleAnimation : swipeCircleAnimation,
                tap && { animationDelay: 1050 + index * 50 },
              ]}
            >
              <Icon name="ellipse" size={size} />
            </Animated.View>
          ))}
        </View>
        <Animated.View
          style={[
            tap ? styles.tapHand : styles.swipeHand,
            tap ? tapHandAnimation : swipeHandAnimation,
          ]}
        >
          <Image source={hand} style={styles.hand} resizeMode="contain" />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  label: {
    position: "absolute",
    top: 60,
    alignSelf: "center",
    fontSize: 18,
    fontWeight: "600",
    color: colors.navy,
    backgroundColor: colors.white,
    borderRadius: 4,
    paddingVertical: 18,
    paddingHorizontal: 10,
    borderColor: colors.border,
    borderWidth: 2,
    boxShadow: `-3px 3px 0px ${colors.border}`,
  },
  circles: { position: "absolute", justifyContent: "center", alignItems: "center" },
  tapCircles: { left: "52%", bottom: "52%" },
  swipeCircles: { left: "37%", bottom: "38%" },
  circle: { position: "absolute" },
  tapHand: { position: "absolute", left: "45%", bottom: "45%" },
  swipeHand: { position: "absolute", left: "30%", bottom: "30%" },
  hand: { width: 60, height: 60 },
});
