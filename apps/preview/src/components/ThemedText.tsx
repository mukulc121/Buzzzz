import { StyleSheet, Text, type TextProps } from "react-native";
import { colors } from "../theme/colors";

interface IThemedText extends TextProps {
  type?: "default" | "defaultSemiBold" | "title" | "subtitle" | "link";
}
export function ThemedText(props: IThemedText) {
  const { type = "default", style, ...rest } = props;
  return <Text style={[{ color: colors.navy }, styles[type], style]} {...rest} />;
}
const styles = StyleSheet.create({
  default: { fontSize: 16, lineHeight: 24 },
  defaultSemiBold: { fontSize: 18, lineHeight: 28, fontWeight: "600" },
  title: { fontSize: 32, fontWeight: "bold", lineHeight: 36 },
  subtitle: { fontSize: 22, lineHeight: 32, fontWeight: "bold" },
  link: { lineHeight: 30, fontSize: 16, color: "rgba(10, 126, 164, 1)" },
});
