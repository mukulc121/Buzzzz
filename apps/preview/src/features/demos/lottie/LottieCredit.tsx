import { Linking, StyleSheet, Text } from "react-native";

export function LottieCredit() {
  return (
    <Text testID="lottie-demo-credit" style={styles.credit}>
      Bomb animation by Google, from{" "}
      <Text
        style={styles.link}
        onPress={() =>
          void Linking.openURL(
            "https://iconscout.com/free-lottie-animation/free-bomb-animation_12152510",
          )
        }
      >
        IconScout
      </Text>
      .
    </Text>
  );
}
const styles = StyleSheet.create({
  credit: { marginTop: 12, fontSize: 12, lineHeight: 18, color: "rgba(123, 147, 184, 1)" },
  link: { color: "rgba(56, 172, 221, 1)", textDecorationLine: "underline" },
});
