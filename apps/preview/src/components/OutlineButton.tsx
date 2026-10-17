import type { ReactNode } from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import type { Theme } from "../theme/colors";
import { font } from "../theme/typography";
import { PressableScale } from "./PressableScale";

interface IOutlineButton {
  title: string;
  onPress: () => void;
  t: Theme;
  icon?: ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}
export function OutlineButton(props: IOutlineButton) {
  const { title, onPress, t, icon, disabled, style, accessibilityLabel } = props;
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel ?? title}
      style={[
        {
          minHeight: 48,
          backgroundColor: t.panel,
          borderColor: t.highlight,
          borderWidth: 1,
          borderRadius: 4,
          paddingHorizontal: 14,
          paddingVertical: 10,
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.45 : 1,
          boxShadow: `-2px 3px 0 ${t.highlight}`,
        },
        style,
      ]}
    >
      <View
        style={{ flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" }}
      >
        {icon}
        <Text
          style={{
            ...font.medium,
            fontSize: 16,
            color: t.fg,
            flexShrink: 1,
            textAlign: "center",
          }}
        >
          {title}
        </Text>
      </View>
    </PressableScale>
  );
}
