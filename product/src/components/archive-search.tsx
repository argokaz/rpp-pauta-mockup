"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { isDemoId } from "@/data/demo-week";
import { programs } from "@/data/seed";
import type { WorkspaceRepository } from "@/data/workspace-repository";
import { searchArchiveLocally, type ArchiveDisposition, type ArchiveSearchRecord } from "@/domain/archive-search";
import type { Emission } from "@/domain/schemas";

type ArchiveSearchProps = {
  emissions: Emission[];
  onClose: () => void;
  onOpenResult?: (record: ArchiveSearchRecord) => void;
  programId?: string;
  searchArchive?: WorkspaceRepository["searchArchive"];
};

const PAGE_SIZE = 20;

const dispositionLabels: Record<ArchiveDisposition, string> = {
  planned: "Pre-pauta",
  aired: "Emitido",
  partial: "Salida parcial",
  skipped: "No salió",
};

function readableDate(value: string): string {
  return new Intl.DateTimeFormat("es-PE", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(`${value}T12:00:00`))
    .replaceAll(".", "");
}

function resultDisposition(record: ArchiveSearchRecord): string {
  if (!record.disposition) return "Pre-pauta";
  if (record.disposition === "skipped") return "No salió";
  if (record.disposition === "partial") return "Salida parcial";
  if (record.disposition === "added_live") return "Añadido en vivo";
  return "Emitido";
}

function mergeUnique(primary: ArchiveSearchRecord[], secondary: ArchiveSearchRecord[], sortByDate = false): ArchiveSearchRecord[] {
  const records = new Map<string, ArchiveSearchRecord>();
  [...primary, ...secondary].forEach((record) => records.set(record.segmentId, record));
  const merged = [...records.values()];
  return sortByDate
    ? merged.sort((left, right) => right.date.localeCompare(left.date) || left.startTime.localeCompare(right.startTime))
    : merged;
}

export function ArchiveSearch({ emissions, onClose, onOpenResult, programId, searchArchive }: ArchiveSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState(programId ?? "all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [disposition, setDisposition] = useState<ArchiveDisposition | "all">("all");
  const [results, setResults] = useState<ArchiveSearchRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 320);
    return () => window.clearTimeout(timer);
  }, [query]);

  const availablePrograms = useMemo(
    () => programs.filter((program) => program.active && program.managed),
    [],
  );

  useEffect(() => {
    let active = true;
    const frame = window.requestAnimationFrame(() => {
      const requestId = ++requestRef.current;
      const filters = {
        query: debouncedQuery,
        programId: selectedProgramId === "all" ? undefined : selectedProgramId,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        disposition: disposition === "all" ? undefined : disposition,
        limit: PAGE_SIZE,
        offset: 0,
      };
      setLoading(true);
      setError("");

      const demoPage = searchArchiveLocally(emissions.filter((emission) => isDemoId(emission.id)), { ...filters, limit: 100 });
      const serverRequest = searchArchive
        ? searchArchive(filters)
        : Promise.resolve(searchArchiveLocally(emissions, filters));

      void serverRequest.then((page) => {
        if (!active || requestRef.current !== requestId) return;
        const merged = mergeUnique(page.items, demoPage.items, !filters.query);
        setResults(merged);
        setTotal(page.total + demoPage.total);
        setHasMore(page.hasMore);
        setLoading(false);
      }).catch((reason: unknown) => {
        if (!active || requestRef.current !== requestId) return;
        const fallback = searchArchiveLocally(emissions, filters);
        setResults(fallback.items);
        setTotal(fallback.total);
        setHasMore(fallback.hasMore);
        setError(reason instanceof Error ? reason.message : "No se pudo consultar la base compartida.");
        setLoading(false);
      });
    });
    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
    };
  }, [dateFrom, dateTo, debouncedQuery, disposition, emissions, searchArchive, selectedProgramId]);

  async function loadMore() {
    if (!searchArchive || loadingMore || !hasMore) return;
    setLoadingMore(true);
    setError("");
    try {
      const page = await searchArchive({
        query: debouncedQuery,
        programId: selectedProgramId === "all" ? undefined : selectedProgramId,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        disposition: disposition === "all" ? undefined : disposition,
        limit: PAGE_SIZE,
        offset: Math.max(0, results.filter((record) => !isDemoId(record.segmentId)).length),
      });
      setResults((current) => mergeUnique(current, page.items));
      setHasMore(page.hasMore);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudieron cargar más resultados.");
    } finally {
      setLoadingMore(false);
    }
  }

  function clearFilters() {
    setQuery("");
    setDebouncedQuery("");
    setSelectedProgramId(programId ?? "all");
    setDateFrom("");
    setDateTo("");
    setDisposition("all");
  }

  const filtersActive = Boolean(query || dateFrom || dateTo || disposition !== "all" || selectedProgramId !== (programId ?? "all"));

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal archive-search-modal" role="dialog" aria-modal="true" aria-labelledby="archive-title">
        <header className="archive-search-header">
          <div><span>Base editorial compartida</span><h2 id="archive-title">Histórico de entrevistas y temas</h2><p>Encuentra quién habló, qué dijo y en qué emisión ocurrió.</p></div>
          <button onClick={onClose}>Cerrar</button>
        </header>

        <div className="archive-search-toolbar">
          <label className="archive-query"><span>Buscar en todo el contenido</span><input autoFocus type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Invitado, tema, frase o palabra clave" /></label>
          <label><span>Programa</span><select disabled={Boolean(programId)} value={selectedProgramId} onChange={(event) => setSelectedProgramId(event.target.value)}><option value="all">Todos los programas</option>{availablePrograms.map((program) => <option key={program.id} value={program.id}>{program.shortName}</option>)}</select></label>
          <label><span>Desde</span><input type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} /></label>
          <label><span>Hasta</span><input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} /></label>
          <label><span>Resultado</span><select value={disposition} onChange={(event) => setDisposition(event.target.value as ArchiveDisposition | "all")}><option value="all">Todos</option>{Object.entries(dispositionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          {filtersActive && <button className="archive-clear" onClick={clearFilters}>Limpiar</button>}
        </div>

        <div className="archive-search-summary" aria-live="polite">
          <div><strong>{loading ? "Buscando en el histórico" : `${total} resultado${total === 1 ? "" : "s"}`}</strong><span>{debouncedQuery ? `Coincidencias para “${debouncedQuery}”` : "Registros más recientes primero"}</span></div>
          {error && <p>Mostramos la copia disponible en este navegador. {error}</p>}
        </div>

        <div className="archive-results" aria-busy={loading}>
          {loading && <div className="archive-loading"><i /><i /><i /><span>Consultando la base editorial...</span></div>}
          {!loading && results.map((record) => {
            const program = programs.find((item) => item.id === record.programId);
            return <article key={`${record.emissionId}-${record.segmentId}`}>
              <header><div><time>{readableDate(record.date)} · {record.startTime || "Sin hora"}</time><b>{program?.shortName ?? "Programa RPP"}</b></div><span data-disposition={record.disposition ?? "planned"}>{resultDisposition(record)}</span></header>
              <div className="archive-card-body">
                <div className="archive-card-main">
                  <h3>{record.title}</h3>
                  {record.guest && <p className="archive-guest"><strong>{record.guest}</strong>{record.guestRole && <span>{record.guestRole}</span>}</p>}
                  <section className="archive-said"><span>{record.disposition ? "Qué se dijo" : "Enfoque previsto"}</span><p>{record.summary || "Este bloque todavía no tiene un resumen editorial."}</p></section>
                  {record.keyQuote && <blockquote>“{record.keyQuote}” <span>{record.quoteVerified ? "Cita verificada con la fuente" : "Pendiente de verificar con la fuente"}</span></blockquote>}
                </div>
                <aside>
                  {record.topic && <div><span>Tema</span><strong>{record.topic}</strong></div>}
                  <div><span>Producción</span><strong>{record.producerName || "Por completar"}</strong></div>
                  {onOpenResult && <button onClick={() => onOpenResult(record)}>Abrir emisión</button>}
                </aside>
              </div>
              {record.sourceExcerpt && <details><summary>Ver evidencia original</summary><p>{record.sourceExcerpt}</p></details>}
            </article>;
          })}
          {!loading && !results.length && <div className="empty-state"><strong>No encontramos coincidencias</strong><p>Prueba con menos palabras, otro rango de fechas o un nombre aproximado.</p><button onClick={clearFilters}>Ver registros recientes</button></div>}
          {!loading && hasMore && <button className="archive-load-more" disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? "Cargando..." : "Mostrar 20 resultados más"}</button>}
        </div>
      </section>
    </div>
  );
}
