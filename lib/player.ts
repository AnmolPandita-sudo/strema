export type MediaType = 'movie' | 'tv';

export type PlayerProviderKey =
  | 'superembed'
  | 'superembed_vip'
  | 'vidking'
  | 'vidsrc';

export type BuildPlayerUrlInput = {
  provider: PlayerProviderKey;
  mediaType: MediaType;
  tmdbId: number;
  imdbId?: string | null;
  season?: number | null;
  episode?: number | null;
  server?: string | null;
  autoplay?: boolean;
  subtitleLanguage?: string | null;
  progressSeconds?: number | null;
};

export const PROVIDER_PRIORITY: PlayerProviderKey[] = [
  'superembed',
  'vidking',
  'vidsrc',
  'superembed_vip',
];

export function normalizeMediaType(value: string): MediaType {
  return value === 'tv' ? 'tv' : 'movie';
}

export function isValidProvider(value: string | null | undefined): value is PlayerProviderKey {
  return (
    value === 'superembed' ||
    value === 'superembed_vip' ||
    value === 'vidking' ||
    value === 'vidsrc'
  );
}

export function getProviderLabel(provider: PlayerProviderKey) {
  switch (provider) {
    case 'superembed':
      return 'SuperEmbed';
    case 'superembed_vip':
      return 'SuperEmbed VIP';
    case 'vidking':
      return 'VidKing';
    case 'vidsrc':
      return 'VidSrc';
    default:
      return 'Player';
  }
}

export function getDefaultSeasonEpisode(
  mediaType: MediaType,
  season?: number | null,
  episode?: number | null
) {
  if (mediaType === 'movie') {
    return {
      season: null,
      episode: null,
    };
  }

  return {
    season: season && season > 0 ? season : 1,
    episode: episode && episode > 0 ? episode : 1,
  };
}

export function buildPlayerUrl({
  provider,
  mediaType,
  tmdbId,
  imdbId,
  season,
  episode,
  server,
  autoplay = true,
  subtitleLanguage,
  progressSeconds,
}: BuildPlayerUrlInput) {
  const normalized = getDefaultSeasonEpisode(mediaType, season, episode);

  if (provider === 'vidking') {
    const params = new URLSearchParams();

    if (autoplay) params.set('autoPlay', 'true');
    if (server) params.set('server', server);
    if (progressSeconds && progressSeconds > 0) {
      params.set('progress', String(progressSeconds));
    }

    if (mediaType === 'movie') {
      const qs = params.toString();
      return `https://www.vidking.net/embed/movie/${tmdbId}${qs ? `?${qs}` : ''}`;
    }

    params.set('nextEpisode', 'true');
    params.set('episodeSelector', 'true');

    const qs = params.toString();
    return `https://www.vidking.net/embed/tv/${tmdbId}/${normalized.season}/${normalized.episode}${qs ? `?${qs}` : ''}`;
  }

  if (provider === 'vidsrc') {
    const normalized = getDefaultSeasonEpisode(mediaType, season, episode);
    const params = new URLSearchParams();

    if (imdbId) {
      params.set('imdb', imdbId);
    } else {
      params.set('tmdb', String(tmdbId));
    }

    if (subtitleLanguage) {
      params.set('ds_lang', subtitleLanguage);
    } else {
      params.set('ds_lang', 'en'); // default to English
    }

    if (autoplay) {
      params.set('autoplay', '1');
    }

    if (mediaType === 'movie') {
      // Either path or query style; both are valid
      // return `https://vidsrc-embed.ru/embed/movie/${tmdbId}`;
      return `https://vidsrc-embed.ru/embed/movie?${params.toString()}`;
    }

    // TV episode
    params.set('season', String(normalized.season));
    params.set('episode', String(normalized.episode));
    params.set('autonext', '1');

    return `https://vidsrc-embed.ru/embed/tv?${params.toString()}`;
  }

  if (provider === 'superembed_vip') {
    const params = new URLSearchParams({
      video_id: String(tmdbId),
      tmdb: '1',
      vip: '1',
    });

    if (mediaType === 'tv') {
      params.set('season', String(normalized.season));
      params.set('episode', String(normalized.episode));
    }

    if (server) params.set('server', server);

    return `/se_player.php?${params.toString()}`;
  }

  const params = new URLSearchParams({
    video_id: String(tmdbId),
    tmdb: '1',
  });

  if (mediaType === 'tv') {
    params.set('season', String(normalized.season));
    params.set('episode', String(normalized.episode));
  }

  if (server) params.set('server', server);

  return `/se_player.php?${params.toString()}`;
}