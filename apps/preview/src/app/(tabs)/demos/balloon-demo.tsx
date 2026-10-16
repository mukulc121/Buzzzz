import { DemoRouteScreen } from "../../../features/demos/DemoRouteScreen";
import { usePreview } from "../../../features/shell/usePreview";

export default function DemoRoute() {
  const { t } = usePreview();
  return <DemoRouteScreen id="balloon" t={t} />;
}
