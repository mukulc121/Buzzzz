import { ContextMenu as Menu } from "../../../components/ContextMenu";
import { DashboardIcon } from "./DashboardIcon";

type TDashboardItem =
  | {
      label: string;
      icon: Parameters<typeof DashboardIcon>[0]["name"];
      danger?: boolean;
      onSelect: () => void;
    }
  | { separator: true };
interface IDashboardContextMenu {
  x: number;
  y: number;
  items: TDashboardItem[];
  onClose: () => void;
}
export function DashboardContextMenu(props: IDashboardContextMenu) {
  return (
    <Menu
      {...props}
      items={props.items.map((item) =>
        "separator" in item
          ? item
          : { ...item, icon: <DashboardIcon name={item.icon} size={16} /> },
      )}
    />
  );
}
