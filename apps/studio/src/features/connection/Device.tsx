import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy } from "../../components/icons";
import { isRecord } from "@buzzzz/core";

interface IDevice {
  phones: number;
}
export function Device(props: IDevice) {
  const { phones } = props;
  const [wsUrl, setWsUrl] = useState("");
  const [qr, setQr] = useState("");
  const [showQr, setShowQr] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "manual">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadPairingCode() {
      try {
        const response = await fetch("/lan", { signal: controller.signal });
        if (!response.ok) throw new Error("Pairing is available with bun run dev");
        const data: unknown = await response.json();
        if (!isRecord(data) || typeof data.ip !== "string" || typeof data.port !== "number")
          throw new Error("Could not load pairing details");
        const url = `ws://${data.ip}:${data.port}/relay`;
        const image = await QRCode.toDataURL(
          `rivehaptics://connect?url=${encodeURIComponent(url)}`,
          { margin: 1, width: 320 },
        );
        if (!controller.signal.aborted) {
          setWsUrl(url);
          setQr(image);
        }
      } catch (error) {
        if (!controller.signal.aborted)
          setError(error instanceof Error ? error.message : "Could not load pairing code");
      }
    }
    void loadPairingCode();
    return () => controller.abort();
  }, []);

  const open = !phones || showQr;
  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(wsUrl);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("manual");
    }
  };
  return (
    <section className="card">
      <header className="card-head">
        <h3>Phone</h3>
        <span className={phones ? "status on" : "status"}>
          <i className="dot" key={phones ? "on" : "off"} />
          {phones ? `${phones} connected` : "Waiting"}
        </span>
      </header>
      {phones > 0 && (
        <button className="link" onClick={() => setShowQr((s) => !s)}>
          {showQr ? "Hide pairing code" : "Pair another phone"}
        </button>
      )}
      {error && (
        <p className="hint" role="status">
          {error}
        </p>
      )}
      {open && !error && (
        <div className="pair">
          <div className="pair-guide">
            {qr ? (
              <img className="qr" src={qr} alt="QR code that opens Haptics Preview on this relay" />
            ) : (
              <div className="qr skeleton" />
            )}
            <ol className="steps">
              <li>Join the same Wi-Fi as this Mac</li>
              <li>Scan with the iPhone camera</li>
            </ol>
          </div>
          <div className="relay-address">
            <div className="relay-address-head">
              <label htmlFor="relay-url">Or paste this address in the app</label>
              <button
                className="icon"
                onClick={() => void copyAddress()}
                aria-label="Copy relay address"
                title="Copy relay address"
              >
                <Copy />
              </button>
            </div>
            <div className="relay-address-row">
              <input
                id="relay-url"
                className="relay-url"
                aria-label="Relay address"
                readOnly
                value={wsUrl}
                onFocus={(event) => event.currentTarget.select()}
              />
            </div>
            <span className="hint" role="status">
              {copyStatus === "copied"
                ? "Address copied"
                : copyStatus === "manual"
                  ? "Select the address to copy it manually"
                  : ""}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
