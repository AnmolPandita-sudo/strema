import { createClient } from '@/lib/supabase/server';

export type WatchlistRow = {
  id?: string;
  user_id: string;
  tmdb_id: number;
  media_type: 'movie' | 'tv';
  created_at?: string;
};

export async function getUserWatchlist(): Promise<WatchlistRow[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('favorites')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getUserWatchlist error:', error);
    return [];
  }

  return (data ?? []) as WatchlistRow[];
}