import { Stack } from "expo-router";
import { AppProviders } from "../features/shell/AppProviders";
export default function RootLayout() {
  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="mediaLibraryModal"
          options={{ presentation: "modal", title: "Haptics library" }}
        />
      </Stack>
    </AppProviders>
  );
}
