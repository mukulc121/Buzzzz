import { Stack } from "expo-router";
import { AppProviders } from "../features/shell/AppProviders";

export default function RootLayout() {
  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="editConnectionModal"
          options={{ presentation: "modal", title: "Connection", headerShown: false }}
        />
        <Stack.Screen name="filtersModal" options={{ presentation: "modal", title: "Filters" }} />
        <Stack.Screen name="tagsModal" options={{ presentation: "modal", title: "Tags" }} />
        <Stack.Screen name="playgroundModal" options={{ presentation: "modal" }} />
        <Stack.Screen name="playgroundSettingsModal" options={{ presentation: "modal" }} />
        <Stack.Screen
          name="mediaLibraryModal"
          options={{ presentation: "modal", title: "Haptics library" }}
        />
      </Stack>
    </AppProviders>
  );
}
