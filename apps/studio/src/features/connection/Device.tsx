import { useState } from "react";
import { Copy } from "../../components/icons";
import type { IRoom } from "./cloud";
import { usePairing } from "./usePairing";

interface IDevice {
  phones: number;
  room?: IRoom | null;
}
export function Device(props: IDevice) {
  const { phones, room = null } = props;
  const { url, qr, error, code, loading, renew } = usePairing(room, phones);
  const [showQr, setShowQr] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  return (
    <section className="card">
      <header className="card-head">
        <h3>Phone</h3>
        <span className={phones ? "status on" : "status"}>
          <i className="dot" />
          {phones ? `${phones} connected` : "Waiting"}
        </span>
      </header>
      {phones > 0 && (
        <button
          className="link"
          onClick={() => {
            if (!showQr) renew();
            setShowQr(!showQr);
          }}
        >
          {showQr ? "Hide pairing code" : "Pair another phone"}
        </button>
      )}
      {error && (
        <p className="hint" role="status">
          {error}
        </p>
      )}
      {(!phones || showQr) && !error && (
        <div className="pair">
          <div className="pair-guide">
            {qr ? (
              <img
                className="qr"
                src={qr}
                alt="QR code that pairs Haptics Preview with this editor"
              />
            ) : (
              <div className="qr skeleton" />
            )}
            {room && (
              <div className="pair-code" aria-label="Pairing code">
                {code ?? "…"}
              </div>
            )}
            <ol className="steps">
              <li>
                {room
                  ? "Open Buzzzz Preview on your phone"
                  : "Join the same Wi-Fi as this computer"}
              </li>
              <li>Scan the pairing QR code</li>
            </ol>
          </div>
          <div className="relay-address">
            {room && (
              <button disabled={loading} onClick={renew}>
                Refresh pairing code
              </button>
            )}
            <div className="relay-address-head">
              <label htmlFor="relay-url">Or paste this address in the app</label>
              <button
                className="icon"
                aria-label="Copy relay address"
                onClick={() =>
                  void navigator.clipboard
                    .writeText(url)
                    .then(() => setCopyStatus("Address copied"))
                    .catch(() => setCopyStatus("Select the address to copy it manually"))
                }
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
                value={url}
                onFocus={(event) => event.currentTarget.select()}
              />
            </div>
            <span className="hint" role="status">
              {copyStatus}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
