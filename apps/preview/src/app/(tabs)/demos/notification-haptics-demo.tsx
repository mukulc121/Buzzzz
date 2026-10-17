import { DemoRouteScreen } from "../../../features/demos/DemoRouteScreen";
import { usePreview } from "../../../features/shell/usePreview";

export default function NotificationRoute() {
  const { t } = usePreview();
  return <DemoRouteScreen id="notification" t={t} />;
}
