import { SymbolView } from "expo-symbols";
import { colors } from "../../theme/colors";

interface IHomeChevron {
  expanded: boolean;
}

export function HomeChevron(props: IHomeChevron) {
  return (
    <SymbolView
      name="chevron.right"
      weight="medium"
      tintColor={colors.navy}
      resizeMode="scaleAspectFit"
      style={{ width: 18, height: 18, transform: [{ rotate: props.expanded ? "90deg" : "0deg" }] }}
    />
  );
}
