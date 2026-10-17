import { StyleSheet, View } from "react-native";
import LottieView from "lottie-react-native";
import { colors } from "../../theme/colors";

interface ILottieCanvas {
  uri: string;
  progress: number;
}

export function LottieCanvas(props: ILottieCanvas) {
  const { uri, progress } = props;
  return (
    <View style={styles.canvas}>
      <LottieView
        source={{ uri }}
        progress={Math.max(0, Math.min(1, progress))}
        resizeMode="contain"
        style={styles.lottie}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    height: 200,
    borderRadius: 4,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.tag,
    overflow: "hidden",
    marginBottom: 12,
  },
  lottie: { width: "100%", height: "100%" },
});
