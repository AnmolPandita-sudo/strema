// lib/use-subtitles.ts
'use client';

import { useEffect, useState } from 'react';

export type SubtitleTrack = {
  language: string;
  label: string;
  url: string;
};

type Params = {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  progressPercent?: number | null;
  language?: string;
};

export function useSubtitles({
  tmdbId,
  mediaType,
  seasonNumber,
  episodeNumber,
  progressPercent,
  language = 'en',
}: Params) {
  const [tracks, setTracks] = useState<SubtitleTrack[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      try {
        const params = new URLSearchParams({
          tmdbId: String(tmdbId),
          mediaType,
          language,
        });

        if (seasonNumber != null) {
          params.set('seasonNumber', String(seasonNumber));
        }

        if (episodeNumber != null) {
          params.set('episodeNumber', String(episodeNumber));
        }

        if (progressPercent != null) {
          params.set('progressPercent', String(progressPercent));
        }

        const response = await fetch(`/api/subtitles?${params.toString()}`);
        const data = (await response.json()) as { tracks?: SubtitleTrack[] };

        if (!cancelled) {
          setTracks(data.tracks ?? []);
        }
      } catch {
        if (!cancelled) {
          setTracks([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [tmdbId, mediaType, seasonNumber, episodeNumber, progressPercent, language]);

  return { tracks, loading };
}