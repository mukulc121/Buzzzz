import type { Sharing } from "./useSharing";
interface ISharePanel {
  sharing: Sharing;
}
export function SharePanel(props: ISharePanel) {
  const { sharing } = props;
  const { origin, share, busy, copied, create, revoke, copy, canCreate } = sharing;
  return (
    <section className="panel-content">
      <h2>Share project</h2>
      <p className="hint">
        Anyone with this link can view the patterns until the room expires. Changes update the link.
        Revoke it at any time.
      </p>
      {!origin ? (
        <p className="hint">
          Hosted sharing requires the Cloudflare relay. Set VITE_RELAY_URL for your deployment.
        </p>
      ) : share ? (
        <>
          <label className="field">
            Project link
            <input
              aria-label="Shared project link"
              readOnly
              value={share.url}
              onFocus={(event) => event.currentTarget.select()}
            />
          </label>
          <button onClick={() => void copy()}>{copied ? "Copied" : "Copy link"}</button>
          <button onClick={() => void revoke()}>Revoke link</button>
        </>
      ) : (
        <button className="primary" disabled={!canCreate || busy} onClick={() => void create()}>
          {busy ? "Creating link…" : "Create public link"}
        </button>
      )}
      {sharing.previous.length > 0 && (
        <section aria-label="Earlier share links">
          <h3>Earlier links</h3>
          <p className="hint">
            These links stop updating when their original session closes. You can still revoke them.
          </p>
          {sharing.previous.map((item) => (
            <div className="field" key={item.key}>
              <input
                aria-label="Earlier shared project link"
                readOnly
                value={item.url}
                onFocus={(event) => event.currentTarget.select()}
              />
              <button onClick={() => void sharing.revoke(item)}>Revoke earlier link</button>
            </div>
          ))}
        </section>
      )}
    </section>
  );
}
