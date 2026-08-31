"use client";

import { useEffect, useState } from "react";

type HelpAudience = "superadmin" | "producer";

type HelpTutorialProps = {
  initialAudience: HelpAudience;
  onClose: () => void;
};

type ChapterId = "start" | "superadmin" | "producer" | "pre" | "post" | "status";

type Chapter = {
  id: ChapterId;
  shortLabel: string;
  title: string;
  description: string;
};

const chapters: Chapter[] = [
  { id: "start", shortLabel: "Empezar", title: "Elige el trabajo que necesitas hacer", description: "Pauta RPP cambia el nivel de detalle según tu rol, pero todos trabajan sobre la misma información editorial." },
  { id: "superadmin", shortLabel: "Superadmin", title: "Coordina toda la programación sin perder el detalle", description: "La vista general sirve para detectar pendientes, recibir pautas y entrar al espacio de cualquier programa." },
  { id: "producer", shortLabel: "Producción", title: "Tu programa, tu fecha y la siguiente acción", description: "Producción ve únicamente lo necesario para preparar su emisión y completar lo que realmente salió al aire." },
  { id: "pre", shortLabel: "Pre-pauta", title: "Pega un texto o arma la pauta aquí", description: "Conserva la forma de trabajo del equipo y convierte el contenido en bloques editables, claros y ordenados." },
  { id: "post", shortLabel: "Post-pauta", title: "Registra lo emitido mientras ocurre", description: "La misma escaleta se transforma en un registro histórico sin obligarte a crear otro documento desde cero." },
  { id: "status", shortLabel: "Estado", title: "Qué funciona hoy y qué viene después", description: "El piloto ya cubre el flujo editorial principal. Las integraciones pendientes quedan identificadas para no prometer automatizaciones que aún no existen." },
];

function StartScene() {
  return <svg className="help-scene" viewBox="0 0 560 300" aria-hidden="true">
    <rect className="help-scene-frame" x="20" y="18" width="520" height="264" rx="18" />
    <rect className="help-scene-top" x="20" y="18" width="520" height="44" rx="18" />
    <circle className="help-scene-light" cx="48" cy="40" r="8" />
    <rect className="help-scene-ink" x="70" y="34" width="90" height="12" rx="6" />
    <g className="help-scene-choice help-scene-choice-one">
      <rect x="54" y="96" width="204" height="142" rx="14" />
      <circle cx="82" cy="126" r="12" />
      <rect x="106" y="118" width="112" height="12" rx="6" />
      <rect x="74" y="158" width="164" height="10" rx="5" />
      <rect x="74" y="180" width="126" height="10" rx="5" />
      <rect className="help-scene-button" x="74" y="207" width="116" height="18" rx="9" />
    </g>
    <g className="help-scene-choice help-scene-choice-two">
      <rect x="302" y="96" width="204" height="142" rx="14" />
      <circle cx="330" cy="126" r="12" />
      <rect x="354" y="118" width="112" height="12" rx="6" />
      <rect x="322" y="158" width="164" height="10" rx="5" />
      <rect x="322" y="180" width="126" height="10" rx="5" />
      <rect className="help-scene-button" x="322" y="207" width="116" height="18" rx="9" />
    </g>
  </svg>;
}

function SuperadminScene() {
  return <svg className="help-scene" viewBox="0 0 560 300" aria-hidden="true">
    <rect className="help-scene-frame" x="20" y="18" width="520" height="264" rx="18" />
    <rect className="help-scene-top" x="20" y="18" width="520" height="54" rx="18" />
    {[0, 1, 2, 3, 4].map((item) => <g key={item} className={`help-scene-tab help-scene-tab-${item + 1}`} transform={`translate(${96 + item * 78} 32)`}><circle cx="0" cy="10" r="10" /><text x="0" y="14" textAnchor="middle">{"ABCDE"[item]}</text><rect x="16" y="4" width="42" height="12" rx="6" /></g>)}
    <rect className="help-scene-sidebar" x="38" y="92" width="110" height="164" rx="12" />
    <rect className="help-scene-ink" x="56" y="112" width="70" height="10" rx="5" />
    <rect x="56" y="140" width="74" height="9" rx="5" />
    <rect x="56" y="164" width="60" height="9" rx="5" />
    <rect x="56" y="188" width="68" height="9" rx="5" />
    <g className="help-scene-board">
      <rect x="170" y="92" width="350" height="54" rx="12" />
      <rect className="help-scene-light" x="188" y="108" width="112" height="14" rx="7" />
      <rect x="188" y="128" width="194" height="7" rx="4" />
      <rect x="170" y="160" width="350" height="82" rx="12" />
      <rect className="help-scene-ink" x="188" y="178" width="36" height="13" rx="6" />
      <rect x="238" y="178" width="166" height="12" rx="6" />
      <rect x="238" y="204" width="226" height="8" rx="4" />
      <rect className="help-scene-button" x="430" y="174" width="68" height="22" rx="11" />
    </g>
  </svg>;
}

function ProducerScene() {
  return <svg className="help-scene" viewBox="0 0 560 300" aria-hidden="true">
    <rect className="help-scene-frame" x="20" y="18" width="520" height="264" rx="18" />
    <rect className="help-scene-top" x="20" y="18" width="520" height="56" rx="18" />
    <rect className="help-scene-light" x="42" y="35" width="38" height="22" rx="6" />
    <rect className="help-scene-ink" x="94" y="34" width="126" height="12" rx="6" />
    <g className="help-scene-notice">
      <rect x="42" y="94" width="476" height="62" rx="12" />
      <circle className="help-scene-light" cx="66" cy="116" r="10" />
      <rect className="help-scene-ink" x="86" y="105" width="138" height="12" rx="6" />
      <rect x="86" y="129" width="278" height="8" rx="4" />
      <rect className="help-scene-button" x="428" y="110" width="70" height="22" rx="11" />
    </g>
    <g className="help-scene-rundown">
      <rect x="42" y="174" width="476" height="82" rx="12" />
      <rect className="help-scene-ink" x="62" y="192" width="56" height="14" rx="7" />
      <rect x="136" y="192" width="236" height="12" rx="6" />
      <rect x="136" y="218" width="172" height="8" rx="4" />
      <rect className="help-scene-button" x="408" y="196" width="88" height="28" rx="8" />
    </g>
  </svg>;
}

function PrePautaScene() {
  return <svg className="help-scene" viewBox="0 0 560 300" aria-hidden="true">
    <rect className="help-scene-frame" x="20" y="18" width="520" height="264" rx="18" />
    <g className="help-scene-source">
      <rect x="44" y="62" width="180" height="184" rx="14" />
      <rect className="help-scene-ink" x="64" y="84" width="104" height="12" rx="6" />
      <rect x="64" y="120" width="138" height="8" rx="4" />
      <rect x="64" y="140" width="112" height="8" rx="4" />
      <rect x="64" y="174" width="138" height="8" rx="4" />
      <rect x="64" y="194" width="126" height="8" rx="4" />
      <rect className="help-scene-light" x="64" y="218" width="86" height="10" rx="5" />
    </g>
    <g className="help-scene-arrow"><path d="M244 150h48" /><path d="m280 138 12 12-12 12" /></g>
    <g className="help-scene-ordered">
      <rect x="318" y="62" width="198" height="184" rx="14" />
      <rect className="help-scene-ink" x="338" y="84" width="116" height="12" rx="6" />
      {[0, 1, 2].map((item) => <g key={item} transform={`translate(338 ${116 + item * 40})`}><rect width="158" height="30" rx="8" /><rect className="help-scene-light" x="10" y="9" width="38" height="11" rx="5" /><rect x="58" y="10" width="82" height="9" rx="4" /></g>)}
    </g>
  </svg>;
}

function PostPautaScene() {
  return <svg className="help-scene" viewBox="0 0 560 300" aria-hidden="true">
    <rect className="help-scene-frame" x="20" y="18" width="520" height="264" rx="18" />
    <rect className="help-scene-video" x="44" y="62" width="170" height="112" rx="13" />
    <circle className="help-scene-light help-scene-play" cx="129" cy="118" r="24" />
    <path className="help-scene-play-mark" d="m122 106 20 12-20 12z" />
    <rect x="44" y="190" width="170" height="12" rx="6" />
    <rect x="44" y="216" width="132" height="8" rx="4" />
    <g className="help-scene-post-list">
      {[0, 1, 2].map((item) => <g key={item} transform={`translate(246 ${64 + item * 58})`}><rect width="270" height="46" rx="10" /><circle className="help-scene-check" cx="24" cy="23" r="12" /><path className="help-scene-check-mark" d="m18 23 4 4 8-9" /><rect className="help-scene-ink" x="48" y="13" width="122" height="10" rx="5" /><rect x="48" y="29" width="178" height="6" rx="3" /></g>)}
    </g>
    <rect className="help-scene-button help-scene-save" x="390" y="244" width="126" height="24" rx="12" />
  </svg>;
}

function StatusScene() {
  return <svg className="help-scene" viewBox="0 0 560 300" aria-hidden="true">
    <rect className="help-scene-frame" x="20" y="18" width="520" height="264" rx="18" />
    <line x1="94" y1="152" x2="466" y2="152" />
    {[94, 218, 342].map((x, index) => <g key={x} className={`help-scene-node help-scene-node-${index + 1}`}><circle cx={x} cy="152" r="28" /><path d={`M${x - 10} 152l7 7 15-17`} /><rect x={x - 42} y="198" width="84" height="10" rx="5" /></g>)}
    <g className="help-scene-next">
      <circle cx="466" cy="152" r="28" />
      <path d="M454 152h24m-10-10 10 10-10 10" />
      <rect x="424" y="198" width="84" height="10" rx="5" />
    </g>
    <rect className="help-scene-ink" x="174" y="62" width="212" height="14" rx="7" />
    <rect x="208" y="88" width="144" height="8" rx="4" />
  </svg>;
}

function Scene({ id }: { id: ChapterId }) {
  if (id === "superadmin") return <SuperadminScene />;
  if (id === "producer") return <ProducerScene />;
  if (id === "pre") return <PrePautaScene />;
  if (id === "post") return <PostPautaScene />;
  if (id === "status") return <StatusScene />;
  return <StartScene />;
}

function ChapterBody({ id, goTo }: { id: ChapterId; goTo: (id: ChapterId) => void }) {
  if (id === "start") return <div className="help-role-choice">
    <p className="help-lead">No necesitas aprender toda la plataforma. Empieza por el trabajo que haces hoy.</p>
    <div>
      <button onClick={() => goTo("superadmin")}><span>A-E</span><strong>Soy superadmin</strong><small>Coordino programas, indicaciones, agenda y personas.</small><b>Ver mi recorrido</b></button>
      <button onClick={() => goTo("producer")}><span>Mi programa</span><strong>Trabajo en producción</strong><small>Preparo una emisión y registro lo que salió.</small><b>Ver mi recorrido</b></button>
    </div>
    <aside><strong>Una sola base editorial</strong><p>Los cambios aceptados se comparten. Cada usuario ve una interfaz acorde a su responsabilidad.</p></aside>
  </div>;

  if (id === "superadmin") return <div className="help-body-stack">
    <ol className="help-step-list help-step-list-views">
      <li><b>A</b><span><strong>Agenda</strong><small>Revisa la semana y abre el programa que necesita atención.</small></span></li>
      <li><b>B</b><span><strong>Mesa</strong><small>Mueve programas entre Falta pauta, En preparación, Lista y Post-pauta.</small></span></li>
      <li><b>C</b><span><strong>Programa</strong><small>Entra al detalle de una pauta y edita sus bloques.</small></span></li>
      <li><b>D</b><span><strong>Recepción</strong><small>Elige programa y fecha, pega lo recibido y ordénalo.</small></span></li>
      <li><b>E</b><span><strong>Post</strong><small>Registra y verifica lo que realmente salió al aire.</small></span></li>
    </ol>
    <div className="help-tip"><strong>Atajo útil</strong><p>Desde Agenda abre cualquier programa con <b>Ver como producción</b>. La flecha de regreso te devuelve al dashboard.</p></div>
    <div className="help-inline-actions"><span>También desde la vista general:</span><b>Indicaciones</b><b>Calendario</b><b>Personas</b><b>Archivo</b><b>Administración</b></div>
  </div>;

  if (id === "producer") return <div className="help-body-stack">
    <ol className="help-step-list">
      <li><b>1</b><span><strong>Lee lo nuevo</strong><small>Indicaciones y fechas importantes aparecen arriba. Una novedad queda marcada hasta que la veas.</small></span></li>
      <li><b>2</b><span><strong>Elige la fecha</strong><small>Usa los días visibles o Crear nueva pauta para saltar a una fecha futura.</small></span></li>
      <li><b>3</b><span><strong>Prepara y revisa</strong><small>Pega un texto o escribe aquí. Luego corrige solo las excepciones que detecte Luna.</small></span></li>
      <li><b>4</b><span><strong>Deja la pauta lista</strong><small>Los bloques se guardan por separado y quedan disponibles para el equipo.</small></span></li>
      <li><b>5</b><span><strong>Cierra en Post-pauta</strong><small>Marca resultados y resume lo emitido sin duplicar la escaleta.</small></span></li>
    </ol>
    <div className="help-tip"><strong>Tres accesos permanentes</strong><p>Pauta de hoy para trabajar, Invitados para encontrar especialistas y Post-pauta para cerrar la emisión.</p></div>
  </div>;

  if (id === "pre") return <div className="help-body-stack">
    <div className="help-route-grid">
      <article><span>Si ya tienes un texto</span><strong>Pegar una prepauta</strong><p>Pega el contenido completo. Los horarios que ya existen se conservan para que Luna haga menos trabajo.</p></article>
      <article><span>Si empiezas aquí</span><strong>Hacerla en la app</strong><p>Escribe libremente o añade bloques editables. Puedes moverlos y variar su duración.</p></article>
    </div>
    <ol className="help-compact-steps">
      <li><b>1</b><span>Pulsa <strong>Ordenar con Luna</strong>.</span></li>
      <li><b>2</b><span>Revisa horarios, títulos e invitados en la vista ordenada.</span></li>
      <li><b>3</b><span>Corrige lo dudoso y pulsa <strong>Aceptar escaleta</strong>.</span></li>
    </ol>
    <div className="help-warning"><strong>Para reconocer personas</strong><p>Escribe <b>INVITADO:</b> o <b>INVITADA:</b> antes del nombre completo. Se comparará con la base existente y un nombre dudoso quedará para revisión, no se añadirá en silencio.</p></div>
  </div>;

  if (id === "post") return <div className="help-body-stack">
    <ol className="help-step-list">
      <li><b>1</b><span><strong>Abre Post-pauta</strong><small>Encontrarás los mismos bloques de la pre-pauta, plegados para revisar rápido.</small></span></li>
      <li><b>2</b><span><strong>Durante la emisión</strong><small>Marca Emitido, Parcial, No salió o Añadir en vivo. Ajusta horas solo si hace falta.</small></span></li>
      <li><b>3</b><span><strong>Después de la emisión</strong><small>Resume qué se dijo. Una cita se considera verificada únicamente después de compararla con el audio.</small></span></li>
      <li><b>4</b><span><strong>Usa una fuente si existe</strong><small>Pega un documento posterior o vincula un video público de RPP. Luna propone la comparación y tú la confirmas.</small></span></li>
      <li><b>5</b><span><strong>Verifica y cierra</strong><small>El invitado, el tema y el resumen alimentan el histórico compartido.</small></span></li>
    </ol>
    <div className="help-warning"><strong>La revisión humana sigue siendo necesaria</strong><p>Los captions prueban que un tramo salió, pero nombres, citas y cambios editoriales deben poder corregirse antes de cerrar.</p></div>
  </div>;

  return <div className="help-status-body">
    <section className="help-status-column is-ready">
      <header><span>Disponible en el piloto</span><strong>Ya puedes usarlo</strong></header>
      <ul>
        <li>Agenda, Mesa, Programa, Recepción y Post-pauta.</li>
        <li>Espacios de producción por programa y acceso del superadmin.</li>
        <li>Pre y post-pauta asistidas por Luna con revisión editable.</li>
        <li>Guardado compartido por bloque, historial y aviso de conflictos.</li>
        <li>Invitados, contactos, etiquetas, coincidencias y fusión de duplicados.</li>
        <li>Indicaciones, fechas importantes, calendario y bloques fijos.</li>
        <li>Video embebido y captions públicos para enlaces conocidos.</li>
      </ul>
    </section>
    <section className="help-status-column is-next">
      <header><span>Siguiente integración</span><strong>Aún no es automática</strong></header>
      <ul>
        <li>Encontrar por sí sola la transmisión correcta de cada programa y fecha.</li>
        <li>Transcribir audio propio cuando un video no tenga captions.</li>
        <li>Separar hablantes con mayor precisión en entrevistas y paneles.</li>
        <li>Reemplazar el proveedor temporal de captions por una fuente estable y autorizada.</li>
        <li>Enviar avisos fuera de la app por WhatsApp, email o notificaciones.</li>
        <li>Ampliar reportes y exportaciones según lo que valide el piloto.</li>
      </ul>
    </section>
    <p className="help-status-note"><strong>Regla del piloto:</strong> Luna propone. Una persona acepta, corrige o descarta antes de que el contenido entre al histórico.</p>
  </div>;
}

export function HelpTutorial({ initialAudience, onClose }: HelpTutorialProps) {
  const [activeIndex, setActiveIndex] = useState(initialAudience === "producer" ? 2 : 0);
  const chapter = chapters[activeIndex];

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight" && !event.metaKey && !event.ctrlKey && !event.altKey) setActiveIndex((current) => Math.min(chapters.length - 1, current + 1));
      if (event.key === "ArrowLeft" && !event.metaKey && !event.ctrlKey && !event.altKey) setActiveIndex((current) => Math.max(0, current - 1));
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function goTo(id: ChapterId) {
    const nextIndex = chapters.findIndex((item) => item.id === id);
    if (nextIndex >= 0) setActiveIndex(nextIndex);
  }

  return <div className="modal-backdrop help-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="help-tutorial" role="dialog" aria-modal="true" aria-labelledby="help-title">
      <header className="help-header">
        <div><span>Ayuda de Pauta RPP</span><h2 id="help-title">Aprende el flujo en pocos minutos</h2><p>Recorridos breves, organizados por la tarea que necesitas completar.</p></div>
        <button autoFocus onClick={onClose} aria-label="Cerrar tutorial">Cerrar</button>
      </header>
      <div className="help-layout">
        <nav className="help-chapter-nav" aria-label="Capítulos del tutorial">
          <span>Recorrido</span>
          {chapters.map((item, index) => <button key={item.id} className={index === activeIndex ? "active" : ""} aria-current={index === activeIndex ? "step" : undefined} onClick={() => setActiveIndex(index)}><b>{String(index + 1).padStart(2, "0")}</b><span>{item.shortLabel}</span><i aria-hidden="true" /></button>)}
          <small>También puedes usar las flechas del teclado.</small>
        </nav>
        <article className="help-content" key={chapter.id}>
          <div className="help-copy">
            <span className="help-progress">Paso {activeIndex + 1} de {chapters.length}</span>
            <h3>{chapter.title}</h3>
            <p>{chapter.description}</p>
          </div>
          <div className="help-scene-wrap"><Scene id={chapter.id} /></div>
          <ChapterBody id={chapter.id} goTo={goTo} />
        </article>
      </div>
      <footer className="help-footer">
        <p><span>{activeIndex + 1} / {chapters.length}</span><strong>{chapter.shortLabel}</strong></p>
        <div><button disabled={activeIndex === 0} onClick={() => setActiveIndex((current) => Math.max(0, current - 1))}>Anterior</button>{activeIndex === chapters.length - 1 ? <button className="primary" onClick={onClose}>Listo, cerrar ayuda</button> : <button className="primary" onClick={() => setActiveIndex((current) => Math.min(chapters.length - 1, current + 1))}>Siguiente</button>}</div>
      </footer>
    </section>
  </div>;
}
