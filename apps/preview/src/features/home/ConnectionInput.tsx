import { useState } from "react";
import { StyleSheet, TextInput } from "react-native";
import { colors } from "../../theme/colors";
import { deriveConnectionInput } from "./model";

interface IConnectionInput {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
}

export function ConnectionInput(props: IConnectionInput) {
  const { value, onChangeText, onSubmit } = props;
  const [focused, setFocused] = useState(false);
  const { placeholder, ...sizing } = deriveConnectionInput(value, focused);
  return (
    <TextInput
      accessibilityLabel="Connecting code"
      accessibilityHint="Six-digit pairing code, Studio pairing link, or local WebSocket relay address"
      value={value}
      onChangeText={onChangeText}
      style={[styles.input, sizing]}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      autoCapitalize="none"
      autoCorrect={false}
      keyboardType="decimal-pad"
      returnKeyType="go"
      onSubmitEditing={onSubmit}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    flex: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    borderColor: colors.tag,
    borderWidth: 2,
    color: colors.navy,
  },
});
