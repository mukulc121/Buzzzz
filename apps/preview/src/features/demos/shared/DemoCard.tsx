import type { ReactNode } from "react";
import { Text, View } from "react-native";
import type { Theme } from "../../../theme/colors";
import { demoStyles } from "./demoStyles";

interface IDemoCard {
  t: Theme;
  title?: string;
  children: ReactNode;
}
export function DemoCard(props: IDemoCard) {
  const { t, title, children } = props;
  const s = demoStyles(t);
  return (
    <View style={s.card}>
      {title ? <Text style={s.cardTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}
