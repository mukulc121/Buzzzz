import { SafeAreaView } from "react-native-safe-area-context";
import { DemosScreen } from "../../../features/demos/DemosScreen";
import { usePreview } from "../../../features/shell/usePreview";
export default function DemosRoute() {
  const { t } = usePreview();
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: t.bg }}>
      <DemosScreen t={t} />
    </SafeAreaView>
  );
}
