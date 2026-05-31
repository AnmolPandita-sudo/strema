import '../../../globals.css';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  fetchTvDetailsFull,
  fetchTvSeasonDetails,
  getReleaseDate,
  getTitle,
} from '@/lib/tmdb';
import { WatchPlayer } from '@/components/watch-player';
import { TvWatchControls } from '@/components/tv-watch-controls';

export const revalidate = 3600;

export default async function WatchTvPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ season?: string; episode?: string }>;
}) {
  const { id } = await params;
  const { season: seasonParam, episode: episodeParam } = await searchParams;

  const tvId = Number(id);
  const season = Number(seasonParam ?? 1);
  const episode = Number(episodeParam ?? 1);

  if (!tvId || Number.isNaN(tvId)) notFound();
  if (!season || Number.isNaN(season)) notFound();
  if (!episode || Number.isNaN(episode)) notFound();

  const show = await fetchTvDetailsFull(tvId).catch(() => null);

  if (!show) notFound();

  const validSeasons =
    (show.seasons ?? []).filter(
      (item) =>
        typeof item.season_number === 'number' &&
        item.season_number >= 1 &&
        (item.episode_count ?? 0) > 0
    ) ?? [];

  const fallbackSeason =
    validSeasons.find((item) => item.season_number === season)?.season_number ??
    validSeasons[0]?.season_number ??
    1;

  const seasonDetails = await fetchTvSeasonDetails(show.id, fallbackSeason).catch(
    () => null
  );

  const episodes =
    seasonDetails?.episodes?.filter(
      (item) =>
        typeof item.episode_number === 'number' && item.episode_number >= 1
    ) ?? [];

  const selectedEpisode =
    episodes.find((item) => item.episode_number === episode) ?? episodes[0] ?? null;

  const activeEpisodeNumber = selectedEpisode?.episode_number ?? 1;
  const currentEpisodeIndex = episodes.findIndex(
    (item) => item.episode_number === activeEpisodeNumber
  );

  const previousEpisode =
    currentEpisodeIndex > 0 ? episodes[currentEpisodeIndex - 1] : null;

  const nextEpisode =
    currentEpisodeIndex >= 0 && currentEpisodeIndex < episodes.length - 1
      ? episodes[currentEpisodeIndex + 1]
      : null;

  const selectedSeasonMeta =
    validSeasons.find((item) => item.season_number === fallbackSeason) ?? null;

  return (
    <main className="min-h-screen bg-[#0b0b0f] text-white">
      <section className="mx-auto max-w-7xl px-6 py-8 md:px-10">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href={`/tv/${show.id}`}
              className="mb-3 inline-flex items-center gap-2 text-sm text-gray-400 transition hover:text-white"
            >
              ← Back to details
            </Link>

            <h1 className="text-3xl font-black tracking-tight md:text-5xl">
              {getTitle(show)}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-400 md:text-base">
              {show.vote_average ? (
                <span className="font-semibold text-red-500">
                  ★ {show.vote_average.toFixed(1)}
                </span>
              ) : null}
              <span>{getReleaseDate(show) ?? 'Release unavailable'}</span>
              <span>· Season {fallbackSeason}</span>
              <span>· Episode {activeEpisodeNumber}</span>
            </div>
          </div>
        </div>

        <WatchPlayer
          tmdbId={show.id}
          mediaType="tv"
          title={`${getTitle(show)} — S${fallbackSeason} E${activeEpisodeNumber}`}
          season={fallbackSeason}
          episode={activeEpisodeNumber}
          initialProvider="vidking"
        />

        <section className="mt-8 grid gap-6 lg:grid-cols-[340px_1fr]">
          <aside className="space-y-6">
            
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
              <h2 className="text-lg font-bold text-white">Playback controls</h2>

              <div className="mt-5 space-y-5">
                <TvWatchControls
                  showId={show.id}
                  selectedSeason={fallbackSeason}
                  selectedEpisode={activeEpisodeNumber}
                  seasons={validSeasons}
                  episodes={episodes}
                />

                <div className="flex flex-wrap gap-2">
                  {validSeasons.map((item) => (
                    <Link
                      key={item.id}
                      href={`/watch/tv/${show.id}?season=${item.season_number}&episode=1`}
                      className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                        item.season_number === fallbackSeason
                          ? 'bg-red-500 text-white'
                          : 'border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      S{item.season_number}
                    </Link>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  {previousEpisode ? (
                    <Link
                      href={`/watch/tv/${show.id}?season=${fallbackSeason}&episode=${previousEpisode.episode_number}`}
                      className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:bg-white/10"
                    >
                      ← Previous
                    </Link>
                  ) : (
                    <span className="inline-flex cursor-not-allowed items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-500">
                      ← Previous
                    </span>
                  )}

                  {nextEpisode ? (
                    <Link
                      href={`/watch/tv/${show.id}?season=${fallbackSeason}&episode=${nextEpisode.episode_number}`}
                      className="inline-flex items-center justify-center rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
                    >
                      Next →
                    </Link>
                  ) : (
                    <span className="inline-flex cursor-not-allowed items-center justify-center rounded-full bg-white/5 px-4 py-2 text-sm font-semibold text-gray-500">
                      Next →
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
              <h2 className="text-lg font-bold text-white">Season info</h2>
              <div className="mt-4 space-y-2 text-sm text-gray-300">
                <p>
                  Season: <span className="font-semibold text-white">{fallbackSeason}</span>
                </p>
                <p>
                  Episodes:{' '}
                  <span className="font-semibold text-white">
                    {selectedSeasonMeta?.episode_count ?? episodes.length ?? '—'}
                  </span>
                </p>
                <p>
                  Show status:{' '}
                  <span className="font-semibold text-white">{show.status ?? '—'}</span>
                </p>
                <p>
                  Total seasons:{' '}
                  <span className="font-semibold text-white">
                    {show.number_of_seasons ?? '—'}
                  </span>
                </p>
              </div>
            </div>
          </aside>

          <div className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-red-500">
                    Now watching
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-white">
                    Episode {activeEpisodeNumber}
                    {selectedEpisode?.name ? ` · ${selectedEpisode.name}` : ''}
                  </h2>
                </div>

                {selectedEpisode?.air_date ? (
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-300">
                    Air date: {selectedEpisode.air_date}
                  </span>
                ) : null}
              </div>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base">
                {selectedEpisode?.overview || 'No episode overview available.'}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {episodes.slice(0, 12).map((item) => {
                  const active = item.episode_number === activeEpisodeNumber;

                  return (
                    <></>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-white">Episodes</h2>
                <span className="text-xs text-gray-400">
                  {episodes.length} episodes in this season
                </span>
              </div>

              {episodes.length > 0 ? (
                <div className="space-y-2">
                  {episodes.map((item) => {
                    const active = item.episode_number === activeEpisodeNumber;

                    return (
                      <Link
                        key={item.id}
                        href={`/watch/tv/${show.id}?season=${fallbackSeason}&episode=${item.episode_number}`}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
                          active
                            ? 'border-red-500 bg-red-500/10'
                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-xs text-gray-300">
                            <span className="rounded-full bg-white/10 px-2 py-0.5 font-semibold text-white">
                              Ep {item.episode_number}
                            </span>
                            {item.runtime ? <span>{item.runtime} min</span> : null}
                            {item.air_date ? <span>· {item.air_date}</span> : null}
                          </div>
                          <p className="mt-1 truncate text-[13px] text-gray-100">
                            {item.name}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            active
                              ? 'bg-red-500 text-white'
                              : 'border border-white/10 bg-white/5 text-gray-200'
                          }`}
                        >
                          {active ? 'Playing' : 'Play'}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-gray-400">
                  No episodes found for this season.
                </div>
              )}
            </section>
          </div>
        </section>
      </section>
    </main>
  );
}