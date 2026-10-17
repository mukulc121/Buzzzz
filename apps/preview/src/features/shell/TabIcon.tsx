import { Film } from "lucide-react-native";
import { Icon, type IconName } from "../../components/Icon";
import { colors } from "../../theme/colors";

interface ITabIcon {
  name: IconName | "preview";
  focused: boolean;
}
export function TabIcon(props: ITabIcon) {
  const { name, focused } = props;
  const color = focused ? colors.navy : colors.blue;
  // Preview hosts the Rive player instead of the original's Figma preview.
  if (name === "preview") return <Film size={24} color={color} />;
  return <Icon name={name} size={24} color={color} />;
}
