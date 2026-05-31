import '../../globals.css';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  fetchTvDetailsFull,
  fetchTvSeasonDetails,
  getReleaseDate,
  getTitle,
  getYoutubeEmbedUrl,
  pickBestTrailer,
  type TmdbSeasonDetails,
} from '@/lib/tmdb';
import { DetailHeroShell } from '@/components/detail-hero-shell';
import { WatchlistButton } from '@/components/watchlist-button';
import { getUserWatchlist } from '@/lib/watchlist';
import { TvSeasonEpisodePicker } from '@/components/tv-season-episode-picker';
import { getSessionUser } from '@/lib/auth/session';
import { getLastProgressForTitle } from '@/lib/watch-progress';

export const revalidate = 3600;

function tmdbImage(path: string | null | undefined, size: string) {
  return path ? `/tmdb-images/${size}${path}` : '/poster-placeholder.png';
}

async function getSeasonCollection(show: any): Promise<TmdbSeasonDetails[]> {
  const candidateSeasons =
    (show.seasons ?? []).filter(
      (item: any) =>
        typeof item.season_number === 'number' && item.season_number >= 1
    ) ?? [];

  const seasonDetails = await Promise.all(
    candidateSeasons.map(async (season: any) => {
      try {
        const details = await fetchTvSeasonDetails(show.id, season.season_number);

        if (!details || !Array.isArray(details.episodes)) {
          return null;
        }

        const episodes = details.episodes.filter(
          (episode: any) =>
            typeof episode.episode_number === 'number' &&
            episode.episode_number >= 1
        );

        if (!episodes.length) {
          return null;
        }

        return {
          ...details,
          episodes,
        };
      } catch (error) {
        console.error(
          `Failed to fetch season ${season.season_number} for show ${show.id}:`,
          error
        );
        return null;
      }
    })
  );

  return seasonDetails.filter(Boolean) as TmdbSeasonDetails[];
}

export default async function TvPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tvId = Number(id);

  if (!tvId || Number.isNaN(tvId)) notFound();

    const user = await getSessionUser(); // may be null if not logged in

  const [show, watchlistRows, lastProgress] = await Promise.all([
    fetchTvDetailsFull(tvId).catch(() => null),
    getUserWatchlist().catch(() => []),
    user ? getLastProgressForTitle(user.id, tvId).catch(() => null) : Promise.resolve(null),
  ]);

  if (!show) notFound();

  const seasonCollection = await getSeasonCollection(show);

  const cast = show.aggregate_credits?.cast?.slice(0, 12) ?? [];
  const crew = show.aggregate_credits?.crew?.slice(0, 4) ?? [];
  const related = show.recommendations?.results?.slice(0, 8) ?? [];
  const genres = show.genres ?? [];
  const trailer = pickBestTrailer(show.videos?.results ?? []);

  const isSaved = watchlistRows.some(
    (row) => row.media_type === 'tv' && Number(row.tmdb_id) === Number(id)
  );

  const trailerUrl = trailer?.key ? getYoutubeEmbedUrl(trailer.key, true, true) : null;
  const firstAvailableSeason = seasonCollection[0];
  const firstAvailableEpisode = firstAvailableSeason?.episodes?.[0];

  let targetSeason = firstAvailableSeason?.season_number ?? 1;
  let targetEpisode = firstAvailableEpisode?.episode_number ?? 1;

  if (
    lastProgress &&
    lastProgress.media_type === 'tv' &&
    typeof lastProgress.season_number === 'number' &&
    typeof lastProgress.episode_number === 'number'
  ) {
    targetSeason = lastProgress.season_number || targetSeason;
    targetEpisode = lastProgress.episode_number || targetEpisode;
  }

  const startHref = `/watch/tv/${show.id}?season=${targetSeason}&episode=${targetEpisode}`;

  return (
    <main className="min-h-screen bg-[#0b0b0f] text-white">
      <DetailHeroShell
        imageSrc={tmdbImage(show.backdrop_path, 'w1280')}
        imageAlt={getTitle(show)}
        trailerUrl={trailerUrl}
      >
        <div className="max-w-3xl space-y-4">
          <h1 className="text-4xl font-black leading-tight tracking-tight md:text-6xl">
            {getTitle(show)}
          </h1>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-300 md:text-base">
            {show.vote_average ? (
              <span className="flex items-center gap-1 font-semibold text-red-500">
                ★ {show.vote_average.toFixed(1)}
              </span>
            ) : null}
            <span>{getReleaseDate(show) ?? 'Release unavailable'}</span>
            {show.number_of_seasons ? (
              <span>
                · {show.number_of_seasons} season{show.number_of_seasons > 1 ? 's' : ''}
              </span>
            ) : null}
            {show.number_of_episodes ? (
              <span>· {show.number_of_episodes} episodes</span>
            ) : null}
            {genres.slice(0, 2).map((g) => (
              <span key={g.id}>· {g.name}</span>
            ))}
          </div>

          <p className="max-w-2xl text-sm leading-7 text-gray-300 line-clamp-3 md:text-base">
            {show.overview || 'No overview available.'}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <WatchlistButton tmdbId={show.id} mediaType="tv" initialSaved={isSaved} />

            {firstAvailableEpisode ? (
              <Link
                href={startHref}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-red-500 px-7 py-3 font-bold text-white transition hover:bg-red-600 active:scale-95"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                {lastProgress ? 'Continue Watching' : 'Start Watching'}
              </Link>
            ) : null}
          </div>
        </div>
      </DetailHeroShell>

      <section className="mx-auto max-w-7xl px-6 py-10 md:px-10">
        <TvSeasonEpisodePicker showId={show.id} seasons={seasonCollection} />
      </section>

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 pb-12 md:px-10 lg:grid-cols-[1fr_320px]">
        <div className="space-y-14">
          <section>
            <div className="mb-5 flex items-center gap-3">
              <span className="h-6 w-1 rounded-full bg-red-600" />
              <h2 className="text-2xl font-bold">Actors</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {cast.map((person: any) => {
                const character =
                  person.character ??
                  person.roles?.[0]?.character ??
                  'Unknown role';

                return (
                  <div
                    key={`${person.id}-${character}`}
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
                        {character}
                      </div>
                    </div>
                  </div>
                );
              })}
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
                  href={`/tv/${item.id}`}
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
                  {show.vote_average ? show.vote_average.toFixed(1) : '—'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400">Votes</span>
                <span className="font-semibold">{show.vote_count ?? '—'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400">Popularity</span>
                <span className="font-semibold">
                  {show.popularity ? show.popularity.toFixed(1) : '—'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400">Seasons</span>
                <span className="font-semibold">{show.number_of_seasons ?? '—'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400">Episodes</span>
                <span className="font-semibold">{show.number_of_episodes ?? '—'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400">Language</span>
                <span className="font-semibold">
                  {show.original_language?.toUpperCase() ?? '—'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400">Status</span>
                <span className="font-semibold">{show.status ?? '—'}</span>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
            <h2 className="mb-5 text-xl font-bold">Key Crew</h2>

            <div className="space-y-4">
              {crew.map((person: any) => {
                const job = person.job ?? person.jobs?.[0]?.job ?? 'Crew';

                return (
                  <div
                    key={`${person.id}-${job}`}
                    className="border-b border-white/10 pb-4 last:border-none"
                  >
                    <div className="font-semibold">{person.name}</div>
                    <div className="text-sm text-gray-400">{job}</div>
                  </div>
                );
              })}
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