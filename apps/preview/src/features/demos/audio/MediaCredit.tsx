import { Linking, StyleSheet, Text } from "react-native";

interface ICreditLink {
  label: string;
  url: string;
}
function CreditLink(props: ICreditLink) {
  const { label, url } = props;
  return (
    <Text style={styles.link} onPress={() => void Linking.openURL(url)}>
      {label}
    </Text>
  );
}
const UTM = "?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=47995";
export function MediaCredit() {
  return (
    <Text testID="audio-demo-credit" style={styles.credit}>
      Sound effect by{" "}
      <CreditLink
        label="freesound_community"
        url={`https://pixabay.com/users/freesound_community-46691455/${UTM}`}
      />{" "}
      from <CreditLink label="Pixabay" url={`https://pixabay.com/sound-effects//${UTM}`} />.
    </Text>
  );
}
const styles = StyleSheet.create({
  credit: { marginTop: 12, fontSize: 12, lineHeight: 18, color: "rgba(123, 147, 184, 1)" },
  link: { color: "rgba(56, 172, 221, 1)", textDecorationLine: "underline" },
});
