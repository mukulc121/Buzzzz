import { useFonts } from "expo-font";
import { StyleSheet, Text } from "react-native";
import { colors } from "../../theme/colors";

interface IHomeChevron {
  expanded: boolean;
}

const fonts = { material: require("./assets/MaterialIcons.ttf") };

export function HomeChevron(props: IHomeChevron) {
  const [loaded] = useFonts(fonts);
  if (!loaded) return <Text />;
  return (
    <Text
      selectable={false}
      allowFontScaling={false}
      style={[styles.icon, { transform: [{ rotate: props.expanded ? "90deg" : "0deg" }] }]}
    >
      {String.fromCodePoint(58828)}
    </Text>
  );
}

const styles = StyleSheet.create({
  icon: {
    fontFamily: "material",
    fontWeight: "normal",
    fontStyle: "normal",
    fontSize: 18,
    color: colors.navy,
  },
});
