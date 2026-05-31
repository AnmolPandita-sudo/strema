'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function toggleWatchlist({
  tmdbId,
  mediaType,
  revalidate = [],
}: {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  revalidate?: string[];
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data: existing, error: findError } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('tmdb_id', tmdbId)
    .eq('media_type', mediaType)
    .maybeSingle();

  if (findError) throw findError;

  if (existing?.id) {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('id', existing.id);

    if (error) throw error;

    revalidatePath('/');
    revalidatePath('/watchlist');
    revalidatePath(`/movie/${tmdbId}`);
    revalidatePath(`/tv/${tmdbId}`);

    for (const path of revalidate) {
      revalidatePath(path);
    }

    return { saved: false };
  }

  const { error } = await supabase.from('favorites').insert({
    user_id: user.id,
    tmdb_id: tmdbId,
    media_type: mediaType,
  });

  if (error) throw error;

  revalidatePath('/');
  revalidatePath('/watchlist');
  revalidatePath(`/movie/${tmdbId}`);
  revalidatePath(`/tv/${tmdbId}`);

  for (const path of revalidate) {
    revalidatePath(path);
  }

  return { saved: true };
}