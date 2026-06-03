import '../../../globals.css';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  fetchMovieDetailsFull,
  getReleaseDate,
  getTitle,
} from '@/lib/tmdb';
import { WatchPlayer } from '@/components/watch-player';
import { SubtitleConverterPanel } from '@/components/subtitle-converter-panel';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const revalidate = 3600;

async function getSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );
}

export default async function WatchMoviePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const movieId = Number(id);

  if (!movieId || Number.isNaN(movieId)) notFound();

  const movie = await fetchMovieDetailsFull(movieId).catch(() => null);
  if (!movie) notFound();

  // NEW: load last provider from continue_watching for this movie
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialProvider: 'vidking' | 'vidsrc' = 'vidking';

  if (user) {
    const { data: cwRow } = await supabase
      .from('continue_watching')
      .select('provider_key')
      .eq('user_id', user.id)
      .eq('tmdb_id', movieId)
      .eq('media_type', 'movie')
      .order('last_position_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cwRow?.provider_key === 'vidking' || cwRow?.provider_key === 'vidsrc') {
      initialProvider = cwRow.provider_key;
    }
  }

  return (
    <main className="min-h-screen bg-[#0b0b0f] text.white">
      <section className="mx-auto max-w-7xl px-6 py-8 md:px-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href={`/movie/${movie.id}`}
              className="mb-3 inline-flex items-center gap-2 text-sm text-gray-400 transition hover:text-white"
            >
              ← Back to details
            </Link>

            <h1 className="text-3xl font-black tracking-tight md:text-5xl">
              {getTitle(movie)}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-400 md:text-base">
              {movie.vote_average ? (
                <span className="font-semibold text-red-500">
                  ★ {movie.vote_average.toFixed(1)}
                </span>
              ) : null}
              <span>{getReleaseDate(movie) ?? 'Release unavailable'}</span>
              {movie.runtime ? <span>· {movie.runtime} min</span> : null}
            </div>
          </div>
        </div>

        <WatchPlayer
          tmdbId={movie.id}
          mediaType="movie"
          title={getTitle(movie)}
          initialProvider={initialProvider}
        />

        <SubtitleConverterPanel title={getTitle(movie)} />
      </section>
    </main>
  );
}