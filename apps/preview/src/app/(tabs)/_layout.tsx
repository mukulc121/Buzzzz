import { Tabs } from "expo-router";
import { BottomTabs } from "../../features/shell/BottomTabs";
export default function TabsLayout() {
  return (
    <Tabs
      detachInactiveScreens={false}
      tabBar={(props) => <BottomTabs {...props} />}
      screenOptions={{ headerShown: false, lazy: false, freezeOnBlur: false }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="presets" options={{ title: "Presets" }} />
      <Tabs.Screen name="playground" options={{ title: "Playground" }} />
      <Tabs.Screen name="demos" options={{ title: "Demos" }} />
      <Tabs.Screen name="preview" options={{ title: "Preview" }} />
    </Tabs>
  );
}
