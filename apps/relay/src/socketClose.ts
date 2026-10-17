export function socketCloseCode(code: number): number {
  if (!Number.isInteger(code)) return 1000;
  if (
    (code >= 1000 && code <= 1014 && ![1004, 1005, 1006].includes(code)) ||
    (code >= 3000 && code <= 4999)
  )
    return code;
  return 1000;
}

export function closeSocket(socket: WebSocket, code: number, reason: string): void {
  let message = "";
  let length = 0;
  for (const letter of reason) {
    length += new TextEncoder().encode(letter).byteLength;
    if (length > 123) break;
    message += letter;
  }
  try {
    socket.close(socketCloseCode(code), message);
  } catch {
    /* Peer already disconnected. */
  }
}
