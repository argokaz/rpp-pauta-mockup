import { CURRENT_VERSION, versionHistory } from "@/data/version-history";

type VersionHistoryModalProps = {
  onClose: () => void;
};

export function VersionHistoryModal({ onClose }: VersionHistoryModalProps) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal version-history-modal" role="dialog" aria-modal="true" aria-labelledby="version-history-title">
        <header>
          <div><span>RPP Pauta · versión actual {CURRENT_VERSION}</span><h2 id="version-history-title">Historial de versiones</h2></div>
          <button onClick={onClose}>Cerrar</button>
        </header>
        <div className="version-history-list">
          {versionHistory.map((entry, index) => (
            <article className={index === 0 ? "current" : ""} key={entry.version}>
              <div className="version-marker" aria-hidden="true" />
              <div className="version-entry">
                <header>
                  <div><strong>v{entry.version}</strong>{index === 0 && <span>Actual</span>}</div>
                  <time dateTime={entry.date}>{new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${entry.date}T12:00:00Z`))}</time>
                </header>
                <h3>{entry.title}</h3>
                <ul>{entry.changes.map((change) => <li key={change}>{change}</li>)}</ul>
              </div>
            </article>
          ))}
        </div>
        <footer><button onClick={onClose}>Cerrar historial</button></footer>
      </section>
    </div>
  );
}
