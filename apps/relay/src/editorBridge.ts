import { HttpError, randomId } from "./security.ts";

interface IEditorSocket {
  readyState: number;
  send(message: string): void;
}
interface IPending {
  socket: IEditorSocket;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class EditorBridge {
  private pending = new Map<string, IPending>();
  constructor(
    private hosts: () => IEditorSocket[],
    private timeoutMs = 30_000,
  ) {}

  async call(command: string, args: Record<string, unknown>): Promise<unknown> {
    if (this.pending.size >= 8)
      throw new HttpError(429, "The editor already has 8 pending requests");
    const socket = this.hosts().find((item) => item.readyState === WebSocket.OPEN);
    if (!socket) throw new HttpError(409, "Open Buzzzz Studio with this room to use this tool");
    if (new TextEncoder().encode(JSON.stringify(args)).byteLength > 65536)
      throw new HttpError(413, "Editor arguments exceed 64 KiB");
    const requestId = randomId();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new HttpError(504, "The open editor did not answer within 30 seconds"));
      }, this.timeoutMs);
      this.pending.set(requestId, { socket, resolve, reject, timer });
      try {
        socket.send(JSON.stringify({ type: "editor-command", requestId, command, args }));
      } catch {
        this.disconnected(socket);
      }
    });
  }

  receive(socket: IEditorSocket, input: Record<string, unknown>): void {
    if (typeof input.requestId !== "string" || !/^[a-f0-9]{32}$/.test(input.requestId))
      throw new HttpError(400, "Invalid editor request ID");
    const pending = this.pending.get(input.requestId);
    if (!pending && this.hosts().includes(socket)) return;
    if (!pending || pending.socket !== socket)
      throw new HttpError(403, "Editor result is not assigned to this connection");
    const hasError = Object.hasOwn(input, "error");
    if (
      hasError === Object.hasOwn(input, "result") ||
      (hasError && (typeof input.error !== "string" || input.error.length > 1024))
    )
      throw new HttpError(400, "Expected exactly one editor result or error");
    if (new TextEncoder().encode(JSON.stringify(input)).byteLength > 1024 * 1024)
      throw new HttpError(413, "Editor result exceeds 1 MiB");
    this.pending.delete(input.requestId);
    clearTimeout(pending.timer);
    if (typeof input.error === "string") pending.reject(new HttpError(400, input.error));
    else pending.resolve(input.result);
  }

  disconnected(socket: IEditorSocket): void {
    for (const [id, pending] of this.pending) {
      if (pending.socket !== socket) continue;
      clearTimeout(pending.timer);
      this.pending.delete(id);
      pending.reject(new HttpError(409, "The editor disconnected. Open Buzzzz Studio and retry"));
    }
  }
}
