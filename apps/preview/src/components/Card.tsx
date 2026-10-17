import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "../theme/colors";

interface ICard {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}
export function Card(props: ICard) {
  const { children, style } = props;
  return <View style={[styles.container, style]}>{children}</View>;
}
const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    boxShadow: `-3px 3px 0px ${colors.border}`,
    borderRadius: 4,
    padding: 15,
    paddingVertical: 25,
    borderColor: colors.border,
    borderWidth: 2,
    overflow: "hidden",
  },
});
