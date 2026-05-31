'use client';

import { useRouter } from 'next/navigation';

type SeasonOption = {
  id: number;
  name?: string;
  season_number: number;
};

type EpisodeOption = {
  id: number;
  name: string;
  episode_number: number;
};

export function TvWatchControls({
  showId,
  selectedSeason,
  selectedEpisode,
  seasons,
  episodes,
}: {
  showId: number;
  selectedSeason: number;
  selectedEpisode: number;
  seasons: SeasonOption[];
  episodes: EpisodeOption[];
}) {
  const router = useRouter();

  return (
    <div className="space-y-5">
      <div>
        <label
          htmlFor="season-select"
          className="mb-2 block text-sm font-medium text-gray-300"
        >
          Season
        </label>

        <select
          id="season-select"
          className="w-full rounded-2xl border border-white/10 bg-[#14141b] px-4 py-3 text-sm text-white outline-none transition focus:border-red-500"
          value={selectedSeason}
          onChange={(e) => {
            const nextSeason = Number(e.target.value);
            router.push(`/watch/tv/${showId}?season=${nextSeason}&episode=1`);
          }}
        >
          {seasons.map((item) => (
            <option key={item.id} value={item.season_number}>
              Season {item.season_number}
              {item.name && item.name !== `Season ${item.season_number}`
                ? ` · ${item.name}`
                : ''}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="episode-select"
          className="mb-2 block text-sm font-medium text-gray-300"
        >
          Episode
        </label>

        <select
          id="episode-select"
          className="w-full rounded-2xl border border-white/10 bg-[#14141b] px-4 py-3 text-sm text-white outline-none transition focus:border-red-500"
          value={selectedEpisode}
          onChange={(e) => {
            const nextEpisode = Number(e.target.value);
            router.push(
              `/watch/tv/${showId}?season=${selectedSeason}&episode=${nextEpisode}`
            );
          }}
        >
          {episodes.map((item) => (
            <option key={item.id} value={item.episode_number}>
              Episode {item.episode_number} · {item.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}