"use client";

import { useMemo, useState } from "react";
import { isDemoId } from "@/data/demo-week";
import { programs } from "@/data/seed";
import type { PersonRevision, PersonSnapshot } from "@/data/workspace-repository";
import { whatsappLink } from "@/domain/contact-links";
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

type AuditedField = Exclude<keyof PersonSnapshot, "normalizedName">;

const auditedFieldLabels: Record<AuditedField, string> = {
  displayName: "Nombre",
  aliases: "Nombres alternativos",
  primaryRole: "Especialidad",
  organization: "Organización",
  phone: "Teléfono",
  tags: "Tags",
  relationshipType: "Tipo de vínculo",
  notes: "Notas",
  editorialRoles: "Roles editoriales",
  contacts: "Contactos y procedencia",
  programRoles: "Programas y funciones",
};

function readableDateTime(value: string): string {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value)).replace(".", "");
}

function readableAuditValue(field: AuditedField, value: PersonSnapshot[AuditedField] | undefined): string {
  if (Array.isArray(value)) return value.length ? value.map((item) => typeof item === "string" ? item : "value" in item ? String(item.value) : "programId" in item ? `${item.programId}: ${item.role}` : JSON.stringify(item)).join(", ") : "Vacío";
  if (field === "relationshipType") return value === "collaborator" ? "Colaborador habitual" : "Invitado";
  return typeof value === "string" && value.trim() ? value : "Vacío";
}

function visibleRevisionFields(revision: PersonRevision): AuditedField[] {
  return revision.changedFields.filter((field): field is AuditedField => field !== "normalizedName" && field in auditedFieldLabels)
    .filter((field) => revision.action !== "insert" || readableAuditValue(field, revision.after?.[field]) !== "Vacío");
}

type PeopleDirectoryProps = {
  people: Person[];
  canEdit?: boolean;
  initialSelectedId?: string;
  onSave?: (person: Person) => Promise<boolean>;
  onLoadRevisions?: (personId: string) => Promise<PersonRevision[]>;
  onRestoreField?: (person: Person, revisionId: string, field: AuditedField) => Promise<Person | null>;
  onMerge?: (primaryId: string, duplicateId: string) => Promise<Person | null>;
  onClose: () => void;
};

export function PeopleDirectory({ people, canEdit = false, initialSelectedId, onSave, onLoadRevisions, onRestoreField, onMerge, onClose }: PeopleDirectoryProps) {
  const orderedPeople = useMemo(() => sortPeopleEditorially(people), [people]);
  const initialPerson = orderedPeople.find((person) => person.id === initialSelectedId) ?? orderedPeople[0] ?? null;
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(initialPerson?.id ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Person | null>(initialPerson);
  const [auditPersonId, setAuditPersonId] = useState("");
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [revisions, setRevisions] = useState<PersonRevision[]>([]);
  const [restoring, setRestoring] = useState("");
  const [mergeCandidateId, setMergeCandidateId] = useState("");
  const [merging, setMerging] = useState(false);
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
  const selectedWhatsappLink = selected ? whatsappLink(selected.phone) : null;
  const auditOpen = Boolean(selected && auditPersonId === selected.id);
  const auditAvailable = Boolean(selected && onLoadRevisions && !isDemoId(selected.id));

  async function saveDraft() {
    if (!draft || !onSave || !draft.displayName.trim()) return;
    setSaving(true);
    const tags = draft.tags.map((tag) => tag.trim()).filter(Boolean);
    const contactPhone = draft.phone.trim();
    const draftContacts = draft.contacts ?? [];
    const phoneContact = draftContacts.find((contact) => contact.primary && (contact.type === "phone" || contact.type === "whatsapp"))
      ?? draftContacts.find((contact) => contact.type === "phone" || contact.type === "whatsapp");
    const contacts = contactPhone
      ? phoneContact
        ? draftContacts.map((contact) => contact.id === phoneContact.id ? { ...contact, value: contactPhone, primary: true } : { ...contact, primary: false })
        : [...draftContacts, { id: crypto.randomUUID(), type: "whatsapp" as const, value: contactPhone, label: "Coordinación", source: "Ficha editorial", validFrom: new Date().toISOString().slice(0, 10), validTo: null, primary: true }]
      : draftContacts;
    const saved = await onSave({
      ...draft,
      displayName: draft.displayName.trim(),
      normalizedName: normalizePersonName(draft.displayName),
      primaryRole: draft.primaryRole.trim(),
      organization: draft.organization.trim(),
      phone: draft.phone.trim(),
      aliases: draft.aliases.map((alias) => alias.trim()).filter(Boolean),
      notes: draft.notes.trim(),
      contacts,
      tags: tags.length ? tags : inferPersonTags(draft),
    });
    setSaving(false);
    if (saved) setEditing(false);
  }

  async function mergeSelected() {
    if (!selected || !mergeCandidateId || !onMerge) return;
    const duplicate = people.find((person) => person.id === mergeCandidateId);
    if (!duplicate || !window.confirm(`¿Fusionar “${duplicate.displayName}” dentro de “${selected.displayName}”? La ficha principal conservará el historial y los datos no vacíos.`)) return;
    setMerging(true);
    const merged = await onMerge(selected.id, duplicate.id);
    if (merged) { setDraft(merged); setMergeCandidateId(""); }
    setMerging(false);
  }

  async function loadAudit(personId: string) {
    if (!onLoadRevisions) return;
    setAuditLoading(true);
    setAuditError("");
    try {
      setRevisions(await onLoadRevisions(personId));
    } catch (error) {
      setAuditError(error instanceof Error ? error.message : "No se pudo cargar el historial de datos.");
    } finally {
      setAuditLoading(false);
    }
  }

  function toggleAudit() {
    if (!selected || !auditAvailable) return;
    if (auditOpen) {
      setAuditPersonId("");
      return;
    }
    setAuditPersonId(selected.id);
    void loadAudit(selected.id);
  }

  async function restoreField(revision: PersonRevision, field: AuditedField) {
    if (!selected || !revision.before || !onSave) return;
    const operationId = `${revision.id}-${field}`;
    setRestoring(operationId);
    let restoredPerson: Person = {
      ...selected,
      [field]: revision.before[field],
      normalizedName: field === "displayName" ? normalizePersonName(String(revision.before[field])) : selected.normalizedName,
    };
    const restored = onRestoreField
      ? await onRestoreField(selected, revision.id, field)
      : await onSave(restoredPerson) ? restoredPerson : null;
    if (restored) {
      restoredPerson = restored;
      setDraft(restoredPerson);
      await loadAudit(selected.id);
    }
    setRestoring("");
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
                <button className={selected?.id === person.id ? "active" : ""} key={person.id} onClick={() => { setSelectedId(person.id); setDraft(person); setEditing(false); setAuditPersonId(""); setRevisions([]); }}>
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
                    <label><span>Nombre completo</span><input value={draft.displayName} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} /></label>
                    <label><span>Alias o variantes, separados por comas</span><input value={draft.aliases.join(", ")} onChange={(event) => setDraft({ ...draft, aliases: event.target.value.split(",") })} placeholder="Nombre artístico, variante ortográfica" /></label>
                    <label><span>Especialidad o profesión</span><input value={draft.primaryRole} onChange={(event) => setDraft({ ...draft, primaryRole: event.target.value })} placeholder="Ej. Psicóloga clínica" /></label>
                    <label><span>Organización</span><input value={draft.organization} onChange={(event) => setDraft({ ...draft, organization: event.target.value })} placeholder="Institución o empresa" /></label>
                    <label><span>Teléfono de coordinación</span><input inputMode="tel" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} placeholder="Ej. +51 999 999 999" /></label>
                    <label><span>Tipo de vínculo</span><select value={draft.relationshipType} onChange={(event) => setDraft({ ...draft, relationshipType: event.target.value as Person["relationshipType"] })}><option value="collaborator">Colaborador habitual</option><option value="guest">Invitado</option></select></label>
                    <label className="person-tags-field"><span>Tags separados por comas</span><input value={draft.tags.join(", ")} onChange={(event) => setDraft({ ...draft, tags: event.target.value.split(",") })} placeholder="psicología clínica, infancia, conducta" /></label>
                    <label className="person-tags-field"><span>Procedencia del contacto principal</span><input value={(draft.contacts ?? []).find((contact) => contact.primary)?.source ?? ""} onChange={(event) => { const contacts = draft.contacts ?? []; const current = contacts.find((contact) => contact.primary); const created = { id: crypto.randomUUID(), type: "whatsapp" as const, value: draft.phone, label: "Coordinación", source: event.target.value, validFrom: new Date().toISOString().slice(0, 10), validTo: null, primary: true }; setDraft({ ...draft, contacts: current ? contacts.map((contact) => contact.id === current.id ? { ...contact, source: event.target.value } : contact) : [...contacts, created] }); }} placeholder="Ej. compartido por Producción General" /></label>
                    <label><span>Válido desde</span><input type="date" value={(draft.contacts ?? []).find((contact) => contact.primary)?.validFrom ?? ""} onChange={(event) => { const contacts = draft.contacts ?? []; const current = contacts.find((contact) => contact.primary); const created = { id: crypto.randomUUID(), type: "whatsapp" as const, value: draft.phone, label: "Coordinación", source: "Ficha editorial", validFrom: event.target.value, validTo: null, primary: true }; setDraft({ ...draft, contacts: current ? contacts.map((contact) => contact.id === current.id ? { ...contact, validFrom: event.target.value } : contact) : [...contacts, created] }); }} /></label>
                    <label className="person-tags-field"><span>Notas internas</span><textarea rows={3} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} placeholder="Disponibilidad, trato preferido o contexto útil" /></label>
                    <div className="person-editor-actions"><span>Si dejas los tags vacíos, se generan desde la especialidad.</span><button className="primary" disabled={saving || !draft.primaryRole.trim()} onClick={() => void saveDraft()}>{saving ? "Guardando..." : "Guardar ficha"}</button></div>
                  </div>
                )}

                {canEdit && onMerge && !isDemoId(selected.id) && <section className="person-merge-tool"><div><strong>¿Es un contacto duplicado?</strong><span>Fusiona apariciones, alias, roles y contactos sin perder el historial.</span></div><select value={mergeCandidateId} onChange={(event) => setMergeCandidateId(event.target.value)}><option value="">Elegir ficha duplicada…</option>{orderedPeople.filter((person) => person.id !== selected.id && !isDemoId(person.id)).map((person) => <option key={person.id} value={person.id}>{person.displayName} · {person.primaryRole || "sin especialidad"}</option>)}</select><button disabled={!mergeCandidateId || merging} onClick={() => void mergeSelected()}>{merging ? "Fusionando…" : "Revisar y fusionar"}</button></section>}

                <div className="person-contact-strip">
                  <div><span>Teléfono</span>{selected.phone ? <a href={`tel:${selected.phone.replace(/[^+\d]/g, "")}`}>{selected.phone}</a> : <strong>Por completar</strong>}</div>
                  <div className="person-whatsapp"><span>Contacto rápido</span>{selectedWhatsappLink ? <a href={selectedWhatsappLink} target="_blank" rel="noreferrer">Escribir por WhatsApp <span aria-hidden="true">↗</span></a> : <strong>WhatsApp no disponible</strong>}</div>
                  <div><span>Tags editoriales</span><div className="person-tags">{visibleTags.map((tag) => <b key={tag}>{tag}</b>)}{!visibleTags.length && <strong>Por completar</strong>}</div></div>
                </div>

                <section className="person-data-audit">
                  <button className="person-audit-toggle" onClick={toggleAudit} aria-expanded={auditOpen} disabled={!auditAvailable}>
                    <span><small>Ficha auditable</small><strong>Historial de datos y responsables</strong></span>
                    <b>{!auditAvailable ? "Disponible en fichas reales" : auditOpen ? "Ocultar" : "Ver cambios"} {auditAvailable && <span aria-hidden="true">{auditOpen ? "−" : "+"}</span>}</b>
                  </button>
                  {auditOpen && (
                    <div className="person-audit-timeline">
                      {auditLoading && <div className="person-audit-message">Cargando historial…</div>}
                      {auditError && <div className="person-audit-message error">{auditError}</div>}
                      {!auditLoading && !auditError && revisions.map((revision) => {
                        const fields = visibleRevisionFields(revision);
                        return <article key={revision.id}>
                          <header><div><strong>{revision.actorName}</strong><span>{revision.action === "insert" ? "creó la ficha" : revision.action === "delete" ? "eliminó la ficha" : "actualizó datos"}</span></div><time>{readableDateTime(revision.createdAt)}</time></header>
                          <div>{fields.map((field) => {
                            const operationId = `${revision.id}-${field}`;
                            return <div className="person-audit-change" key={field}>
                              <span>{auditedFieldLabels[field]}</span>
                              <p>{revision.before && <del>{readableAuditValue(field, revision.before[field])}</del>}<strong>{readableAuditValue(field, revision.after?.[field])}</strong></p>
                              {canEdit && revision.action === "update" && revision.before && <button disabled={Boolean(restoring)} onClick={() => void restoreField(revision, field)}>{restoring === operationId ? "Restaurando…" : "Restaurar este dato"}</button>}
                            </div>;
                          })}</div>
                        </article>;
                      })}
                      {!auditLoading && !auditError && !revisions.length && <div className="person-audit-message">Todavía no hay cambios registrados para esta ficha.</div>}
                      <p className="person-audit-note">Restaurar crea un cambio nuevo: el historial anterior nunca se borra.</p>
                    </div>
                  )}
                </section>

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
