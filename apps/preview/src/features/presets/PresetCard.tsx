import { Text, View } from "react-native";
import { Heart, Play } from "lucide-react-native";
import type { pulsarPresets } from "@buzzzz/core/presets";
import { Panel } from "../../components/Panel";
import { PressableScale } from "../../components/PressableScale";
import { OutlineButton } from "../../components/OutlineButton";
import { PatternWaveform } from "../playback/PatternWaveform";
import type { Theme } from "../../theme/colors";
import { font } from "../../theme/typography";

interface IPresetCard {
  preset: (typeof pulsarPresets)[number];
  favorite: boolean;
  onFavorite: () => void;
  onPlay: () => void;
  t: Theme;
}
export function PresetCard(props: IPresetCard) {
  const { preset, favorite, onFavorite, onPlay, t } = props;
  return (
    <Panel t={t} style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {preset.tags.map((tag) => (
            <Text
              key={tag}
              style={{
                color: t.fg,
                backgroundColor: t.sunken,
                fontFamily: font.medium,
                fontSize: 12,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
              }}
            >
              {tag}
            </Text>
          ))}
        </View>
        <PressableScale
          onPress={onFavorite}
          accessibilityLabel={`${favorite ? "Unfavorite" : "Favorite"} ${preset.name}`}
          style={{ minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center" }}
        >
          <Heart size={22} color={t.fg} fill={favorite ? t.highlight : "none"} />
        </PressableScale>
      </View>
      <Text accessibilityRole="header" style={{ color: t.fg, fontFamily: font.bold, fontSize: 20 }}>
        {preset.name}
      </Text>
      <Text style={{ color: t.fg, fontFamily: font.regular, fontSize: 15, lineHeight: 22 }}>
        {preset.description}
      </Text>
      <PatternWaveform pattern={preset.pattern} t={t} />
      <OutlineButton
        title="Play preset"
        accessibilityLabel={`Play ${preset.name}`}
        onPress={onPlay}
        icon={<Play size={20} color={t.fg} />}
        t={t}
      />
    </Panel>
  );
}
