export type MediaType = 'movie' | 'tv';

export type SubtitleCacheRow = {
  id: string;
  user_id: string;
  tmdb_id: number;
  media_type: MediaType;
  season_number: number | null;
  episode_number: number | null;
  language: string;
  label: string;
  source_format: 'srt' | 'vtt';
  source_url: string | null;
  source_path: string | null;
  vtt_path: string;
  vtt_public_url: string | null;
  progress_percent: number | null;
  is_completed: boolean;
  created_at: string;
  last_used_at: string;
  expires_at: string;
  metadata: Record<string, unknown>;
};

export type SubtitleTrack = {
  language: string;
  label: string;
  url: string;
};

export function isCompleted(progressPercent: number | null | undefined) {
  return (progressPercent ?? 0) >= 90;
}

export function getSubtitleTtlDays(
  mediaType: MediaType,
  progressPercent: number | null | undefined
) {
  const completed = isCompleted(progressPercent);

  if (!completed) return 10;
  if (mediaType === 'movie') return 3;
  return 5;
}

export function getExpiryDate(
  mediaType: MediaType,
  progressPercent: number | null | undefined
) {
  const ttlDays = getSubtitleTtlDays(mediaType, progressPercent);
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + ttlDays);
  return now.toISOString();
}

export function buildSubtitleCachePath(params: {
  userId: string;
  tmdbId: number;
  mediaType: MediaType;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  language: string;
}) {
  const safeLang = params.language.toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (params.mediaType === 'movie') {
    return `users/${params.userId}/movie/${params.tmdbId}/${safeLang}.vtt`;
  }
  return `users/${params.userId}/tv/${params.tmdbId}/s${params.seasonNumber ?? 1}e${params.episodeNumber ?? 1}/${safeLang}.vtt`;
}

export function srtToVtt(srt: string) {
  const normalized = srt.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const converted = normalized.replace(
    /(\d{2}:\d{2}:\d{2}),(\d{3})/g,
    '$1.$2'
  );

  if (converted.startsWith('WEBVTT')) {
    return converted;
  }

  return `WEBVTT\n\n${converted}`;
}

export function normalizeSubtitleText(input: string, format: 'srt' | 'vtt') {
  return format === 'vtt' ? input : srtToVtt(input);
}