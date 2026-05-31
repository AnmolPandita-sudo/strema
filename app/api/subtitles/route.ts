// app/api/subtitles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  buildSubtitleCachePath,
  getExpiryDate,
  isCompleted,
  normalizeSubtitleText,
  SubtitleCacheRow,
  SubtitleTrack,
  MediaType,
} from '@/lib/subtitles';

type SubtitleSourceResult = {
  language: string;
  label: string;
  format: 'srt' | 'vtt';
  content: string;
  sourceUrl?: string | null;
};

async function findSubtitleSource(params: {
  tmdbId: number;
  mediaType: MediaType;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  language?: string;
}): Promise<SubtitleSourceResult | null> {
  // TODO:
  // Replace this with your real subtitle provider search logic.
  // For now this is a stub so the route structure is ready.

  return null;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;

  const tmdbId = Number(searchParams.get('tmdbId'));
  const mediaType = searchParams.get('mediaType') as MediaType | null;
  const seasonNumber = searchParams.get('seasonNumber')
    ? Number(searchParams.get('seasonNumber'))
    : null;
  const episodeNumber = searchParams.get('episodeNumber')
    ? Number(searchParams.get('episodeNumber'))
    : null;
  const progressPercent = searchParams.get('progressPercent')
    ? Number(searchParams.get('progressPercent'))
    : null;
  const language = searchParams.get('language') ?? 'en';

  if (!tmdbId || !mediaType || !['movie', 'tv'].includes(mediaType)) {
    return NextResponse.json(
      { error: 'Invalid tmdbId or mediaType' },
      { status: 400 }
    );
  }

  const nowIso = new Date().toISOString();

  const { data: existingRow } = await supabase
    .from('subtitle_cache')
    .select('*')
    .eq('user_id', user.id)
    .eq('tmdb_id', tmdbId)
    .eq('media_type', mediaType)
    .eq('language', language)
    .is('season_number', seasonNumber)
    .is('episode_number', episodeNumber)
    .gt('expires_at', nowIso)
    .maybeSingle<SubtitleCacheRow>();

  if (existingRow?.vtt_public_url) {
    const refreshedExpiry = getExpiryDate(mediaType, progressPercent);

    await supabase
      .from('subtitle_cache')
      .update({
        last_used_at: nowIso,
        expires_at: refreshedExpiry,
        progress_percent: progressPercent,
        is_completed: isCompleted(progressPercent),
      })
      .eq('id', existingRow.id);

    const tracks: SubtitleTrack[] = [
      {
        language: existingRow.language,
        label: existingRow.label,
        url: existingRow.vtt_public_url,
      },
    ];

    return NextResponse.json({ tracks });
  }

  const source = await findSubtitleSource({
    tmdbId,
    mediaType,
    seasonNumber,
    episodeNumber,
    language,
  });

  if (!source) {
    return NextResponse.json({ tracks: [] });
  }

  const admin = createSupabaseAdminClient();
  const bucket = process.env.SUBTITLE_BUCKET || 'subtitles';

  const vttText = normalizeSubtitleText(source.content, source.format);

  const vttPath = buildSubtitleCachePath({
    userId: user.id,
    tmdbId,
    mediaType,
    seasonNumber,
    episodeNumber,
    language: source.language,
  });

  const uploadResult = await admin.storage.from(bucket).upload(
    vttPath,
    new Blob([vttText], { type: 'text/vtt' }),
    {
      contentType: 'text/vtt',
      upsert: true,
    }
  );

  if (uploadResult.error) {
    return NextResponse.json(
      { error: uploadResult.error.message },
      { status: 500 }
    );
  }

  const {
    data: { publicUrl },
  } = admin.storage.from(bucket).getPublicUrl(vttPath);

  const expiresAt = getExpiryDate(mediaType, progressPercent);

  const upsertPayload = {
    user_id: user.id,
    tmdb_id: tmdbId,
    media_type: mediaType,
    season_number: seasonNumber,
    episode_number: episodeNumber,
    language: source.language,
    label: source.label,
    source_format: source.format,
    source_url: source.sourceUrl ?? null,
    source_path: null,
    vtt_path: vttPath,
    vtt_public_url: publicUrl,
    progress_percent: progressPercent,
    is_completed: isCompleted(progressPercent),
    last_used_at: nowIso,
    expires_at: expiresAt,
    metadata: {},
  };

  await supabase.from('subtitle_cache').upsert(upsertPayload, {
    onConflict:
      'user_id,tmdb_id,media_type,season_number,episode_number,language',
  });

  return NextResponse.json({
    tracks: [
      {
        language: source.language,
        label: source.label,
        url: publicUrl,
      },
    ] satisfies SubtitleTrack[],
  });
}