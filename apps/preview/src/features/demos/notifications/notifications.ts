import type { Presets } from "react-native-pulsar";

interface INotification {
  id: string;
  title: string;
  message: string;
  color: string;
  glyph: number;
  preset: keyof typeof Presets;
}

export const NOTIFICATION_STEP_MS = 1000;
export const NOTIFICATIONS = [
  {
    id: "success",
    title: "Success",
    message: "Payment received successfully",
    color: "rgba(16, 185, 129, 1)",
    glyph: 61982,
    preset: "stamp",
  },
  {
    id: "alert",
    title: "Alert",
    message: "Low battery warning",
    color: "rgba(245, 158, 11, 1)",
    glyph: 63016,
    preset: "peal",
  },
  {
    id: "message",
    title: "Message",
    message: "You have a new message",
    color: "rgba(59, 130, 246, 1)",
    glyph: 62512,
    preset: "chime",
  },
  {
    id: "error",
    title: "Error",
    message: "Connection failed",
    color: "rgba(239, 68, 68, 1)",
    glyph: 62027,
    preset: "buzz",
  },
  {
    id: "reminder",
    title: "Reminder",
    message: "Meeting starts in 15 minutes",
    color: "rgba(139, 92, 246, 1)",
    glyph: 61708,
    preset: "swell",
  },
] satisfies INotification[];

export type Notification = (typeof NOTIFICATIONS)[number];

export function notificationAt(elapsed: number) {
  if (elapsed < 0) return null;
  return NOTIFICATIONS[Math.floor(elapsed / NOTIFICATION_STEP_MS)] ?? null;
}
