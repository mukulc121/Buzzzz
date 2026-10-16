import { Stack } from "expo-router";
import { DEMOS } from "../../../features/demos/catalog";

export default function DemosLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ headerShown: false, title: "Demos" }} />
      {DEMOS.map((demo) => (
        <Stack.Screen key={demo.slug} name={demo.slug} options={{ title: demo.headerTitle }} />
      ))}
    </Stack>
  );
}
