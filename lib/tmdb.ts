import axios from 'axios';
import axiosRetry from 'axios-retry';
import https from 'https';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export type TmdbMediaType = 'movie' | 'tv';

export type TmdbEpisode = {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  air_date?: string;
  vote_average?: number;
  runtime?: number | null;
};

export type TmdbSeasonDetails = {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
  air_date?: string;
  episodes: TmdbEpisode[];
};

export type TmdbTvSeasonSummary = {
  id: number;
  name: string;
  overview?: string;
  poster_path?: string | null;
  season_number: number;
  episode_count?: number;
  air_date?: string;
};

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbListResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TmdbMovie {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  adult?: boolean;
  original_language?: string;
  media_type?: 'movie' | 'tv';
}

export interface TmdbMovieDetails extends TmdbMovie {
  runtime?: number;
  genres?: { id: number; name: string }[];
  tagline?: string;
}

export interface TmdbTvDetails extends TmdbMovie {
  genres?: { id: number; name: string }[];
  tagline?: string;
  episode_run_time?: number[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
  seasons?: TmdbTvSeasonSummary[];
}

export interface TmdbCreditsResponse {
  id: number;
  cast: {
    id: number;
    name: string;
    character?: string;
    profile_path?: string | null;
  }[];
  crew: {
    id: number;
    name: string;
    job?: string;
    profile_path?: string | null;
  }[];
}

export interface TmdbAggregateCreditsResponse {
  id: number;
  cast: {
    id: number;
    name: string;
    character?: string;
    roles?: { credit_id?: string; character?: string; episode_count?: number }[];
    profile_path?: string | null;
  }[];
  crew: {
    id: number;
    name: string;
    job?: string;
    department?: string;
    jobs?: { credit_id?: string; job?: string; episode_count?: number }[];
    profile_path?: string | null;
  }[];
}

export interface TmdbVideoItem {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official?: boolean;
}

export interface TmdbVideosResponse {
  id: number;
  results: TmdbVideoItem[];
}

export interface TmdbMovieDetailsFull extends TmdbMovieDetails {
  credits?: TmdbCreditsResponse;
  videos?: TmdbVideosResponse;
  recommendations?: TmdbListResponse<TmdbMovie>;
}

export interface TmdbTvDetailsFull extends TmdbTvDetails {
  aggregate_credits?: TmdbAggregateCreditsResponse;
  videos?: TmdbVideosResponse;
  recommendations?: TmdbListResponse<TmdbMovie>;
}

const tmdbClient = axios.create({
  baseURL: TMDB_BASE_URL,
  timeout: 15000,
  httpsAgent: new https.Agent({ keepAlive: true }),
});

axiosRetry(tmdbClient, {
  retries: 3,
  retryDelay: (retryCount, error) => {
    const retryAfter = error?.response?.headers?.['retry-after'];
    if (retryAfter) {
      const seconds = Number(retryAfter);
      if (!Number.isNaN(seconds)) return seconds * 1000;
    }
    return axiosRetry.exponentialDelay(retryCount);
  },
  retryCondition: (error) => {
    const status = error?.response?.status;
    return (
      error.code === 'ECONNRESET' ||
      error.code === 'ECONNABORTED' ||
      error.code === 'ETIMEDOUT' ||
      axiosRetry.isNetworkError(error) ||
      axiosRetry.isIdempotentRequestError(error) ||
      status === 429 ||
      (typeof status === 'number' && status >= 500)
    );
  },
});

function getAuthHeaders() {
  const token = process.env.TMDB_API_READ_ACCESS_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;

  if (token) {
    return {
      Authorization: `Bearer ${token}`,
      accept: 'application/json',
    };
  }

  if (apiKey) {
    return {
      accept: 'application/json',
    };
  }

  throw new Error('TMDB_API_READ_ACCESS_TOKEN or TMDB_API_KEY is missing');
}

async function tmdbFetch<T>(
  path: string,
  params: Record<string, string | number | undefined> = {}
): Promise<T> {
  const headers = getAuthHeaders();
  const token = process.env.TMDB_API_READ_ACCESS_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;

  const queryParams: Record<string, string | number> = {
    language: 'en-US',
  };

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      queryParams[key] = value;
    }
  }

  if (apiKey && !token) {
    queryParams.api_key = apiKey;
  }

  try {
    const response = await tmdbClient.get<T>(path, {
      headers,
      params: queryParams,
    });

    return response.data;
  } catch (error: any) {
    const status = error?.response?.status;
    const code = error?.code;
    const message =
      error?.response?.data?.status_message ||
      error?.message ||
      'Unknown error';

    throw new Error(
      `TMDB fetch failed for ${path}: ${status ? `HTTP ${status}` : code || message}${
        status && message
          ? ` - ${message}`
          : !status && code && message && code !== message
          ? ` - ${message}`
          : ''
      }`
    );
  }
}

function normalizeTmdbImagePath(path?: string | null) {
  if (!path) return null;
  return path.startsWith('/') ? path : `/${path}`;
}

export function getPosterUrl(
  path?: string | null,
  size: 'w300' | 'w500' | 'w780' = 'w500'
) {
  const normalizedPath = normalizeTmdbImagePath(path);
  return normalizedPath
    ? `${TMDB_IMAGE_BASE}/${size}${normalizedPath}`
    : '/poster-placeholder.png';
}

export function getBackdropUrl(
  path?: string | null,
  size: 'w780' | 'w1280' | 'original' = 'w1280'
) {
  const normalizedPath = normalizeTmdbImagePath(path);
  return normalizedPath
    ? `${TMDB_IMAGE_BASE}/${size}${normalizedPath}`
    : '/backdrop-placeholder.png';
}

export function getStillUrl(
  path?: string | null,
  size: 'w300' | 'w500' | 'w780' = 'w500'
) {
  const normalizedPath = normalizeTmdbImagePath(path);
  return normalizedPath
    ? `${TMDB_IMAGE_BASE}/${size}${normalizedPath}`
    : '/poster-placeholder.png';
}

export function getTitle(item: TmdbMovie) {
  return item.title ?? item.name ?? 'Untitled';
}

export function getReleaseDate(item: TmdbMovie) {
  return item.release_date ?? item.first_air_date ?? null;
}

export function pickBestTrailer(videos: TmdbVideoItem[]) {
  if (!videos?.length) return null;

  const youtubeVideos = videos.filter((video) => video.site === 'YouTube');

  return (
    youtubeVideos.find((video) => video.type === 'Trailer' && video.official) ??
    youtubeVideos.find((video) => video.type === 'Trailer') ??
    youtubeVideos.find((video) => video.type === 'Teaser' && video.official) ??
    youtubeVideos.find((video) => video.type === 'Teaser') ??
    youtubeVideos[0] ??
    null
  );
}

export function getYoutubeEmbedUrl(key: string, autoplay = false, mute = false) {
  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    mute: mute ? '1' : '0',
    controls: '0',
    rel: '0',
    playsinline: '1',
    iv_load_policy: '3',
    disablekb: '1',
    fs: '0',
    loop: '1',
    playlist: key,
    enablejsapi: '1',
  });

  return `https://www.youtube-nocookie.com/embed/${key}?${params.toString()}`;
}

export async function fetchMovieTrailer(movieId: number) {
  const videos = await fetchMovieVideos(movieId);
  return pickBestTrailer(videos.results ?? []);
}

export async function fetchTvTrailer(tvId: number) {
  const videos = await fetchTvVideos(tvId);
  return pickBestTrailer(videos.results ?? []);
}

export async function fetchPopularMovies(page = 1) {
  return tmdbFetch<TmdbListResponse<TmdbMovie>>('/movie/popular', { page });
}

export async function fetchTrendingMovies(timeWindow: 'day' | 'week' = 'week') {
  return tmdbFetch<TmdbListResponse<TmdbMovie>>(`/trending/movie/${timeWindow}`);
}

export async function fetchNowPlayingMovies(page = 1) {
  return tmdbFetch<TmdbListResponse<TmdbMovie>>('/movie/now_playing', { page });
}

export async function fetchMovieDetails(movieId: number) {
  return tmdbFetch<TmdbMovieDetails>(`/movie/${movieId}`);
}

export async function fetchMovieDetailsFull(movieId: number) {
  return tmdbFetch<TmdbMovieDetailsFull>(`/movie/${movieId}`, {
    append_to_response: 'videos,credits,recommendations',
  });
}

export async function fetchSimilarMovies(movieId: number) {
  return tmdbFetch<TmdbListResponse<TmdbMovie>>(`/movie/${movieId}/similar`);
}

export async function fetchMovieCredits(movieId: number) {
  return tmdbFetch<TmdbCreditsResponse>(`/movie/${movieId}/credits`);
}

export async function fetchMovieVideos(movieId: number) {
  return tmdbFetch<TmdbVideosResponse>(`/movie/${movieId}/videos`);
}

export async function searchMovies(query: string, page = 1) {
  return tmdbFetch<TmdbListResponse<TmdbMovie>>('/search/movie', {
    query,
    page,
    include_adult: 'false',
  });
}

export async function fetchPopularTv(page = 1) {
  return tmdbFetch<TmdbListResponse<TmdbMovie>>('/tv/popular', { page });
}

export async function fetchTrendingTv(timeWindow: 'day' | 'week' = 'week') {
  return tmdbFetch<TmdbListResponse<TmdbMovie>>(`/trending/tv/${timeWindow}`);
}

export async function fetchTvDetails(tvId: number) {
  return tmdbFetch<TmdbTvDetails>(`/tv/${tvId}`);
}

export async function fetchTvDetailsFull(tvId: number) {
  return tmdbFetch<TmdbTvDetailsFull>(`/tv/${tvId}`, {
    append_to_response: 'videos,aggregate_credits,recommendations',
  });
}

export async function fetchSimilarTv(tvId: number) {
  return tmdbFetch<TmdbListResponse<TmdbMovie>>(`/tv/${tvId}/similar`);
}

export async function fetchTvVideos(tvId: number) {
  return tmdbFetch<TmdbVideosResponse>(`/tv/${tvId}/videos`);
}

export async function searchTv(query: string, page = 1) {
  return tmdbFetch<TmdbListResponse<TmdbMovie>>('/search/tv', {
    query,
    page,
    include_adult: 'false',
  });
}

export async function fetchDiscoverMovies(genreId?: number, page = 1, countryCode?: string) {
  return tmdbFetch<TmdbListResponse<TmdbMovie>>('/discover/movie', {
    with_genres: genreId,
    page,
    with_origin_country: countryCode,
    sort_by: 'popularity.desc',
  });
}

export async function fetchDiscoverTv(genreId?: number, page = 1, countryCode?: string) {
  return tmdbFetch<TmdbListResponse<TmdbMovie>>('/discover/tv', {
    with_genres: genreId,
    page,
    with_origin_country: countryCode,
    sort_by: 'popularity.desc',
  });
}

export async function fetchMoviesByGenre(genreId: number, page = 1) {
  return tmdbFetch<TmdbListResponse<TmdbMovie>>('/discover/movie', {
    with_genres: genreId,
    page,
  });
}

export async function fetchMovieGenres() {
  const res = await tmdbFetch<{ genres: TmdbGenre[] }>('/genre/movie/list');
  return res.genres;
}

export async function fetchTvGenres() {
  const res = await tmdbFetch<{ genres: TmdbGenre[] }>('/genre/tv/list');
  return res.genres;
}

export async function fetchTrendingAll(timeWindow: 'day' | 'week' = 'day') {
  return tmdbFetch<TmdbListResponse<TmdbMovie & { media_type: 'movie' | 'tv' }>>(
    `/trending/all/${timeWindow}`
  );
}

export async function fetchTopRatedMovies(page = 1) {
  return tmdbFetch<TmdbListResponse<TmdbMovie>>('/movie/top_rated', { page });
}

export async function fetchTopRatedTv(page = 1) {
  return tmdbFetch<TmdbListResponse<TmdbMovie>>('/tv/top_rated', { page });
}

export async function fetchTvCredits(tvId: number) {
  return tmdbFetch<TmdbAggregateCreditsResponse>(`/tv/${tvId}/aggregate_credits`);
}

export async function fetchTvSeasonDetails(tvId: number, seasonNumber: number) {
  return tmdbFetch<TmdbSeasonDetails>(`/tv/${tvId}/season/${seasonNumber}`);
}

export async function fetchMovieRecommendations(movieId: number, page = 1) {
  return tmdbFetch<TmdbListResponse<TmdbMovie>>(`/movie/${movieId}/recommendations`, {
    page,
  });
}

export async function fetchTvRecommendations(tvId: number, page = 1) {
  return tmdbFetch<TmdbListResponse<TmdbMovie>>(`/tv/${tvId}/recommendations`, {
    page,
  });
}