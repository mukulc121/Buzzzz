import type { IActivityEntry } from "./useActivityLog";

interface IActivityPanel {
  entries: IActivityEntry[];
}

export function ActivityPanel(props: IActivityPanel) {
  const { entries } = props;
  return (
    <section className="card grow-card">
      <header className="card-head">
        <h3>Activity</h3>
      </header>
      {entries.length ? (
        <ul className="log">
          {entries.map((l) => (
            <li key={l.id}>
              <time>{l.time}</time>
              {l.text}
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint">Triggers fired here or on the phone show up here.</p>
      )}
    </section>
  );
}
