import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { createNanoIconSet } from "react-native-nano-icons";
import glyphs from "../../assets/icons/glyphs.json";

const NanoIcon = createNanoIconSet(glyphs);

export type IconName = keyof typeof glyphs.i;
interface IIcon {
  name: IconName;
  size: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}
export function Icon(props: IIcon) {
  return <NanoIcon {...props} style={StyleSheet.flatten(props.style)} />;
}
