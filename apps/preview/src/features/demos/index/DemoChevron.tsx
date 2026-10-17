import { useFonts } from "expo-font";
import { StyleSheet, Text } from "react-native";
import { colors } from "../../../theme/colors";

const fonts = { PulsarDemoIcons: require("./demo-icons.ttf") };

export function DemoChevron() {
  const [loaded] = useFonts(fonts);
  if (!loaded) return <Text />;
  return (
    <Text selectable={false} allowFontScaling={false} style={styles.icon}>
      {String.fromCodePoint(62011)}
    </Text>
  );
}

const styles = StyleSheet.create({
  icon: {
    fontFamily: "PulsarDemoIcons",
    fontSize: 20,
    color: colors.border,
    marginLeft: 8,
    fontWeight: "normal",
    fontStyle: "normal",
  },
});
