"use client";

import { useMemo, useState } from "react";
import { programs } from "@/data/seed";
import { normalizePersonName } from "@/domain/people-history";
import type { Appearance, Person } from "@/domain/schemas";

const roleLabels: Record<Appearance["role"], string> = {
  host: "Conducción",
  guest: "Invitado",
  producer: "Producción",
  reporter: "Reportero",
  specialist: "Especialista",
  other: "Colaborador",
};

function programName(programId: string): string {
  return programs.find((program) => program.id === programId)?.shortName ?? "Programa RPP";
}

function readableDate(value: string): string {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`)).replace(".", "");
}

type PeopleDirectoryProps = {
  people: Person[];
  onClose: () => void;
};

export function PeopleDirectory({ people, onClose }: PeopleDirectoryProps) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(people[0]?.id ?? "");
  const normalizedQuery = normalizePersonName(query);
  const filtered = useMemo(() => people.filter((person) => {
    if (!normalizedQuery) return true;
    const searchable = normalizePersonName([
      person.displayName,
      person.primaryRole,
      person.organization,
      ...person.aliases,
      ...person.appearances.flatMap((appearance) => [
        appearance.segmentTitle,
        appearance.topic,
        appearance.focus,
        appearance.summary,
        programName(appearance.programId),
      ]),
    ].join(" "));
    return searchable.includes(normalizedQuery);
  }), [normalizedQuery, people]);
  const selected = filtered.find((person) => person.id === selectedId) ?? filtered[0];
  const interviewCount = selected?.appearances.filter((appearance) => appearance.role === "guest").length ?? 0;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal people-directory-modal" role="dialog" aria-modal="true" aria-labelledby="people-directory-title">
        <header>
          <div><span>Archivo editorial</span><h2 id="people-directory-title">Personas e intervenciones</h2></div>
          <button onClick={onClose}>Cerrar</button>
        </header>

        <div className="people-directory-toolbar">
          <label><span>Buscar por persona, tema o programa</span><input autoFocus type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej. Arturo Goga, tecnología, Encendidos" /></label>
          <p><strong>{people.length}</strong><span>personas verificadas</span></p>
        </div>

        <div className="people-directory-grid">
          <aside className="people-results" aria-label="Resultados de personas">
            <header><strong>{filtered.length} resultado{filtered.length === 1 ? "" : "s"}</strong><span>Orden alfabético</span></header>
            <div>
              {filtered.map((person) => (
                <button className={selected?.id === person.id ? "active" : ""} key={person.id} onClick={() => setSelectedId(person.id)}>
                  <span className="person-initials">{person.displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</span>
                  <span><strong>{person.displayName}</strong><small>{person.primaryRole || "Rol por completar"}</small></span>
                  <b>{person.appearances.length}</b>
                </button>
              ))}
              {!filtered.length && <div className="people-empty"><strong>No encontramos coincidencias</strong><p>Prueba con otro nombre, tema o programa.</p></div>}
            </div>
          </aside>

          <section className="person-profile">
            {selected ? (
              <>
                <header className="person-profile-header">
                  <span className="person-avatar">{selected.displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</span>
                  <div><span>Ficha consolidada</span><h3>{selected.displayName}</h3><p>{selected.primaryRole || "Cargo por completar"}{selected.organization ? ` · ${selected.organization}` : ""}</p></div>
                </header>
                <div className="person-stats">
                  <div><strong>{selected.appearances.length}</strong><span>Apariciones</span></div>
                  <div><strong>{interviewCount}</strong><span>Entrevistas</span></div>
                  <div><strong>{new Set(selected.appearances.map((appearance) => appearance.programId)).size}</strong><span>Programas</span></div>
                </div>
                <div className="appearance-history">
                  <header><strong>Historial</strong><span>Qué trató y dónde participó</span></header>
                  {selected.appearances.map((appearance) => (
                    <article key={appearance.id}>
                      <div className="appearance-meta"><time>{readableDate(appearance.date)}</time><b>{roleLabels[appearance.role]}</b></div>
                      <h4>{appearance.segmentTitle}</h4>
                      <p>{appearance.summary || appearance.focus || appearance.topic || "Sin resumen editorial todavía."}</p>
                      <footer><strong>{programName(appearance.programId)}</strong>{appearance.roleDescription && <span>{appearance.roleDescription}</span>}</footer>
                      {appearance.sourceExcerpt && <details><summary>Ver evidencia original</summary><blockquote>{appearance.sourceExcerpt}</blockquote></details>}
                    </article>
                  ))}
                  {!selected.appearances.length && <div className="people-empty"><strong>Aún no tiene apariciones vinculadas</strong><p>Se añadirán cuando se guarde una pauta verificada.</p></div>}
                </div>
              </>
            ) : <div className="people-empty profile-empty"><strong>El directorio está vacío</strong><p>Los invitados aparecerán aquí al guardar pautas verificadas.</p></div>}
          </section>
        </div>
      </section>
    </div>
  );
}
