import type { ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";
import { useFonts } from "expo-font";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import { DefaultTheme, ThemeProvider } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { FavouritesProvider } from "../presets/FavouritesProvider";
import { FilterProvider } from "../presets/FilterProvider";
import { PreviewProvider } from "./PreviewProvider";

const theme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    primary: "rgba(0, 26, 114, 1)",
    background: "rgba(225, 243, 250, 1)",
    card: "rgba(255, 255, 255, 1)",
    text: "rgba(43, 133, 171, 1)",
    border: "rgba(216, 216, 216, 1)",
    notification: "rgba(255, 59, 48, 1)",
  },
};
interface IAppProviders {
  children: ReactNode;
}
export function AppProviders(props: IAppProviders) {
  const { children } = props;
  const [loaded, error] = useFonts({
    "pulsar-icons": require("../../../assets/icons/pulsar-icons.ttf"),
  });
  if (!loaded && !error)
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <ThemeProvider value={theme}>
          <FilterProvider>
            <FavouritesProvider>
              <PreviewProvider>{children}</PreviewProvider>
            </FavouritesProvider>
          </FilterProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
