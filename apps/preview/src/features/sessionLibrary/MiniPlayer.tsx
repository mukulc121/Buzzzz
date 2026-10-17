import { View } from "react-native";
import { Pressable } from "react-native-gesture-handler";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { Icon } from "../../components/Icon";
import { ThemedText } from "../../components/ThemedText";
import { colors } from "../../theme/colors";
import { libraryStyles as styles } from "./libraryStyles";
import type { ICachedResource } from "./mediaModel";

interface IMiniPlayer {
  record: ICachedResource | null;
  visible: boolean;
  playing: boolean;
  disabled: boolean;
  error?: boolean;
  downloading?: boolean;
  statusText: string;
  progress: number;
  bottomInset: number;
  onOpen: () => void;
  onTogglePlay: () => void;
  onDismiss: () => void;
}

export function MiniPlayer(props: IMiniPlayer) {
  const {
    record,
    visible,
    playing,
    disabled,
    error = false,
    downloading = false,
    statusText,
    progress,
    bottomInset,
    onOpen,
    onTogglePlay,
    onDismiss,
  } = props;
  if (!visible || !record) return null;
  return (
    <Animated.View
      entering={FadeInDown}
      exiting={FadeOutDown}
      style={[styles.miniWrap, { bottom: bottomInset + 64 }]}
    >
      <Pressable
        onPress={onOpen}
        style={styles.miniCard}
        accessibilityRole="button"
        accessibilityLabel={`Open ${record.name}`}
      >
        <View style={styles.miniMain}>
          <View style={styles.miniHeader}>
            <Icon name={downloading ? "download" : "play"} size={16} color={colors.navy} />
            <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.miniTitle}>
              {record.name}
            </ThemedText>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.max(0, Math.min(1, progress)) * 100}%`,
                  backgroundColor: colors.navy,
                },
              ]}
            />
          </View>
          <ThemedText style={[styles.miniStatus, error && styles.errorStatus]} numberOfLines={1}>
            {statusText}
          </ThemedText>
        </View>
        {!disabled && !error && (
          <Pressable
            onPress={onTogglePlay}
            hitSlop={8}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel={playing ? "Pause" : "Play"}
          >
            <Icon name={playing ? "stop" : "play"} size={20} color={colors.navy} />
          </Pressable>
        )}
        <Pressable
          onPress={onDismiss}
          hitSlop={8}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        >
          <Icon name="x" size={22} color={colors.red} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}
