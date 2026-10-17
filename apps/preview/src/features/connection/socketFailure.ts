export function socketFailure(props: { code: number; opened: boolean }): string | null {
  const { code, opened } = props;
  if (code === 4401) return "This phone’s access ended or expired. Pair again in Studio.";
  if (code === 1008)
    return "Studio rejected this connection. Check the pairing link and try again.";
  if (code === 4429) return "Too many requests. Wait a moment, then reconnect to Studio.";
  return opened ? null : "Couldn’t reach Studio. Check the address and your network.";
}

export function reconnectDelay(attempt: number): number {
  return Math.min(1500 * 2 ** Math.min(attempt, 5), 30000);
}
