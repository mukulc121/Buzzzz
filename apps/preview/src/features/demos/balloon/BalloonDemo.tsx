import { StyleSheet, View } from "react-native";
import { InterceptingGestureDetector } from "react-native-gesture-handler";
import { ThemedText } from "../../../components/ThemedText";
import type { Theme } from "../../../theme/colors";
import { BALLOON_PROFILES } from "./balloon";
import { BalloonCell } from "./BalloonCell";

interface IBalloonDemo {
  t: Theme;
}
export function BalloonDemo(props: IBalloonDemo) {
  const { t } = props;
  return (
    <View>
      <ThemedText>Long press each balloon to pump it up!</ThemedText>
      <InterceptingGestureDetector>
        <View style={styles.grid}>
          {BALLOON_PROFILES.map((profile, index) => (
            <BalloonCell key={index} index={index} profile={profile} t={t} />
          ))}
        </View>
      </InterceptingGestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    marginTop: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
  },
});
