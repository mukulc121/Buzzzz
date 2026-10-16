import type { ReactNode } from "react";
import { Text, View } from "react-native";
import type { Theme } from "../theme/colors";
import { font } from "../theme/typography";

interface IScreenHeading {
  title: string;
  subtitle?: string;
  t: Theme;
  trailing?: ReactNode;
}
export function ScreenHeading(props: IScreenHeading) {
  const { title, subtitle, t, trailing } = props;
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <Text
          accessibilityRole="header"
          style={{ ...font.bold, fontSize: 30, color: t.fg, flex: 1 }}
        >
          {title}
        </Text>
        {trailing}
      </View>
      {subtitle && (
        <Text style={{ ...font.regular, color: t.fg, fontSize: 16, lineHeight: 23 }}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}
