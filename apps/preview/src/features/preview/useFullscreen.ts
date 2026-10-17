import { useEffect, useState } from "react";
import { BackHandler } from "react-native";

export function useFullscreen() {
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    if (!fullscreen) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      setFullscreen(false);
      return true;
    });
    return () => subscription.remove();
  }, [fullscreen]);
  return { fullscreen, setFullscreen };
}
