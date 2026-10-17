import { Platform, View } from "react-native";
import { Pressable } from "react-native-gesture-handler";
import { ThemedText } from "../../components/ThemedText";
import { PlaygroundModal } from "./PlaygroundModal";
import { modalStyles as styles } from "./modalStyles";
import { usePlaygroundPreferences } from "./usePlaygroundPreferences";

const strategies = [
  {
    label: "Envelope+Discrete",
    value: 3,
    description: "Balanced default for mixed continuous and discrete feedback.",
  },
  {
    label: "Envelope",
    value: 0,
    description: "Best when the interaction leans heavily on continuous haptics.",
  },
  {
    label: "Primitive Complex",
    value: 2,
    description: "A richer primitive-based option for devices with stronger support.",
  },
  {
    label: "Primitive Tick",
    value: 1,
    description: "The lightest primitive option, useful when you want a simpler feel.",
  },
] satisfies { label: string; value: 0 | 1 | 2 | 3; description: string }[];

export function PlaygroundSettingsScreen() {
  const { strategy, setStrategy } = usePlaygroundPreferences();
  return (
    <PlaygroundModal title="Playground settings">
      <ThemedText type="defaultSemiBold">
        Tune how the real-time composer behaves in the playground.
      </ThemedText>
      <View style={styles.infoBox}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Realtime strategy
        </ThemedText>
        {Platform.OS === "android" ? (
          <>
            <ThemedText style={styles.controlsIntro}>
              Choose how Android simulates continuous haptics in the playground.
            </ThemedText>
            <View style={styles.optionsList}>
              {strategies.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.optionCard,
                    strategy === option.value && styles.optionCardSelected,
                  ]}
                  onPress={() => {
                    void setStrategy(option.value).catch(() => {});
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: strategy === option.value }}
                  accessibilityLabel={option.label}
                >
                  <View style={styles.optionHeader}>
                    <ThemedText type="defaultSemiBold">{option.label}</ThemedText>
                    <View
                      style={[
                        styles.optionIndicator,
                        strategy === option.value && styles.optionIndicatorSelected,
                      ]}
                    />
                  </View>
                  <ThemedText style={styles.optionDescription}>{option.description}</ThemedText>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <ThemedText style={styles.optionDescription}>
            Strategy selection is available only on Android. iOS uses the native continuous haptics
            implementation.
          </ThemedText>
        )}
      </View>
    </PlaygroundModal>
  );
}
