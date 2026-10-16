import { View } from "react-native";
import { Pressable } from "react-native-gesture-handler";
import { Card } from "../../components/Card";
import { Icon } from "../../components/Icon";
import { ThemedText } from "../../components/ThemedText";
import { colors } from "../../theme/colors";
import { formatLibraryTime } from "./canvasGeometry";
import { libraryStyles as styles } from "./libraryStyles";
import type { ICachedPattern } from "./model";

interface IResourceRow {
  record: ICachedPattern;
  active: boolean;
  onPlay: () => void;
  onDelete: () => void;
}

export function ResourceRow(props: IResourceRow) {
  const { record, active, onPlay, onDelete } = props;
  return (
    <Card style={[styles.resourceCard, active && styles.resourceCardActive]}>
      <View style={styles.resourceRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Play ${record.name}`}
          accessibilityState={{ selected: active }}
          onPress={onPlay}
          style={({ pressed }) => [styles.pressArea, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Icon name="record" size={18} color={colors.navy} />
          <View style={styles.resourceInfo}>
            <ThemedText type="defaultSemiBold" numberOfLines={1}>
              {record.name}
            </ThemedText>
            <ThemedText style={styles.meta} numberOfLines={1}>
              Pattern · {formatLibraryTime(record.durationMs)}
            </ThemedText>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete"
          hitSlop={8}
          onPress={onDelete}
          style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.2 : 1 }]}
        >
          <Icon name="x" size={22} color={colors.red} />
        </Pressable>
      </View>
    </Card>
  );
}
