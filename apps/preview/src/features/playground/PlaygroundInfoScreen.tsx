import { View } from "react-native";
import { router } from "expo-router";
import { Button } from "../../components/Button";
import { ThemedText } from "../../components/ThemedText";
import { PlaygroundModal } from "./PlaygroundModal";
import { modalStyles as styles } from "./modalStyles";
import { usePlaygroundPreferences } from "./usePlaygroundPreferences";

interface IInstruction {
  label: string;
  children: string;
}

function Instruction(props: IInstruction) {
  const { label, children } = props;
  return (
    <ThemedText style={styles.instruction}>
      <ThemedText style={styles.instructionLabel}>{label}</ThemedText>
      <ThemedText style={styles.instructionText}>{children}</ThemedText>
    </ThemedText>
  );
}

export function PlaygroundInfoScreen() {
  const { setOnboarding } = usePlaygroundPreferences();
  return (
    <PlaygroundModal title="How does it work?">
      <ThemedText type="defaultSemiBold">
        Experience and shape vibrations in real-time by interacting with the grid.
      </ThemedText>
      <View style={styles.infoBox}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          How to use
        </ThemedText>
        <Instruction label="Tap the Grid: ">
          Perform a single tap to trigger a short, precise haptic pulse.
        </Instruction>
        <Instruction label="Touch & Drag: ">
          Long-press and move your finger across the board to generate a continuous vibration that
          follows your movement.
        </Instruction>
        <ThemedText type="subtitle" style={[styles.sectionTitle, styles.controlsTitle]}>
          Controls:
        </ThemedText>
        <ThemedText style={styles.controlsIntro}>
          The haptic feedback changes dynamically based on your finger's position:
        </ThemedText>
        <Instruction label="Vertical Axis (Y): ">
          Slide up or down to increase or decrease the Amplitude (vibration strength).
        </Instruction>
        <Instruction label="Horizontal Axis (X): ">
          Slide left or right to shift the Frequency (vibration speed/pitch).
        </Instruction>
      </View>
      <View style={styles.buttonContainer}>
        <Button
          label="Show Onboarding Again"
          onClick={() => {
            void setOnboarding(1).catch(() => {});
            router.back();
          }}
        />
      </View>
    </PlaygroundModal>
  );
}
