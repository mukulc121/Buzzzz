import type { ReactNode } from "react";
import { View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import type { Theme } from "../theme/colors";

interface IPanel {
  children: ReactNode;
  t: Theme;
  style?: StyleProp<ViewStyle>;
}
export function Panel(props: IPanel) {
  const { children, t, style } = props;
  return (
    <View
      style={[
        {
          backgroundColor: t.panel,
          borderColor: t.highlight,
          borderWidth: 1,
          borderRadius: 4,
          padding: 16,
          gap: 16,
          boxShadow: `-2px 3px 0 ${t.highlight}`,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
