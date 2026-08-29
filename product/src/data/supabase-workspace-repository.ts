import type { SupabaseClient } from "@supabase/supabase-js";
import { segmentSchema, workspaceStateSchema, type Emission, type Segment, type WorkspaceState } from "@/domain/schemas";
import type { SegmentDeleteResult, SegmentRevision, SegmentSaveResult, WorkspaceRepository } from "@/data/workspace-repository";

const WEEK_START = "2026-08-24";

const scopeToDatabase: Record<string, "all" | "informative"> = {
  "Todos los programas": "all",
  "Programas informativos": "informative",
};

const scopeFromDatabase: Record<string, string> = {
  all: "Todos los programas",
  informative: "Programas informativos",
  program: "Todos los programas",
};

function shortTime(value: unknown): string {
  return typeof value === "string" ? value.slice(0, 5) : "";
}

function assertNoError(error: { message: string } | null, context: string): void {
  if (error) throw new Error(`${context}: ${error.message}`);
}

function databaseSegmentToDomain(value: unknown): Segment {
  if (!value || typeof value !== "object") throw new Error("Supabase devolvió un bloque inválido.");
  const segment = value as Record<string, unknown>;
  return segmentSchema.parse({
    id: segment.id,
    startTime: shortTime(segment.planned_start),
    endTime: shortTime(segment.planned_end),
    type: segment.segment_type,
    title: segment.slug,
    guest: typeof segment.guest_text === "string" ? segment.guest_text : "",
    notes: typeof segment.notes === "string" ? segment.notes : "",
    sequence: typeof segment.sequence_name === "string" ? segment.sequence_name : "",
    topic: typeof segment.topic === "string" ? segment.topic : "",
    focus: typeof segment.focus === "string" ? segment.focus : "",
    guestRole: typeof segment.guest_role === "string" ? segment.guest_role : "",
    audienceQuestion: typeof segment.audience_question === "string" ? segment.audience_question : "",
    productionCues: Array.isArray(segment.production_cues) ? segment.production_cues.filter((cue): cue is string => typeof cue === "string") : [],
    stories: Array.isArray(segment.story_items) ? segment.story_items : [],
    confidence: typeof segment.extraction_confidence === "number" ? segment.extraction_confidence : undefined,
    sourceExcerpt: typeof segment.source_excerpt === "string" ? segment.source_excerpt : "",
    actualStart: shortTime(segment.actual_start) || undefined,
    actualEnd: shortTime(segment.actual_end) || undefined,
    disposition: segment.disposition ?? undefined,
    postSummary: typeof segment.post_summary === "string" ? segment.post_summary : "",
    keyQuote: typeof segment.key_quote === "string" ? segment.key_quote : "",
    quoteVerified: segment.quote_verified === true,
    version: typeof segment.row_version === "number" ? segment.row_version : 0,
    lastEditedAt: typeof segment.last_edited_at === "string" ? segment.last_edited_at : undefined,
  });
}

export function createSupabaseWorkspaceRepository(
  supabase: SupabaseClient,
  userId: string,
): WorkspaceRepository {
  async function load(): Promise<WorkspaceState> {
    const [bulletinsResult, datesResult, emissionsResult, peopleResult, appearancesResult] = await Promise.all([
      supabase.from("bulletins").select("id,title,body,scope").eq("active", true).order("created_at"),
      supabase.from("important_dates").select("id,event_date,title,details,important_date_plans(program_id,notes)").order("event_date"),
      supabase.from("emissions").select("id,program_id,emission_date,status,raw_text,producer_name,post_review_status,post_notes,media_source_type,media_source_url,transcript_status,post_verified_at,updated_at,segments(id,sort_order,planned_start,planned_end,actual_start,actual_end,disposition,segment_type,sequence_name,slug,topic,focus,guest_text,guest_role,audience_question,production_cues,story_items,notes,extraction_confidence,source_excerpt,post_summary,key_quote,quote_verified,row_version,last_edited_at)").order("emission_date"),
      supabase.from("people").select("id,display_name,normalized_name,aliases,primary_role,organization,notes").order("display_name"),
      supabase.from("appearances").select("id,emission_id,segment_id,person_id,appearance_role,role_description,summary,segment_title,topic,focus,source_excerpt,quotes,created_at"),
    ]);

    assertNoError(bulletinsResult.error, "No se pudieron cargar las indicaciones");
    assertNoError(datesResult.error, "No se pudieron cargar las fechas");
    assertNoError(emissionsResult.error, "No se pudieron cargar las pautas");
    assertNoError(peopleResult.error, "No se pudo cargar el directorio de personas");
    assertNoError(appearancesResult.error, "No se pudo cargar el historial de apariciones");

    const emissionContext = new Map(
      (emissionsResult.data ?? []).map((emission) => [emission.id, emission]),
    );
    const segmentContext = new Map(
      (emissionsResult.data ?? []).flatMap((emission) =>
        (emission.segments ?? []).map((segment) => [segment.id, segment] as const),
      ),
    );

    return workspaceStateSchema.parse({
      bulletins: (bulletinsResult.data ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        body: row.body,
        scope: scopeFromDatabase[row.scope] ?? "Todos los programas",
      })),
      importantDates: (datesResult.data ?? []).map((row) => ({
        id: row.id,
        date: row.event_date,
        title: row.title,
        details: row.details,
        plans: Object.fromEntries((row.important_date_plans ?? []).map((plan) => [plan.program_id, plan.notes])),
      })),
      emissions: (emissionsResult.data ?? []).map((row) => ({
        id: row.id,
        programId: row.program_id,
        date: row.emission_date,
        status: (["empty", "draft", "ready", "post"].includes(row.status) ? row.status : "post") as Emission["status"],
        rawText: row.raw_text,
        producerName: row.producer_name ?? "",
        postPauta: {
          reviewStatus: row.post_review_status ?? "capture",
          sourceType: row.media_source_type ?? "none",
          sourceUrl: row.media_source_url ?? "",
          transcriptStatus: row.transcript_status ?? "none",
          notes: row.post_notes ?? "",
          verifiedAt: row.post_verified_at ?? undefined,
        },
        updatedAt: row.updated_at,
        segments: [...(row.segments ?? [])]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(databaseSegmentToDomain),
      })),
      people: (peopleResult.data ?? []).map((row) => ({
        id: row.id,
        displayName: row.display_name,
        normalizedName: row.normalized_name,
        aliases: Array.isArray(row.aliases)
          ? row.aliases.filter((alias): alias is string => typeof alias === "string")
          : [],
        primaryRole: row.primary_role ?? "",
        organization: row.organization ?? "",
        notes: row.notes,
        appearances: (appearancesResult.data ?? [])
          .filter((appearance) => appearance.person_id === row.id)
          .map((appearance) => {
            const emission = emissionContext.get(appearance.emission_id);
            const segment = appearance.segment_id ? segmentContext.get(appearance.segment_id) : undefined;
            return {
              id: appearance.id,
              personId: row.id,
              programId: emission?.program_id ?? "",
              date: emission?.emission_date ?? appearance.created_at.slice(0, 10),
              role: appearance.appearance_role,
              roleDescription: appearance.role_description ?? "",
              summary: appearance.summary ?? "",
              segmentTitle: appearance.segment_title ?? segment?.slug ?? "Aparición en el programa",
              topic: appearance.topic ?? segment?.topic ?? "",
              focus: appearance.focus ?? segment?.focus ?? "",
              sourceExcerpt: appearance.source_excerpt ?? segment?.source_excerpt ?? "",
              quotes: Array.isArray(appearance.quotes)
                ? appearance.quotes.flatMap((quote) => {
                    if (!quote || typeof quote !== "object") return [];
                    const item = quote as { text?: unknown; verified?: unknown };
                    return typeof item.text === "string"
                      ? [{ text: item.text, verified: item.verified === true }]
                      : [];
                  })
                : [],
            };
          })
          .sort((a, b) => b.date.localeCompare(a.date)),
      })),
    });
  }

  async function persistState(state: WorkspaceState, replaceSegments: boolean): Promise<WorkspaceState> {
    workspaceStateSchema.parse(state);

    for (const bulletin of state.bulletins) {
      const { error } = await supabase.from("bulletins").upsert({
        id: bulletin.id,
        week_start: WEEK_START,
        title: bulletin.title,
        body: bulletin.body,
        scope: scopeToDatabase[bulletin.scope] ?? "all",
        scope_program_id: null,
        active: true,
        created_by: userId,
      });
      assertNoError(error, "No se pudo guardar una indicación");
    }

    for (const importantDate of state.importantDates) {
      const { error: dateError } = await supabase.from("important_dates").upsert({
        id: importantDate.id,
        event_date: importantDate.date,
        title: importantDate.title,
        details: importantDate.details,
        created_by: userId,
      });
      assertNoError(dateError, "No se pudo guardar una fecha importante");

      const { error: deletePlansError } = await supabase
        .from("important_date_plans")
        .delete()
        .eq("important_date_id", importantDate.id);
      assertNoError(deletePlansError, "No se pudieron actualizar los planes del día");

      const plans = Object.entries(importantDate.plans)
        .filter(([, notes]) => notes.trim())
        .map(([programId, notes]) => ({
          important_date_id: importantDate.id,
          program_id: programId,
          notes,
          planned: true,
        }));
      if (plans.length) {
        const { error: plansError } = await supabase.from("important_date_plans").insert(plans);
        assertNoError(plansError, "No se pudieron guardar los planes del día");
      }
    }

    for (const emission of state.emissions) {
      const { data: savedEmission, error: emissionError } = await supabase
        .from("emissions")
        .upsert({
          program_id: emission.programId,
          emission_date: emission.date,
          status: emission.status,
          raw_text: emission.rawText,
          producer_name: emission.producerName,
          post_review_status: emission.postPauta?.reviewStatus ?? "capture",
          post_notes: emission.postPauta?.notes ?? "",
          media_source_type: emission.postPauta?.sourceType ?? "none",
          media_source_url: emission.postPauta?.sourceUrl ?? "",
          transcript_status: emission.postPauta?.transcriptStatus ?? "none",
          post_verified_at: emission.postPauta?.verifiedAt ?? null,
          post_verified_by: emission.postPauta?.verifiedAt ? userId : null,
          producer_id: userId,
        }, { onConflict: "program_id,emission_date" })
        .select("id")
        .single();
      assertNoError(emissionError, "No se pudo guardar la pauta");
      if (!savedEmission) throw new Error("Supabase no devolvió la pauta guardada.");

      if (replaceSegments) {
        const { data: previousSegments, error: previousSegmentsError } = await supabase
          .from("segments")
          .select("*")
          .eq("emission_id", savedEmission.id);
        assertNoError(previousSegmentsError, "No se pudo conservar la versión anterior de la escaleta");
        if (previousSegments?.length) {
          const { error: revisionsError } = await supabase.from("revisions").insert(previousSegments.map((segment) => ({
            entity_type: "segment",
            entity_id: segment.id,
            action: "replace_rundown",
            snapshot: segment,
            actor_id: userId,
          })));
          assertNoError(revisionsError, "No se pudo conservar la versión anterior de la escaleta");
        }

        const { error: deleteAppearancesError } = await supabase
          .from("appearances")
          .delete()
          .eq("emission_id", savedEmission.id)
          .in("appearance_role", ["guest", "other"]);
        assertNoError(deleteAppearancesError, "No se pudo actualizar el histórico de personas");

        const { error: deleteSegmentsError } = await supabase
          .from("segments")
          .delete()
          .eq("emission_id", savedEmission.id);
        assertNoError(deleteSegmentsError, "No se pudieron actualizar los segmentos");

        if (emission.segments.length) {
          const { error: segmentsError } = await supabase.from("segments").insert(
            emission.segments.map((segment, index) => ({
              id: segment.id,
              emission_id: savedEmission.id,
              sort_order: index,
              planned_start: segment.startTime || null,
              planned_end: segment.endTime || null,
              actual_start: segment.actualStart || null,
              actual_end: segment.actualEnd || null,
              disposition: segment.disposition ?? null,
              segment_type: segment.type,
              sequence_name: segment.sequence || null,
              slug: segment.title || "Segmento",
              topic: segment.topic || null,
              focus: segment.focus || null,
              guest_text: segment.guest || null,
              guest_role: segment.guestRole || null,
              audience_question: segment.audienceQuestion || null,
              production_cues: segment.productionCues ?? [],
              story_items: segment.stories ?? [],
              notes: segment.notes,
              extraction_confidence: segment.confidence ?? null,
              source_excerpt: segment.sourceExcerpt || null,
              post_summary: segment.postSummary ?? "",
              key_quote: segment.keyQuote ?? "",
              quote_verified: segment.quoteVerified ?? false,
              row_version: 1,
              last_edited_by: userId,
              last_edited_at: new Date().toISOString(),
            })),
          );
          assertNoError(segmentsError, "No se pudieron guardar los segmentos");
        }
      }
    }

    return load();
  }

  async function save(state: WorkspaceState): Promise<WorkspaceState> {
    return persistState(state, false);
  }

  async function confirmImport(importId: string): Promise<void> {
    const { error } = await supabase
      .from("raw_imports")
      .update({ processing_status: "confirmed", confirmed_at: new Date().toISOString() })
      .eq("id", importId);
    assertNoError(error, "No se pudo confirmar la importación");
  }

  async function saveEmissionStatus(emission: Emission): Promise<void> {
    const { error } = await supabase
      .from("emissions")
      .upsert({
        program_id: emission.programId,
        emission_date: emission.date,
        status: emission.status,
        raw_text: emission.rawText,
        producer_name: emission.producerName,
        producer_id: userId,
      }, { onConflict: "program_id,emission_date" });
    assertNoError(error, "No se pudo actualizar el estado de la pauta");
  }

  async function saveProgramEmission(emission: Emission): Promise<WorkspaceState> {
    return save({ bulletins: [], importantDates: [], emissions: [emission], people: [] });
  }

  async function replaceProgramEmission(emission: Emission): Promise<WorkspaceState> {
    return persistState({ bulletins: [], importantDates: [], emissions: [emission], people: [] }, true);
  }

  async function saveSegment(emission: Emission, segment: Segment, sortOrder: number): Promise<SegmentSaveResult> {
    const { data, error } = await supabase.rpc("save_pauta_segment", {
      p_program_id: emission.programId,
      p_emission_date: emission.date,
      p_emission_status: emission.status,
      p_raw_text: emission.rawText,
      p_producer_name: emission.producerName,
      p_segment_id: segment.id,
      p_sort_order: sortOrder,
      p_expected_version: segment.version ?? 0,
      p_segment: segment,
    });
    assertNoError(error, "No se pudo guardar este bloque");
    const result = data?.[0] as { save_status?: unknown; saved_segment?: unknown; editor_name?: unknown } | undefined;
    const editorName = typeof result?.editor_name === "string" ? result.editor_name : "Otra persona";
    if (result?.save_status === "conflict") {
      return {
        status: "conflict",
        remoteSegment: result.saved_segment ? databaseSegmentToDomain(result.saved_segment) : undefined,
        editorName,
      };
    }
    if (result?.save_status !== "saved" || !result.saved_segment) throw new Error("Supabase no confirmó el guardado del bloque.");
    return { status: "saved", segment: databaseSegmentToDomain(result.saved_segment), editorName };
  }

  async function saveSegmentOrder(emission: Emission, segments: Segment[]): Promise<Segment[]> {
    const { data, error } = await supabase.rpc("reorder_pauta_segments", {
      p_program_id: emission.programId,
      p_emission_date: emission.date,
      p_segment_ids: segments.map((segment) => segment.id),
    });
    assertNoError(error, "No se pudo guardar el nuevo orden");
    if (!Array.isArray(data)) throw new Error("Supabase no devolvió el nuevo orden de bloques.");
    return data.map(databaseSegmentToDomain);
  }

  async function deleteSegment(emission: Emission, segment: Segment): Promise<SegmentDeleteResult> {
    const { data, error } = await supabase.rpc("delete_pauta_segment", {
      p_program_id: emission.programId,
      p_emission_date: emission.date,
      p_segment_id: segment.id,
      p_expected_version: segment.version ?? 0,
    });
    assertNoError(error, "No se pudo quitar este bloque");
    const result = data?.[0] as { delete_status?: unknown; current_segment?: unknown; editor_name?: unknown } | undefined;
    if (result?.delete_status === "conflict") {
      return {
        status: "conflict",
        remoteSegment: result.current_segment ? databaseSegmentToDomain(result.current_segment) : undefined,
        editorName: typeof result.editor_name === "string" ? result.editor_name : "Otra persona",
      };
    }
    if (result?.delete_status !== "deleted") throw new Error("Supabase no confirmó que el bloque fue quitado.");
    return { status: "deleted" };
  }

  async function loadSegmentRevisions(segmentId: string): Promise<SegmentRevision[]> {
    const { data, error } = await supabase.rpc("get_pauta_segment_revisions", { p_segment_id: segmentId });
    assertNoError(error, "No se pudo cargar el historial del bloque");
    if (!Array.isArray(data)) return [];
    return data.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, unknown>;
      if (typeof row.id !== "string" || typeof row.createdAt !== "string" || !row.snapshot) return [];
      return [{
        id: row.id,
        createdAt: row.createdAt,
        action: typeof row.action === "string" ? row.action : "atomic_save",
        actorName: typeof row.actorName === "string" ? row.actorName : "Usuario editorial",
        segment: databaseSegmentToDomain(row.snapshot),
      }];
    });
  }

  function subscribe(onChange: () => void): () => void {
    const channel = supabase
      .channel(`workspace-live-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "emissions" }, onChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "segments" }, onChange)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }

  return { mode: "supabase", load, save, saveProgramEmission, replaceProgramEmission, saveEmissionStatus, saveSegment, deleteSegment, saveSegmentOrder, loadSegmentRevisions, subscribe, confirmImport };
}
