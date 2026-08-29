"use client";

import { useMemo, useState } from "react";
import { programs } from "@/data/seed";
import { normalizePersonName } from "@/domain/people-history";
import type { Emission } from "@/domain/schemas";

type ArchiveSearchProps = {
  emissions: Emission[];
  onClose: () => void;
  programId?: string;
};

function readableDate(value: string): string {
  return new Intl.DateTimeFormat("es-PE", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(`${value}T12:00:00`))
    .replaceAll(".", "");
}

export function ArchiveSearch({ emissions, onClose, programId }: ArchiveSearchProps) {
  const [query, setQuery] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState(programId ?? "all");
  const [date, setDate] = useState("");
  const records = useMemo(() => emissions.flatMap((emission) => emission.segments.map((segment) => ({ emission, segment }))), [emissions]);
  const normalizedQuery = normalizePersonName(query);
  const results = records.filter(({ emission, segment }) => {
    if (selectedProgramId !== "all" && emission.programId !== selectedProgramId) return false;
    if (date && emission.date !== date) return false;
    if (!normalizedQuery) return true;
    const program = programs.find((item) => item.id === emission.programId);
    return normalizePersonName([
      program?.name,
      segment.guest,
      segment.guestRole,
      segment.title,
      segment.topic,
      segment.focus,
      segment.notes,
      segment.postSummary,
      segment.keyQuote,
      emission.producerName,
    ].filter(Boolean).join(" ")).includes(normalizedQuery);
  }).sort((a, b) => b.emission.date.localeCompare(a.emission.date) || a.segment.startTime.localeCompare(b.segment.startTime));

  const availablePrograms = programs.filter((program) => records.some((record) => record.emission.programId === program.id));

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal archive-search-modal" role="dialog" aria-modal="true" aria-labelledby="archive-title">
        <header><div><span>Base editorial compartida</span><h2 id="archive-title">Buscar en el histórico</h2></div><button onClick={onClose}>Cerrar</button></header>
        <div className="archive-search-toolbar">
          <label className="archive-query"><span>Invitado, tema, frase o contenido</span><input autoFocus type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej. uso del celular, Arturo Goga, ollas comunes" /></label>
          <label><span>Programa</span><select disabled={Boolean(programId)} value={selectedProgramId} onChange={(event) => setSelectedProgramId(event.target.value)}><option value="all">Todos los programas</option>{availablePrograms.map((program) => <option key={program.id} value={program.id}>{program.shortName}</option>)}</select></label>
          <label><span>Fecha exacta</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          {(query || date || selectedProgramId !== (programId ?? "all")) && <button onClick={() => { setQuery(""); setDate(""); setSelectedProgramId(programId ?? "all"); }}>Limpiar</button>}
        </div>
        <div className="archive-search-summary"><strong>{results.length} resultado{results.length === 1 ? "" : "s"}</strong><span>Busca en título, invitado, tema, enfoque, resumen, cita y productor.</span></div>
        <div className="archive-results">
          {results.map(({ emission, segment }) => {
            const program = programs.find((item) => item.id === emission.programId);
            return <article key={`${emission.id}-${segment.id}`}>
              <header><time>{readableDate(emission.date)} · {segment.startTime}</time><b>{program?.shortName ?? "Programa RPP"}</b></header>
              <h3>{segment.title}</h3>
              {segment.guest && <p className="archive-guest"><strong>{segment.guest}</strong>{segment.guestRole && <span>{segment.guestRole}</span>}</p>}
              <p>{segment.postSummary || segment.focus || segment.topic || segment.notes || "Sin resumen editorial todavía."}</p>
              {segment.keyQuote && <blockquote>“{segment.keyQuote}” <span>{segment.quoteVerified ? "Verificada" : "Pendiente de verificar"}</span></blockquote>}
              <footer><span>{segment.disposition === "skipped" ? "No salió" : segment.disposition === "partial" ? "Salida parcial" : segment.disposition ? "Emitido" : "Pre-pauta"}</span><span>{emission.producerName || "Productor por completar"}</span></footer>
            </article>;
          })}
          {!results.length && <div className="empty-state"><strong>No encontramos coincidencias</strong><p>Prueba con otro término, programa o fecha.</p></div>}
        </div>
      </section>
    </div>
  );
}
