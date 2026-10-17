import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Settings } from "react-native-pulsar";
import { useAppBackground } from "../shared/useAppBackground";
import {
  NOTIFICATIONS,
  NOTIFICATION_STEP_MS,
  notificationAt,
  type Notification,
} from "./notifications";

export function useNotifications() {
  const [notification, setNotification] = useState<Notification | null>(null);
  const [playing, setPlaying] = useState(false);
  const running = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cancel = useCallback(() => {
    clearTimeout(timer.current);
    running.current = false;
    setPlaying(false);
    setNotification(null);
    Settings.stopHaptics();
  }, []);
  useFocusEffect(useCallback(() => cancel, [cancel]));
  useAppBackground(cancel);
  const play = () => {
    if (running.current) return;
    running.current = true;
    setPlaying(true);
    let elapsed = 0;
    const next = () => {
      setNotification(notificationAt(elapsed));
      if (elapsed >= NOTIFICATIONS.length * NOTIFICATION_STEP_MS) {
        running.current = false;
        setPlaying(false);
        return;
      }
      elapsed += NOTIFICATION_STEP_MS;
      timer.current = setTimeout(next, NOTIFICATION_STEP_MS);
    };
    next();
  };
  return { notification, playing, play };
}
