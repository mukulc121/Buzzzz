import { Text, View } from "react-native";
import type { Theme } from "../theme/colors";

interface IStep {
  n: number;
  text: string;
  t: Theme;
}
export function Step(props: IStep) {
  const { n, text, t } = props;
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: t.sunken,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: t.fg2, fontSize: 12, fontWeight: "600" }}>{n}</Text>
      </View>
      <Text style={{ color: t.fg2, fontSize: 15, flex: 1, lineHeight: 21 }}>{text}</Text>
    </View>
  );
}
