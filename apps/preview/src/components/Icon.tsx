import { PixelRatio, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import glyphs from "../../assets/icons/glyphs.json";

export type IconName = keyof typeof glyphs;
interface IIcon {
  name: IconName;
  size: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}
export function Icon(props: IIcon) {
  const { name, size, color, style } = props;
  const glyph = glyphs[name];
  const scaledSize = size * PixelRatio.getFontScale();
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={name}
      style={[{ height: scaledSize, width: (glyph.width / 1024) * scaledSize, bottom: 0 }, style]}
    >
      {glyph.layers.map((layer) => (
        <Text
          key={layer.codepoint}
          selectable={false}
          accessible={false}
          style={[styles.layer, { fontSize: size, color: color ?? layer.color }]}
        >
          {String.fromCodePoint(layer.codepoint)}
        </Text>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  layer: {
    fontFamily: "pulsar-icons",
    fontWeight: "normal",
    fontStyle: "normal",
    position: "absolute",
    includeFontPadding: false,
    bottom: 0,
  },
});
