import { Stack } from "expo-router";
import { AppProviders } from "../features/shell/AppProviders";
export default function RootLayout() {
  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }} />
    </AppProviders>
  );
}
