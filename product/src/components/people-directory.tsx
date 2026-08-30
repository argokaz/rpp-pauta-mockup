"use client";

import { useMemo, useState } from "react";
import { programs } from "@/data/seed";
import { inferPersonTags, isEditorialCollaborator, normalizePersonName, sortPeopleEditorially } from "@/domain/people-history";
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
  return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(`${value}T12:00:00`)).replace(".", "");
}

function specialtyColor(value: string): number {
  return [...normalizePersonName(value)].reduce((total, character) => total + character.charCodeAt(0), 0) % 5;
}

type PeopleDirectoryProps = {
  people: Person[];
  canEdit?: boolean;
  onSave?: (person: Person) => Promise<boolean>;
  onClose: () => void;
};

export function PeopleDirectory({ people, canEdit = false, onSave, onClose }: PeopleDirectoryProps) {
  const orderedPeople = useMemo(() => sortPeopleEditorially(people), [people]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(orderedPeople[0]?.id ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Person | null>(orderedPeople[0] ?? null);
  const normalizedQuery = normalizePersonName(query);
  const filtered = useMemo(() => orderedPeople.filter((person) => {
    if (!normalizedQuery) return true;
    const searchable = normalizePersonName([
      person.displayName,
      person.primaryRole,
      person.organization,
      person.phone,
      ...person.tags,
      ...person.aliases,
      ...person.appearances.flatMap((appearance) => [
        appearance.segmentTitle,
        appearance.topic,
        appearance.focus,
        appearance.summary,
        ...(appearance.quotes ?? []).map((quote) => quote.text),
        programName(appearance.programId),
      ]),
    ].join(" "));
    return searchable.includes(normalizedQuery);
  }), [normalizedQuery, orderedPeople]);
  const selected = filtered.find((person) => person.id === selectedId) ?? filtered[0];
  const interviewCount = selected?.appearances.filter((appearance) => appearance.role === "guest").length ?? 0;
  const visibleTags = selected ? inferPersonTags(selected) : [];

  async function saveDraft() {
    if (!draft || !onSave || !draft.displayName.trim()) return;
    setSaving(true);
    const tags = draft.tags.map((tag) => tag.trim()).filter(Boolean);
    const saved = await onSave({
      ...draft,
      displayName: draft.displayName.trim(),
      normalizedName: normalizePersonName(draft.displayName),
      primaryRole: draft.primaryRole.trim(),
      organization: draft.organization.trim(),
      phone: draft.phone.trim(),
      tags: tags.length ? tags : inferPersonTags(draft),
    });
    setSaving(false);
    if (saved) setEditing(false);
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal people-directory-modal" role="dialog" aria-modal="true" aria-labelledby="people-directory-title">
        <header>
          <div><span>Archivo editorial</span><h2 id="people-directory-title">Personas e intervenciones</h2></div>
          <button onClick={onClose}>Cerrar</button>
        </header>

        <div className="people-directory-toolbar">
          <label><span>Buscar por nombre, especialidad, tag, teléfono o tema</span><input autoFocus type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej. psicología infantil, tecnología, Encendidos" /></label>
          <p><strong>{people.length}</strong><span>personas registradas</span></p>
        </div>

        <div className="people-directory-grid">
          <aside className="people-results" aria-label="Resultados de personas">
            <header><strong>{filtered.length} resultado{filtered.length === 1 ? "" : "s"}</strong><span>Colaboradores, frecuencia y reciente</span></header>
            <div>
              {filtered.map((person) => (
                <button className={selected?.id === person.id ? "active" : ""} key={person.id} onClick={() => { setSelectedId(person.id); setDraft(person); setEditing(false); }}>
                  <span className="person-initials">{person.displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</span>
                  <span><strong>{person.displayName}</strong><small>{isEditorialCollaborator(person) ? "Colaborador" : "Invitado"} | {person.primaryRole || "Especialidad por completar"}</small></span>
                  <b>{person.appearances.length}</b>
                </button>
              ))}
              {!filtered.length && <div className="people-empty"><strong>No encontramos coincidencias</strong><p>Prueba con otro nombre, tag, tema o programa.</p></div>}
            </div>
          </aside>

          <section className="person-profile">
            {selected ? (
              <>
                <header className="person-profile-header">
                  <span className="person-avatar">{selected.displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</span>
                  <div>
                    <span>{isEditorialCollaborator(selected) ? "Colaborador habitual" : "Invitado"}</span>
                    <h3>{selected.displayName}</h3>
                    <strong className={`person-specialty specialty-color-${specialtyColor(selected.primaryRole)}`}>{selected.primaryRole || "Especialidad por completar"}</strong>
                    {selected.organization && <p>{selected.organization}</p>}
                  </div>
                  {canEdit && onSave && <button className="person-edit-button" onClick={() => { setDraft(selected); setEditing((value) => !value); }}>{editing ? "Cancelar" : "Editar ficha"}</button>}
                </header>

                {editing && draft && (
                  <div className="person-editor">
                    <label><span>Especialidad o profesión</span><input value={draft.primaryRole} onChange={(event) => setDraft({ ...draft, primaryRole: event.target.value })} placeholder="Ej. Psicóloga clínica" /></label>
                    <label><span>Organización</span><input value={draft.organization} onChange={(event) => setDraft({ ...draft, organization: event.target.value })} placeholder="Institución o empresa" /></label>
                    <label><span>Teléfono de coordinación</span><input inputMode="tel" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} placeholder="Ej. +51 999 999 999" /></label>
                    <label><span>Tipo de vínculo</span><select value={draft.relationshipType} onChange={(event) => setDraft({ ...draft, relationshipType: event.target.value as Person["relationshipType"] })}><option value="collaborator">Colaborador habitual</option><option value="guest">Invitado</option></select></label>
                    <label className="person-tags-field"><span>Tags separados por comas</span><input value={draft.tags.join(", ")} onChange={(event) => setDraft({ ...draft, tags: event.target.value.split(",") })} placeholder="psicología clínica, infancia, conducta" /></label>
                    <div className="person-editor-actions"><span>Si dejas los tags vacíos, se generan desde la especialidad.</span><button className="primary" disabled={saving || !draft.primaryRole.trim()} onClick={() => void saveDraft()}>{saving ? "Guardando..." : "Guardar ficha"}</button></div>
                  </div>
                )}

                <div className="person-contact-strip">
                  <div><span>Teléfono</span>{selected.phone ? <a href={`tel:${selected.phone.replace(/[^+\d]/g, "")}`}>{selected.phone}</a> : <strong>Por completar</strong>}</div>
                  <div><span>Tags editoriales</span><div className="person-tags">{visibleTags.map((tag) => <b key={tag}>{tag}</b>)}{!visibleTags.length && <strong>Por completar</strong>}</div></div>
                </div>

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
                      {(appearance.quotes ?? []).map((quote, index) => (
                        <blockquote className={quote.verified ? "appearance-quote verified" : "appearance-quote"} key={`${appearance.id}-quote-${index}`}>
                          <p>“{quote.text}”</p>
                          <span>{quote.verified ? "Cita verificada con el audio" : "Idea destacada, pendiente de verificar"}</span>
                        </blockquote>
                      ))}
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
