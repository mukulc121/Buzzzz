import { StyleSheet, View } from "react-native";
import { ThemedText } from "../../../components/ThemedText";
import type { Theme } from "../../../theme/colors";
import { Dot } from "./Dot";
import { DOT_PATTERNS } from "./dots";

interface IDotLoaderDemo {
  t: Theme;
}
export function DotLoaderDemo(props: IDotLoaderDemo) {
  const { t } = props;
  return (
    <View>
      <ThemedText>
        Watch the three dots move in a wave pattern and feel the haptic feedback each time a dot
        hits the bottom.
      </ThemedText>
      <View style={styles.stage}>
        <View style={styles.row}>
          {DOT_PATTERNS.map((pattern, index) => (
            <View key={index} style={styles.wrapper}>
              <Dot index={index} pattern={pattern} color={t.fg} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    marginTop: 60,
    marginBottom: 60,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  wrapper: { marginHorizontal: 10 },
});
