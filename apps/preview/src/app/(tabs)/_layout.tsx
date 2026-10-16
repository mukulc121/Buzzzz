import { Tabs } from "expo-router";
import { TabIcon } from "../../features/shell/TabIcon";
import { Presets } from "react-native-pulsar";
import { usePreview } from "../../features/shell/usePreview";

export default function TabsLayout() {
  const { fullscreen } = usePreview();
  return (
    <Tabs
      detachInactiveScreens={false}
      screenListeners={{ tabPress: () => Presets.System.impactLight() }}
      screenOptions={{
        headerShown: false,
        lazy: false,
        freezeOnBlur: false,
        tabBarStyle: fullscreen ? { display: "none" } : undefined,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="presets"
        options={{
          title: "Presets",
          tabBarIcon: ({ focused }) => <TabIcon name="list" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="playground"
        options={{
          title: "Playground",
          tabBarIcon: ({ focused }) => <TabIcon name="brush" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="demos"
        options={{
          title: "Demos",
          tabBarIcon: ({ focused }) => <TabIcon name="sparkles" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="preview"
        options={{
          title: "Preview",
          tabBarIcon: ({ focused }) => <TabIcon name="preview" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
