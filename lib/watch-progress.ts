import { createClient } from '@/lib/supabase/server';

export type LastWatchRow = {
  user_id: string;
  tmdb_id: number;
  media_type: 'movie' | 'tv';
  season_number?: number | null;
  episode_number?: number | null;
  progress_seconds?: number | null;
  progress_percent?: number | null;
  updated_at: string;
};

export async function getLastProgressForTitle(
  userId: string,
  tmdbId: number
): Promise<LastWatchRow | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('watch_history')
    .select('*')
    .eq('tmdb_id', tmdbId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as LastWatchRow) ?? null;
}