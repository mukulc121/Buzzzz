import { useState } from "react";
import { StyleSheet, TextInput } from "react-native";
import { colors } from "../../theme/colors";

interface IConnectionNameInput {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
}

export function ConnectionNameInput(props: IConnectionNameInput) {
  const { value, onChangeText, onSubmit } = props;
  const [focused, setFocused] = useState(false);
  const expanded = focused || value !== "";
  return (
    <TextInput
      accessibilityLabel="Connection name"
      placeholder={focused ? "" : "Connection name"}
      style={[
        styles.input,
        { fontSize: expanded ? 25 : 16, paddingVertical: expanded ? 12.5 : 18 },
      ]}
      value={value}
      onChangeText={onChangeText}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      keyboardType="default"
      autoCapitalize="sentences"
      autoCorrect
      returnKeyType="done"
      onSubmitEditing={onSubmit}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    marginTop: 15,
    borderRadius: 4,
    paddingHorizontal: 10,
    borderColor: colors.tag,
    borderWidth: 2,
    color: colors.navy,
  },
});
