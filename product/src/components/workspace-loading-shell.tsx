import Image from "next/image";

const loadingViews = [
  { code: "A", label: "Agenda", description: "Programación semanal" },
  { code: "B", label: "Mesa", description: "Kanban editorial" },
  { code: "C", label: "Programa", description: "Editar mi pauta" },
  { code: "D", label: "Recepción", description: "Pegar y ordenar" },
  { code: "E", label: "Post", description: "Registrar lo emitido" },
];

export function WorkspaceLoadingShell() {
  return (
    <main className="product-shell workspace-loading-shell" aria-busy="true" aria-label="Cargando pauta editorial">
      <header className="mode-switcher">
        <div className="switcher-brand"><Image src="/rpp-logo.svg" alt="RPP" width={38} height={38} priority /><span><strong>Pauta RPP</strong><small>Informativos</small></span></div>
        <nav aria-label="Vistas de trabajo">
          {loadingViews.map((view, index) => (
            <div className={index === 0 ? "loading-mode active" : "loading-mode"} key={view.code}>
              <b>{view.code}</b><span><strong>{view.label}</strong><small>{view.description}</small></span>
            </div>
          ))}
        </nav>
        <div className="switcher-account"><span>Preparando equipo</span><b className="loading-avatar" /></div>
      </header>

      <div className="app-shell">
        <aside className="sidebar loading-sidebar" aria-hidden="true">
          <div className="brand"><Image src="/rpp-logo.svg" alt="" width={48} height={48} priority /><div><strong>Pauta</strong><small>Informativos</small></div></div>
          <div className="loading-sidebar-line wide" />
          <div className="loading-sidebar-line active" />
          <div className="loading-sidebar-line" />
          <div className="loading-sidebar-line" />
          <div className="loading-sidebar-line short" />
        </aside>

        <section className="workspace">
          <header className="topbar">
            <div><span>Programación informativa</span><h1>Semana del 24 al 30 de agosto</h1></div>
            <div className="loading-top-actions"><span className="loading-block loading-search" /><span className="loading-block loading-circle" /></div>
          </header>

          <div className="workspace-body">
            <section className="notices loading-notices" aria-hidden="true">
              <div className="loading-notice loading-notice-primary"><span className="loading-block title" /><span className="loading-block line" /><span className="loading-block line short" /></div>
              <div className="loading-notice"><span className="loading-block title" /><span className="loading-block line" /><span className="loading-block line short" /></div>
            </section>

            <section className="agenda-panel loading-agenda" aria-hidden="true">
              <header className="agenda-toolbar">
                <span className="loading-block loading-week" />
                <div className="loading-days">{Array.from({ length: 7 }, (_, index) => <span className="loading-block" key={index} />)}</div>
                <span className="loading-block loading-action" />
              </header>
              <div className="agenda-layout">
                <div className="timeline-panel">
                  <div className="loading-section-heading"><span className="loading-block title" /><span className="loading-block short" /></div>
                  <div className="loading-rows">
                    {Array.from({ length: 7 }, (_, index) => <div className="loading-row" key={index}><span className="loading-block time" /><span className="loading-block card" /></div>)}
                  </div>
                </div>
                <aside className="editor loading-editor"><span className="loading-block title" /><span className="loading-block field" /><span className="loading-block field large" /></aside>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
