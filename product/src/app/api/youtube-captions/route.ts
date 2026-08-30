import { createClient } from "@supabase/supabase-js";
import { getVideoDetails, type Subtitle } from "youtube-caption-extractor";
import {
  canonicalYoutubeUrl,
  youtubeCaptionRequestSchema,
  youtubeCaptionResponseSchema,
  youtubeEmbedUrl,
  youtubeVideoId,
  type YoutubeCaptionSegment,
} from "@/domain/youtube-captions";

export const runtime = "nodejs";
export const maxDuration = 30;

const PROVIDER = "youtube-caption-extractor@1.10.2";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function bearerToken(request: Request): string | null {
  return request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
}

function normalizedSegments(subtitles: Subtitle[]): YoutubeCaptionSegment[] {
  return subtitles.flatMap((subtitle) => {
    const startMs = Math.max(0, Math.round(Number(subtitle.start) * 1000));
    const durationMs = Math.max(0, Math.round(Number(subtitle.dur) * 1000));
    const text = subtitle.text.replace(/\s+/g, " ").trim();
    if (!Number.isFinite(startMs) || !Number.isFinite(durationMs) || !text) return [];
    return [{ startMs, endMs: startMs + durationMs, text }];
  }).slice(0, 10_000);
}

async function fetchWithTimeout(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
      headers: {
        ...Object.fromEntries(new Headers(init?.headers).entries()),
        "User-Agent": "Mozilla/5.0 (compatible; RPPPautaDemo/1.0)",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function extractWithRetry(videoId: string, languageCode: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await getVideoDetails({ videoID: videoId, lang: languageCode, fetch: fetchWithTimeout });
    } catch (error) {
      lastError = error;
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw lastError;
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) return jsonError("La base compartida no está configurada.", 503);
  const token = bearerToken(request);
  if (!token) return jsonError("Inicia sesión para obtener los captions.", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("El contenido enviado no es válido.", 400);
  }
  const parsed = youtubeCaptionRequestSchema.safeParse(body);
  if (!parsed.success) return jsonError("Revisa el programa, la fecha y el enlace de YouTube.", 400);
  const input = parsed.data;
  const videoId = youtubeVideoId(input.sourceUrl);
  if (!videoId) return jsonError("Pega un enlace válido de un video o transmisión de YouTube.", 400);
  const sourceUrl = canonicalYoutubeUrl(videoId);

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return jsonError("La sesión ya no es válida.", 401);
  const { data: canManage, error: permissionError } = await supabase.rpc("can_manage_program", { target_program_id: input.programId });
  if (permissionError || !canManage) return jsonError("No tienes permiso para editar este programa.", 403);

  if (!input.refresh) {
    const { data: cached, error: cacheError } = await supabase
      .from("media_transcripts")
      .select("source_url,source_id,media_title,language_code,provider,caption_items,extracted_at")
      .eq("program_id", input.programId)
      .eq("target_date", input.targetDate)
      .eq("source_id", videoId)
      .eq("language_code", input.languageCode)
      .maybeSingle();
    if (cacheError) return jsonError("No pudimos consultar el caché de captions.", 500);
    if (cached) {
      return Response.json(youtubeCaptionResponseSchema.parse({
        videoId: cached.source_id,
        sourceUrl: cached.source_url,
        embedUrl: youtubeEmbedUrl(cached.source_id),
        title: cached.media_title,
        languageCode: cached.language_code,
        provider: cached.provider,
        cached: true,
        extractedAt: cached.extracted_at,
        segments: cached.caption_items,
      }));
    }
  }

  await supabase.from("emissions").update({
    media_source_type: "youtube",
    media_source_url: sourceUrl,
    transcript_status: "processing",
  }).eq("program_id", input.programId).eq("emission_date", input.targetDate);

  try {
    const video = await extractWithRetry(videoId, input.languageCode);
    const segments = normalizedSegments(video.subtitles);
    if (!segments.length) {
      await supabase.from("emissions").update({ transcript_status: "failed" }).eq("program_id", input.programId).eq("emission_date", input.targetDate);
      return jsonError("El video existe, pero no encontramos captions disponibles en YouTube.", 404);
    }
    const extractedAt = new Date().toISOString();
    const response = youtubeCaptionResponseSchema.parse({
      videoId,
      sourceUrl,
      embedUrl: youtubeEmbedUrl(videoId),
      title: video.title?.trim() || `Video de YouTube ${videoId}`,
      languageCode: input.languageCode,
      provider: PROVIDER,
      cached: false,
      extractedAt,
      segments,
    });
    const { error: saveError } = await supabase.from("media_transcripts").upsert({
      program_id: input.programId,
      target_date: input.targetDate,
      source_type: "youtube_unofficial",
      source_url: sourceUrl,
      source_id: videoId,
      media_title: response.title,
      language_code: input.languageCode,
      provider: PROVIDER,
      caption_items: response.segments,
      caption_count: response.segments.length,
      extracted_at: extractedAt,
      extracted_by: userData.user.id,
    }, { onConflict: "program_id,target_date,source_id,language_code" });
    if (saveError) return jsonError("Obtuvimos los captions, pero no pudimos guardarlos para el equipo.", 500);
    await supabase.from("emissions").update({ transcript_status: "ready" }).eq("program_id", input.programId).eq("emission_date", input.targetDate);
    return Response.json(response);
  } catch (error) {
    await supabase.from("emissions").update({ transcript_status: "failed" }).eq("program_id", input.programId).eq("emission_date", input.targetDate);
    const message = error instanceof Error ? error.message : String(error);
    if (/LOGIN_REQUIRED|not a bot|blocked|429/i.test(message)) {
      return jsonError("YouTube bloqueó temporalmente la extracción desde Vercel. Puedes reintentar o pegar los subtítulos manualmente.", 503);
    }
    return jsonError("No pudimos extraer los captions de este video. Comprueba que tenga subtítulos públicos.", 502);
  }
}
