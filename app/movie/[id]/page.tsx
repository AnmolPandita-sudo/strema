import '../../globals.css';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  fetchMovieDetailsFull,
  getReleaseDate,
  getTitle,
  getYoutubeEmbedUrl,
  pickBestTrailer,
} from '@/lib/tmdb';
import { DetailHeroShell } from '@/components/detail-hero-shell';
import { WatchlistButton } from '@/components/watchlist-button';
import { getUserWatchlist } from '@/lib/watchlist';

export const revalidate = 3600;

function tmdbImage(path: string | null | undefined, size: string) {
  return path ? `/tmdb-images/${size}${path}` : '/poster-placeholder.png';
}

export default async function MoviePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const movieId = Number(id);

  if (!movieId || Number.isNaN(movieId)) notFound();

  const [movie, watchlistRows] = await Promise.all([
    fetchMovieDetailsFull(movieId).catch(() => null),
    getUserWatchlist().catch(() => []),
  ]);

  if (!movie) notFound();

  const cast = movie.credits?.cast?.slice(0, 12) ?? [];
  const crew = movie.credits?.crew?.slice(0, 4) ?? [];
  const related = movie.recommendations?.results?.slice(0, 8) ?? [];
  const genres = movie.genres ?? [];
  const trailer = pickBestTrailer(movie.videos?.results ?? []);

  const isSaved = watchlistRows.some(
    (row) => row.media_type === 'movie' && Number(row.tmdb_id) === Number(id)
  );

  const trailerUrl = trailer?.key ? getYoutubeEmbedUrl(trailer.key, true, true) : null;
  const playHref = `/watch/movie/${movie.id}`;

  return (
    <main className="min-h-screen bg-[#0b0b0f] text-white">
      <DetailHeroShell
        imageSrc={tmdbImage(movie.backdrop_path, 'w1280')}
        imageAlt={getTitle(movie)}
        trailerUrl={trailerUrl}
      >
        <div className="max-w-3xl space-y-4">
          <h1 className="text-4xl font-black leading-tight tracking-tight md:text-6xl">
            {getTitle(movie)}
          </h1>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-300 md:text-base">
            {movie.vote_average ? (
              <span className="flex items-center gap-1 font-semibold text-red-500">
                ★ {movie.vote_average.toFixed(1)}
              </span>
            ) : null}
            <span>{getReleaseDate(movie) ?? 'Release unavailable'}</span>
            {movie.runtime ? <span>· {movie.runtime} min</span> : null}
            {genres.slice(0, 2).map((g) => (
              <span key={g.id}>· {g.name}</span>
            ))}
          </div>

          <p className="max-w-2xl text-sm leading-7 text-gray-300 line-clamp-3 md:text-base">
            {movie.overview || 'No overview available.'}
          </p>

          <div className="flex items-center gap-3 pt-2">
            <Link
              href={playHref}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-red-500 px-7 py-3 font-bold text-white transition hover:bg-red-600 active:scale-95"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              Play
            </Link>

            <WatchlistButton tmdbId={movie.id} mediaType="movie" initialSaved={isSaved} />
          </div>
        </div>
      </DetailHeroShell>

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-12 md:px-10 lg:grid-cols-[1fr_320px]">
        <div className="space-y-14">
          <section>
            <div className="mb-5 flex items-center gap-3">
              <span className="h-6 w-1 rounded-full bg-red-600" />
              <h2 className="text-2xl font-bold">Actors</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {cast.map((person) => (
                <div
                  key={`${person.id}-${person.character ?? 'cast'}`}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 transition hover:-translate-y-0.5 hover:bg-white/10"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
                    <Image
                      src={tmdbImage(person.profile_path, 'w185')}
                      alt={person.name}
                      width={185}
                      height={185}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{person.name}</div>
                    <div className="mt-1 truncate text-sm text-gray-400">
                      {person.character ?? 'Unknown role'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-5 flex items-center gap-3">
              <span className="h-6 w-1 rounded-full bg-red-600" />
              <h2 className="text-2xl font-bold">You may like</h2>
            </div>

            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
              {related.map((item) => (
                <Link
                  key={item.id}
                  href={`/movie/${item.id}`}
                  className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition hover:-translate-y-1"
                >
                  <div className="relative aspect-[2/3] overflow-hidden">
                    <Image
                      src={tmdbImage(item.poster_path, 'w500')}
                      alt={getTitle(item)}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover transition duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-3">
                    <div className="line-clamp-1 font-semibold">{getTitle(item)}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                      <span className="text-red-500">★</span>
                      <span>{item.vote_average ? item.vote_average.toFixed(1) : '—'}</span>
                      <span>·</span>
                      <span>{getReleaseDate(item) ?? '—'}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-8 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
            <h2 className="mb-5 text-xl font-bold">Highlights</h2>
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Rating</span>
                <span className="font-semibold">
                  {movie.vote_average ? movie.vote_average.toFixed(1) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Votes</span>
                <span className="font-semibold">{movie.vote_count ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Popularity</span>
                <span className="font-semibold">
                  {movie.popularity ? movie.popularity.toFixed(1) : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Runtime</span>
                <span className="font-semibold">
                  {movie.runtime ? `${movie.runtime} min` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Language</span>
                <span className="font-semibold">
                  {movie.original_language?.toUpperCase() ?? '—'}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
            <h2 className="mb-5 text-xl font-bold">Key Crew</h2>
            <div className="space-y-4">
              {crew.map((person) => (
                <div
                  key={`${person.id}-${person.job ?? 'crew'}`}
                  className="border-b border-white/10 pb-4 last:border-none"
                >
                  <div className="font-semibold">{person.name}</div>
                  <div className="text-sm text-gray-400">{person.job ?? 'Crew'}</div>
                </div>
              ))}
            </div>
          </section>

          {genres.length > 0 && (
            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
              <h2 className="mb-4 text-xl font-bold">Genres</h2>
              <div className="flex flex-wrap gap-2">
                {genres.map((genre) => (
                  <span
                    key={genre.id}
                    className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
            </section>
          )}
        </aside>
      </section>
    </main>
  );
}