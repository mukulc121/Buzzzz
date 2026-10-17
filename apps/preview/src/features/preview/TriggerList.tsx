import { ScrollView, Text, View } from "react-native";
import { TriggerChip } from "../../components/TriggerChip";
import type { Theme } from "../../theme/colors";
import type { usePreviewSession } from "./usePreviewSession";
import { previewStyles } from "./previewStyles";
import { deriveTriggerRole } from "./triggerRole";

interface ITriggerList {
  session: ReturnType<typeof usePreviewSession>;
  t: Theme;
}
export function TriggerList(props: ITriggerList) {
  const { session, t } = props;
  if (!session.triggers.length) return null;
  const s = previewStyles(t);
  return (
    <View style={s.triggers}>
      <Text style={s.section}>Triggers · tap to fire</Text>
      <ScrollView
        horizontal
        style={s.chipScroll}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chips}
      >
        {session.triggers.map((name) => (
          <TriggerChip
            key={name}
            name={name}
            role={deriveTriggerRole(name, session.mappedNames, session.riv?.riveConfig)}
            t={t}
            firedAt={session.lastFired?.name === name ? session.lastFired.id : 0}
            onPress={() => session.fireRef.current(name)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
