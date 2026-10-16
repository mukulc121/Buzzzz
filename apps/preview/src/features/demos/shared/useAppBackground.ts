import { useEffect, useEffectEvent } from "react";
import { AppState } from "react-native";

export function useAppBackground(onBackground: () => void) {
  const handle = useEffectEvent(onBackground);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") handle();
    });
    return () => sub.remove();
  }, []);
}
