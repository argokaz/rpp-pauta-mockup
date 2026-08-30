"use client";

import { useMemo, useState } from "react";
import { extractYoutubeCaptions } from "@/data/youtube-captions-client";
import {
  formatCaptionTime,
  prepareCaptionsForPostPauta,
  readableCaptionBlocks,
  youtubeVideoId,
  type YoutubeCaptionResponse,
} from "@/domain/youtube-captions";
import type { PostPauta } from "@/domain/schemas";

const FRIDAY_28_STREAMS: Record<string, { sourceUrl: string; label: string }> = {
  "rotativa-am": {
    sourceUrl: "https://www.youtube.com/watch?v=CR01nHWUs_8",
    label: "La Rotativa del Aire Mañana",
  },
  "ampliacion-lima": {
    sourceUrl: "https://www.youtube.com/watch?v=gOqz6hHMC_4",
    label: "Ampliación de Noticias Lima",
  },
  encendidos: {
    sourceUrl: "https://www.youtube.com/watch?v=lDsn5FMTmSk",
    label: "Encendidos",
  },
  "rotativa-tarde": {
    sourceUrl: "https://www.youtube.com/watch?v=CszEIw-Fb_E",
    label: "La Rotativa del Aire Tarde",
  },
};

export function isFriday28PostPilot(programId: string, targetDate: string): boolean {
  return targetDate === "2026-08-28";
}

const RPP_LIVE_STREAMS_URL = "https://www.youtube.com/@RPPNoticias/streams";

type YoutubePostSourceProps = {
  programId: string;
  programName: string;
  targetDate: string;
  sourceUrl: string;
  transcriptStatus: PostPauta["transcriptStatus"];
  canEdit: boolean;
  analyzing: boolean;
  getAccessToken?: (forceRefresh?: boolean) => Promise<string>;
  onPostPautaChange: (change: Partial<PostPauta>) => void;
  onUseTranscript: (text: string) => void;
};

export function YoutubePostSource({
  programId,
  programName,
  targetDate,
  sourceUrl,
  transcriptStatus,
  canEdit,
  analyzing,
  getAccessToken,
  onPostPautaChange,
  onUseTranscript,
}: YoutubePostSourceProps) {
  const videoId = youtubeVideoId(sourceUrl);
  const [result, setResult] = useState<YoutubeCaptionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [seekSeconds, setSeekSeconds] = useState(0);

  const activeResult = result?.videoId === videoId ? result : null;
  const readableBlocks = useMemo(() => readableCaptionBlocks(activeResult?.segments ?? []), [activeResult]);
  const filteredBlocks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    return normalizedQuery
      ? readableBlocks.filter((block) => block.text.toLocaleLowerCase("es").includes(normalizedQuery))
      : readableBlocks;
  }, [query, readableBlocks]);
  const preparedDocument = useMemo(() => prepareCaptionsForPostPauta(activeResult?.segments ?? [], { programAliases: [programName] }), [activeResult, programName]);
  const postDocumentFits = preparedDocument.document.length <= 118_000;
  const fridayStream = targetDate === "2026-08-28" ? FRIDAY_28_STREAMS[programId] : undefined;
  const playerUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?playsinline=1&rel=0&start=${seekSeconds}${seekSeconds ? "&autoplay=1" : ""}`
    : "";

  async function extractCaptions(refresh = false) {
    if (!videoId || !getAccessToken || loading) return;
    setLoading(true);
    setError("");
    onPostPautaChange({ transcriptStatus: "processing" });
    try {
      const next = await extractYoutubeCaptions({
        programId,
        targetDate,
        sourceUrl,
        languageCode: "es",
        refresh,
      }, getAccessToken);
      setResult(next);
      setSeekSeconds(0);
      onPostPautaChange({ sourceUrl: next.sourceUrl, transcriptStatus: "ready" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos extraer los captions.");
      onPostPautaChange({ transcriptStatus: "failed" });
    } finally {
      setLoading(false);
    }
  }

  function useFridaySample() {
    if (!fridayStream) return;
    onPostPautaChange({
      sourceType: "youtube",
      sourceUrl: fridayStream.sourceUrl,
      transcriptStatus: "none",
    });
  }

  return (
    <section className="youtube-post-source" aria-label="Video y captions de YouTube">
      {fridayStream && sourceUrl !== fridayStream.sourceUrl && (
        <div className="youtube-demo-callout">
          <div>
            <strong>Emisión pública encontrada para el viernes 28</strong>
            <span>Usa el stream de {fridayStream.label}, publicado en <a href={RPP_LIVE_STREAMS_URL} target="_blank" rel="noreferrer">En vivo de RPP Noticias</a>.</span>
          </div>
          <button type="button" disabled={!canEdit} onClick={useFridaySample}>Vincular emisión</button>
        </div>
      )}

      {targetDate === "2026-08-28" && !fridayStream && !videoId && (
        <div className="youtube-demo-callout youtube-no-stream-callout">
          <div>
            <strong>No encontramos un stream dedicado para este programa</strong>
            <span>La ficha queda editable y sin una evidencia falsa. Puedes pegar un enlace si aparece en <a href={RPP_LIVE_STREAMS_URL} target="_blank" rel="noreferrer">En vivo de RPP Noticias</a>.</span>
          </div>
        </div>
      )}

      {!videoId && sourceUrl.trim() && (
        <p className="youtube-inline-error" role="alert">El enlace no contiene un identificador válido de YouTube.</p>
      )}

      {videoId && (
        <div className="youtube-media-grid">
          <div className="youtube-player-column">
            <div className="youtube-player-frame">
              <iframe
                key={`${videoId}-${seekSeconds}`}
                src={playerUrl}
                title={activeResult?.title || "Emisión de RPP Noticias en YouTube"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
            <div className="youtube-player-actions">
              <div>
                <strong>{activeResult?.title || "Video listo para revisar"}</strong>
                <span>{activeResult ? `${activeResult.segments.length.toLocaleString("es-PE")} captions con timestamp${activeResult.cached ? " guardados" : " extraídos"}` : <>El video ya puede reproducirse. Falta obtener sus captions. <a href={RPP_LIVE_STREAMS_URL} target="_blank" rel="noreferrer">Buscar otra emisión</a>.</>}</span>
              </div>
              <button
                type="button"
                className="primary"
                disabled={!canEdit || !getAccessToken || loading}
                onClick={() => void extractCaptions(Boolean(activeResult))}
              >
                {loading ? "Extrayendo captions..." : activeResult ? "Actualizar captions" : transcriptStatus === "ready" ? "Cargar captions guardados" : "Extraer captions"}
              </button>
            </div>
            {!getAccessToken && <p className="youtube-inline-error">La extracción requiere una sesión conectada a Supabase.</p>}
            {error && <div className="youtube-extraction-error" role="alert"><strong>No se completó la extracción</strong><p>{error}</p><button type="button" disabled={loading} onClick={() => void extractCaptions()}>Reintentar</button></div>}
          </div>

          <section className="youtube-transcript-column" aria-label="Captions extraídos">
            {loading && (
              <div className="youtube-caption-loading" role="status">
                <span />
                <span />
                <span />
                <p>Consultando los subtítulos disponibles en YouTube.</p>
              </div>
            )}
            {!loading && !activeResult && (
              <div className="youtube-caption-empty">
                <strong>Captions todavía no cargados</strong>
                <p>Al extraerlos podrás buscar palabras y saltar al momento exacto del video.</p>
              </div>
            )}
            {!loading && activeResult && (
              <>
                <header>
                  <label>
                    <span>Buscar dentro de la emisión</span>
                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Invitado, tema o palabra clave" />
                  </label>
                  <small>{filteredBlocks.length} fragmentos</small>
                </header>
                <div className="youtube-caption-list">
                  {filteredBlocks.slice(0, 160).map((block) => (
                    <button key={`${block.startMs}-${block.text.slice(0, 24)}`} type="button" onClick={() => setSeekSeconds(Math.floor(block.startMs / 1000))}>
                      <time>{formatCaptionTime(block.startMs)}</time>
                      <span>{block.text}</span>
                    </button>
                  ))}
                  {!filteredBlocks.length && <p>No encontramos esa palabra en los captions.</p>}
                  {filteredBlocks.length > 160 && <small>Mostrando los primeros 160 resultados. Escribe una palabra para acotar la búsqueda.</small>}
                </div>
                <footer>
                  <div className="youtube-analysis-summary">
                    <p>{postDocumentFits ? "Luna recibirá solo el contenido editorial. Las pausas se descartan antes del análisis." : "Esta emisión supera el límite de una sola pasada. Debe procesarse por bloques."}</p>
                    {preparedDocument.discardedBlocks > 0 && <span><strong>{preparedDocument.discardedBlocks} fragmentos de pausa omitidos</strong><small>{Math.max(1, Math.round(preparedDocument.discardedMs / 60_000))} min que no consumen tokens</small></span>}
                  </div>
                  <button type="button" disabled={!postDocumentFits || analyzing} onClick={() => onUseTranscript(preparedDocument.document)}>{analyzing ? "Analizando emisión..." : "Analizar emisión"}</button>
                </footer>
              </>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
