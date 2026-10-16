export interface IRelayTransport {
  isOpen: () => boolean;
  send: (message: string) => void;
  close: () => void;
}

export interface IRelayTransportEvents {
  onOpen: () => void;
  onMessage: (data: unknown) => void;
  onClose: (code: number) => void;
  onError: () => void;
}

export function openRelayTransport(url: string, events: IRelayTransportEvents): IRelayTransport {
  const socket = new WebSocket(url);
  socket.onopen = events.onOpen;
  socket.onmessage = (event) => events.onMessage(event.data);
  socket.onclose = (event) => events.onClose(event.code ?? 1006);
  socket.onerror = events.onError;
  return {
    isOpen: () => socket.readyState === WebSocket.OPEN,
    send: (message) => socket.send(message),
    close: () => {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onclose = null;
      socket.onerror = null;
      socket.close();
    },
  };
}
