import { useState } from "react";
import { View } from "react-native";
import { Pressable, ScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronRight } from "lucide-react-native";
import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { ThemedText } from "../../components/ThemedText";
import { colors } from "../../theme/colors";
import { LibraryScrubber } from "./LibraryScrubber";
import { PatternCanvas } from "./PatternCanvas";
import { ResourceRow } from "./ResourceRow";
import { LottieCanvas } from "./LottieCanvas";
import { libraryStyles as styles } from "./libraryStyles";
import type { ICachedResource } from "./mediaModel";

interface IMediaLibraryScreen {
  connectionName: string;
  available: boolean;
  records: readonly ICachedResource[];
  active: ICachedResource | null;
  localUri?: string;
  clipMissing?: boolean;
  downloading?: boolean;
  downloadProgress?: number;
  positionMs: number;
  playing: boolean;
  statusText: string;
  syncing: boolean;
  syncError: string | null;
  disabled?: boolean;
  error?: boolean;
  onRefresh: () => void;
  onClose: () => void;
  onTogglePlay: () => void;
  onStop: () => void;
  onPlay: (resourceId: string) => void;
  onDelete: (resourceId: string) => void;
  onScrub: (timeMs: number | null) => void;
  onSeek: (timeMs: number) => void;
}

export function MediaLibraryScreen(props: IMediaLibraryScreen) {
  const {
    connectionName,
    available,
    records,
    active,
    localUri,
    clipMissing = false,
    downloading = false,
    downloadProgress = 0,
    positionMs,
    playing,
    statusText,
    syncing,
    syncError,
    disabled = false,
    error = false,
    onRefresh,
    onClose,
    onTogglePlay,
    onStop,
    onPlay,
    onDelete,
    onScrub,
    onSeek,
  } = props;
  const [expanded, setExpanded] = useState(true);
  const [scrubbedTo, setScrubbedTo] = useState<number | null>(null);
  const shownPosition = scrubbedTo ?? positionMs;
  const stopped = !playing && positionMs === 0;
  const progress = downloading
    ? downloadProgress
    : active && active.durationMs > 0
      ? shownPosition / active.durationMs
      : 0;
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText type="subtitle">Haptics library</ThemedText>
          <ThemedText style={styles.subtitle} numberOfLines={1}>
            {connectionName || "Connection"}
          </ThemedText>
        </View>
        {available && (
          <Pressable
            testID="library-refresh"
            onPress={onRefresh}
            disabled={syncing}
            hitSlop={8}
            style={styles.headerButton}
            accessibilityRole="button"
            accessibilityLabel="Get the latest names from Studio"
            accessibilityState={{ disabled: syncing }}
          >
            <Icon name="refresh-cw" size={22} color={syncing ? colors.disabled : colors.navy} />
          </Pressable>
        )}
        <Pressable
          onPress={onClose}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Icon name="x" size={28} color={colors.navy} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!available ? (
          <ThemedText>This connection is no longer available.</ThemedText>
        ) : (
          <>
            {active && (
              <>
                {clipMissing && (
                  <View style={styles.notice}>
                    <ThemedText style={styles.meta}>
                      {active.kind === "audio" ? "The audio clip" : "The animation"} is no longer on
                      this device — the haptics still play. Send it from Studio again to restore it.
                    </ThemedText>
                  </View>
                )}
                {active.kind === "animation" && localUri && !clipMissing && (
                  <LottieCanvas uri={localUri} progress={progress} />
                )}
                {active.kind === "pattern" && (
                  <PatternCanvas
                    pattern={active.pattern}
                    durationMs={active.durationMs}
                    progress={progress}
                  />
                )}
                <ThemedText type="defaultSemiBold" numberOfLines={1}>
                  {active.name}
                </ThemedText>
                <View style={styles.spaceTop}>
                  <LibraryScrubber
                    positionMs={positionMs}
                    durationMs={active.durationMs}
                    disabled={disabled || error}
                    onScrub={(time) => {
                      setScrubbedTo(time);
                      onScrub(time);
                    }}
                    onSeek={onSeek}
                  />
                </View>
                <ThemedText style={styles.meta}>{statusText}</ThemedText>
                {!error && (
                  <View style={styles.transport}>
                    <Button
                      label={playing ? "Pause" : "Play"}
                      showIcon={playing ? "stop" : "play"}
                      style={styles.transportPrimary}
                      disableHaptics
                      enabled={!disabled}
                      onClick={onTogglePlay}
                    />
                    <Pressable
                      onPress={onStop}
                      disabled={stopped || disabled}
                      style={[styles.stopButton, (stopped || disabled) && styles.disabled]}
                      accessibilityRole="button"
                      accessibilityLabel="Stop"
                      accessibilityState={{ disabled: stopped || disabled }}
                    >
                      <Icon name="square" size={20} color={colors.red} />
                    </Pressable>
                  </View>
                )}
              </>
            )}
            {syncError && (
              <View style={styles.notice}>
                <ThemedText style={styles.meta}>{syncError}</ThemedText>
              </View>
            )}
            <View style={active || syncError ? styles.savedSection : undefined}>
              <Pressable
                onPress={() => setExpanded((value) => !value)}
                style={styles.savedHeading}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                accessibilityLabel={`Saved on this device (${records.length})`}
              >
                <ChevronRight
                  size={18}
                  color={colors.navy}
                  style={{ transform: [{ rotate: expanded ? "90deg" : "0deg" }] }}
                />
                <ThemedText type="defaultSemiBold">
                  Saved on this device ({records.length})
                </ThemedText>
              </Pressable>
              {expanded && (
                <View style={styles.savedContent}>
                  {records.length ? (
                    records.map((record) => (
                      <ResourceRow
                        key={record.resourceId}
                        record={record}
                        active={active?.resourceId === record.resourceId}
                        onPlay={() => onPlay(record.resourceId)}
                        onDelete={() => onDelete(record.resourceId)}
                      />
                    ))
                  ) : (
                    <ThemedText style={[styles.meta, styles.spaceTop]}>
                      Nothing yet. Play a preset from Studio and it appears here.
                    </ThemedText>
                  )}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
