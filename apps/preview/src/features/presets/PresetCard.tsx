import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Icon } from "../../components/Icon";
import { ThemedText } from "../../components/ThemedText";
import { colors } from "../../theme/colors";
import { useFavourites } from "./useFavourites";
import type { IPresetConfig } from "./presetsConfig";

const IMAGE_HEIGHT = 160;
interface IPresetCard {
  preset: IPresetConfig;
  compact: boolean;
}
export function PresetCard(props: IPresetCard) {
  const { preset, compact } = props;
  const { name, description, tags, image, play } = preset;
  const duration = preset.duration || 20;
  const source = Image.resolveAssetSource(image);
  const ratio = source?.width && source?.height ? source.width / source.height : undefined;
  const imageWidth = ratio ? IMAGE_HEIGHT * ratio : undefined;
  // Each chart spans one second; shorter presets only sweep part of it.
  const effectiveRatio = Math.min(1, duration / 1000);
  const { isFavourite, toggleFavourite } = useFavourites();
  const favourite = isFavourite(name);
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const progress = useSharedValue(0);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  useAnimatedReaction(
    () => progress.get(),
    (current) => {
      if (imageWidth && viewportWidth > 0 && current > 0) {
        const indicator = current * effectiveRatio * imageWidth;
        scrollTo(scrollRef, Math.max(0, indicator - viewportWidth / 2), 0, false);
      }
    },
  );
  const reset = () => {
    setIsPlaying(false);
    progress.set(withTiming(0, { duration: 200 }));
    scrollRef.current?.scrollTo({ x: 0, animated: true });
  };
  const handlePress = () => {
    if (isPlaying) return reset();
    setIsPlaying(true);
    play();
    progress.set(0);
    progress.set(withTiming(1, { duration, easing: Easing.linear }));
    setTimeout(reset, duration);
  };
  const indicatorStyle = useAnimatedStyle(() => ({
    left: progress.get() * effectiveRatio * (imageWidth ?? 1000),
  }));
  const heart = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${favourite ? "Unfavourite" : "Favourite"} ${name}`}
      onPress={() => toggleFavourite(name)}
      hitSlop={8}
      style={compact && styles.compactHeartButton}
    >
      <Icon name={favourite ? "heart-fill" : "heart"} size={22} color={colors.navy} />
    </Pressable>
  );
  if (compact)
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Play ${name}`}
        onPress={handlePress}
      >
        <Card style={styles.cardCompact}>
          <View style={styles.compactContainer}>
            <View style={styles.compactInfo}>
              <View style={styles.tagsContainerCompact}>
                {tags.map((tag) => (
                  <View key={tag} style={styles.tagCompact}>
                    <Text style={styles.tagTextCompact}>{tag}</Text>
                  </View>
                ))}
              </View>
              <ThemedText type="subtitle" style={styles.titleCompact}>
                {name}
              </ThemedText>
            </View>
            {heart}
            <Text style={styles.compactPlayIcon}>{isPlaying ? "■" : "▶"}</Text>
          </View>
        </Card>
      </Pressable>
    );
  return (
    <Card style={styles.card}>
      <View style={styles.container}>
        <View style={styles.tagsRow}>
          <View style={styles.tagsContainer}>
            {tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
          {heart}
        </View>
        <ThemedText type="subtitle" style={styles.title}>
          {name}
        </ThemedText>
        <ThemedText style={styles.description}>{description}</ThemedText>
        <View style={styles.border} onLayout={(e) => setViewportWidth(e.nativeEvent.layout.width)}>
          <Animated.ScrollView
            ref={scrollRef}
            horizontal
            bounces={false}
            style={styles.imagesScroll}
            contentContainerStyle={styles.imagesContent}
          >
            <View style={{ position: "relative", height: IMAGE_HEIGHT, width: imageWidth }}>
              <Image
                source={image}
                style={[styles.image, imageWidth ? { width: imageWidth } : undefined]}
                resizeMode="contain"
              />
              {isPlaying && <Animated.View style={[styles.playIndicator, indicatorStyle]} />}
            </View>
          </Animated.ScrollView>
        </View>
        <Button
          label={isPlaying ? "Stop" : "Play"}
          accessibilityLabel={`${isPlaying ? "Stop" : "Play"} ${name}`}
          showIcon={isPlaying ? "stop" : "play"}
          onClick={handlePress}
          disableHaptics
        />
      </View>
    </Card>
  );
}
const tag = { borderRadius: 999, backgroundColor: colors.tag } as const;
const styles = StyleSheet.create({
  card: { paddingVertical: 15 },
  container: { gap: 5 },
  tagsContainer: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { ...tag, paddingHorizontal: 10, paddingVertical: 5 },
  tagText: { fontSize: 14, color: colors.navy, fontWeight: "500" },
  title: { marginTop: 6 },
  description: { fontSize: 14 },
  border: { borderWidth: 1, borderColor: colors.grid, marginTop: 8 },
  imagesScroll: { height: 180 },
  imagesContent: { height: 180, alignItems: "center", paddingHorizontal: 5 },
  image: { height: IMAGE_HEIGHT, paddingHorizontal: 5 },
  tagsRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  compactHeartButton: { marginLeft: 10 },
  cardCompact: { paddingVertical: 10 },
  compactContainer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  compactInfo: { flex: 1, gap: 4 },
  tagsContainerCompact: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  tagCompact: { ...tag, paddingHorizontal: 8, paddingVertical: 2 },
  tagTextCompact: { fontSize: 12, color: colors.navy, fontWeight: "500" },
  titleCompact: { marginTop: 2 },
  compactPlayIcon: { fontSize: 18, color: colors.navy, marginLeft: 10, width: 15 },
  playIndicator: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.navy,
    boxShadow: "0px 0px 4px rgba(91, 185, 224, 0.8)",
    pointerEvents: "none",
  },
});
