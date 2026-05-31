'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

type Episode = {
  id: number;
  name: string;
  overview?: string;
  episode_number: number;
  still_path?: string | null;
  air_date?: string;
  runtime?: number | null;
};

type Season = {
  id: number;
  name: string;
  season_number: number;
  episodes: Episode[];
};

function tmdbImage(path: string | null | undefined, size: string) {
  return path ? `/tmdb-images/${size}${path}` : '/poster-placeholder.png';
}

function formatRuntime(runtime?: number | null) {
  if (!runtime || Number.isNaN(runtime)) return null;
  return `${runtime} min`;
}

export function TvSeasonEpisodePicker({
  showId,
  seasons,
}: {
  showId: number;
  seasons: Season[];
}) {
  const initialSeason =
    seasons.find((season) => season.season_number >= 1)?.season_number ?? 1;

  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState(initialSeason);

  const activeSeason = useMemo(() => {
    return (
      seasons.find((season) => season.season_number === selectedSeasonNumber) ?? seasons[0] ?? null
    );
  }, [selectedSeasonNumber, seasons]);

  if (!seasons.length || !activeSeason) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
        <h2 className="text-2xl font-bold text-white">Episodes</h2>
        <p className="mt-3 text-sm text-gray-400">No season or episode data is available.</p>
      </section>
    );
  }

  return (
    <section className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-red-400">
            Browse episodes
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white md:text-3xl">
            Seasons & Episodes
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {seasons.map((season) => {
            const active = season.season_number === activeSeason.season_number;

            return (
              <button
                key={season.id}
                type="button"
                onClick={() => setSelectedSeasonNumber(season.season_number)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? 'bg-red-500 text-white shadow-[0_10px_30px_rgba(239,68,68,0.35)]'
                    : 'border border-white/10 bg-white/5 text-gray-200 hover:bg-white/10'
                }`}
              >
                Season {season.season_number}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300">
            Season {activeSeason.season_number}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300">
            {activeSeason.episodes.length} episode{activeSeason.episodes.length > 1 ? 's' : ''}
          </span>
          {/* {activeSeason.name ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300">
              {activeSeason.name}
            </span>
          ) : null} */}
        </div>
      </div>

      <div className="grid gap-4">
        {activeSeason.episodes.map((episode) => (
          <Link
            key={episode.id}
            href={`/watch/tv/${showId}?season=${activeSeason.season_number}&episode=${episode.episode_number}`}
            className="group grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:-translate-y-0.5 hover:bg-white/10 md:grid-cols-[220px_1fr]"
          >
            <div className="relative aspect-video overflow-hidden rounded-xl bg-white/5">
              <Image
                src={tmdbImage(episode.still_path, 'w500')}
                alt={episode.name}
                fill
                sizes="(max-width: 768px) 100vw, 220px"
                className="object-cover transition duration-300 group-hover:scale-[1.03]"
              />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-300">
                  Episode {episode.episode_number}
                </span>

                {episode.air_date ? (
                  <span className="text-xs text-gray-400">{episode.air_date}</span>
                ) : null}

                {formatRuntime(episode.runtime) ? (
                  <span className="text-xs text-gray-400">
                    · {formatRuntime(episode.runtime)}
                  </span>
                ) : null}
              </div>

              <h3 className="mt-3 text-lg font-bold text-white">{episode.name}</h3>

              <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-400">
                {episode.overview || 'No episode overview available.'}
              </p>

              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-white transition group-hover:bg-red-600">
                  ▶
                </span>
                Watch episode
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}