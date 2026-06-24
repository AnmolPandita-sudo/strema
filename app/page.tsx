import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { Navbar } from '@/components/navbar';
import { HeroBanner } from '@/components/hero-banner';
import { SectionRow } from '@/components/section-row';
import { CountrySectionRow, CountryItem } from '@/components/country-section-row';
import { GenreSectionRow } from '@/components/genre-section-row';
import { getUserWatchlist } from '@/lib/watchlist';
import {
  fetchPopularMovies,
  fetchPopularTv,
  fetchTrendingAll,
  fetchTrendingMovies,
  fetchTrendingTv,
  fetchTopRatedMovies,
  fetchTopRatedTv,
  fetchMovieRecommendations,
  fetchTvRecommendations,
  fetchNowPlayingMovies,
  fetchMovieGenres,
  fetchMovieDetails,
  fetchTvDetails,
  fetchMovieTrailer,
  fetchTvTrailer,
  getTitle,
  TmdbListResponse,
  TmdbMovie,
} from '@/lib/tmdb';
import { Rat } from 'lucide-react';
import { RatingNotice } from '@/components/rating-notice';

type HomeMediaItem = {
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
  original_language?: string;
  media_type: 'movie' | 'tv';
  trailerKey?: string | null;
  href?: string;
  season?: number | null;
  episode?: number | null;
  progress?: number | null;
  genre_ids?: number[];
};

type PagedResponse<T> = {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
};

type WatchHistoryRow = {
  id: number;
  user_id: string;
  tmdb_id: number;
  media_type: 'movie' | 'tv';
  season_number?: number | null;
  episode_number?: number | null;
  progress_percent?: number | null;
  updated_at: string;
};

const EMPTY_LIST_RESPONSE: PagedResponse<HomeMediaItem> = {
  page: 1,
  results: [],
  total_pages: 1,
  total_results: 0,
};

const POPULAR_COUNTRIES: CountryItem[] = [
  { iso: 'IN', name: 'India', flag: '🇮🇳' },
  { iso: 'US', name: 'United States', flag: '🇺🇸' },
  { iso: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { iso: 'JP', name: 'Japan', flag: '🇯🇵' },
  { iso: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { iso: 'FR', name: 'France', flag: '🇫🇷' },
  { iso: 'ES', name: 'Spain', flag: '🇪🇸' },
];

function withMediaType<T extends { id: number }>(
  items: T[] = [],
  mediaType: 'movie' | 'tv'
): (T & { media_type: 'movie' | 'tv' })[] {
  return items.map((item) => ({
    ...item,
    media_type: mediaType,
  }));
}

function takeFirst(items: HomeMediaItem[], limit: number) {
  return items.slice(0, limit);
}

function mixAndLimit(limit: number, ...groups: HomeMediaItem[][]) {
  return groups.flat().slice(0, limit);
}

async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

async function withTrailerKeys(
  items: HomeMediaItem[],
  limit?: number
): Promise<HomeMediaItem[]> {
  const sliced = typeof limit === 'number' ? items.slice(0, limit) : items;

  return Promise.all(
    sliced.map(async (item) => {
      try {
        const trailer =
          item.media_type === 'tv'
            ? await fetchTvTrailer(item.id)
            : await fetchMovieTrailer(item.id);

        return {
          ...item,
          trailerKey: trailer?.key ?? null,
        };
      } catch {
        return {
          ...item,
          trailerKey: null,
        };
      }
    })
  );
}

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

async function getSessionUser() {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, created_at')
    .eq('id', user.id)
    .maybeSingle();

  return {
    id: user.id,
    displayName:
      profile?.display_name ??
      user.user_metadata?.display_name ??
      user.email?.split('@')[0] ??
      'User',
    avatarUrl:
      profile?.avatar_url ??
      user.user_metadata?.avatar_url ??
      null,
    createdAt:
      profile?.created_at ??
      user.created_at ??
      null,
  };
}

async function getContinueWatching(userId: string): Promise<HomeMediaItem[]> {
  const supabase = await getSupabaseServer();

  const { data } = await supabase
    .from('continue_watching')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(20);

  type ContinueWatchingRow = {
    user_id: string;
    tmdb_id: number;
    media_type: 'movie' | 'tv';
    season_number?: number | null;
    episode_number?: number | null;
    progress_percent?: number | null;
    updated_at: string;
  };

  const rows = (data ?? []) as ContinueWatchingRow[];

  const filtered = rows.filter((row) => {
    const progress = row.progress_percent ?? 0;
    return progress < 95;
  });

  const latestByTitle = new Map<string, ContinueWatchingRow>();

  for (const row of filtered) {
    // ignore TV rows that don't have a valid episode
    if (
      row.media_type === 'tv' &&
      (row.season_number == null || row.episode_number == null)
    ) {
      continue;
    }

    const key =
      row.media_type === 'movie'
        ? `movie:${row.tmdb_id}`
        : `tv:${row.tmdb_id}`;

    const existing = latestByTitle.get(key);

    if (!existing) {
      latestByTitle.set(key, row);
    } else if (
      new Date(row.updated_at).getTime() >
      new Date(existing.updated_at).getTime()
    ) {
      latestByTitle.set(key, row);
    }
  }

  const uniqueRows = [...latestByTitle.values()].slice(0, 10);

  const items = await Promise.all(
    uniqueRows.map(async (row) => {
      try {
        if (row.media_type === 'movie') {
          const item = await fetchMovieDetails(Number(row.tmdb_id));

          return {
            ...item,
            media_type: 'movie' as const,
            progress:
              typeof row.progress_percent === 'number'
                ? row.progress_percent
                : null,
            href: `/watch/movie/${row.tmdb_id}`,
          };
        }

        const season = Number(row.season_number ?? 1);
        const episode = Number(row.episode_number ?? 1);
        const item = await fetchTvDetails(Number(row.tmdb_id));

        return {
          ...item,
          media_type: 'tv' as const,
          season,
          episode,
          progress:
            typeof row.progress_percent === 'number'
              ? row.progress_percent
              : null,
          href: `/watch/tv/${row.tmdb_id}?season=${season}&episode=${episode}`,
        };
      } catch {
        return null;
      }
    })
  );

  return items.filter(Boolean) as HomeMediaItem[];
}


async function getLatestWatched(userId: string): Promise<WatchHistoryRow | null> {
  const supabase = await getSupabaseServer();

  const { data } = await supabase
    .from('watch_history')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as WatchHistoryRow) ?? null;
}

async function getLatestWatchedDisplay(
  latestWatched: WatchHistoryRow | null
): Promise<HomeMediaItem | null> {
  if (!latestWatched) return null;

  try {
    if (latestWatched.media_type === 'movie') {
      const item = await fetchMovieDetails(Number(latestWatched.tmdb_id));
      return { ...item, media_type: 'movie' as const };
    }

    const item = await fetchTvDetails(Number(latestWatched.tmdb_id));
    return { ...item, media_type: 'tv' as const };
  } catch {
    return null;
  }
}

async function getFullWatchHistory(userId: string): Promise<WatchHistoryRow[]> {
  const supabase = await getSupabaseServer();

  const { data } = await supabase
    .from('watch_history')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(100);

  return (data ?? []) as WatchHistoryRow[];
}

type WatchlistRow = {
  tmdb_id: number;
  media_type: 'movie' | 'tv';
};

async function getWatchlistItems(
  watchlistRows: WatchlistRow[]
): Promise<HomeMediaItem[]> {
  const items = await Promise.all(
    watchlistRows.map(async (row) => {
      try {
        if (row.media_type === 'movie') {
          const item = await fetchMovieDetails(Number(row.tmdb_id));
          return { ...item, media_type: 'movie' as const };
        }

        const item = await fetchTvDetails(Number(row.tmdb_id));
        return { ...item, media_type: 'tv' as const };
      } catch {
        return null;
      }
    })
  );

  return items.filter(Boolean) as HomeMediaItem[];
}

async function getGlobalMostWatchedCandidates() {
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from('watch_history')
    .select('tmdb_id, media_type');

  if (error || !data) return [];

  const counts = new Map<
    string,
    { tmdb_id: number; media_type: 'movie' | 'tv'; count: number }
  >();

  for (const row of data as { tmdb_id: number; media_type: 'movie' | 'tv' }[]) {
    const key = `${row.media_type}:${row.tmdb_id}`;
    const existing = counts.get(key);

    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, {
        tmdb_id: Number(row.tmdb_id),
        media_type: row.media_type,
        count: 1,
      });
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}

async function hydrateRankedMedia(
  ranked: Array<{ tmdb_id: number; media_type: 'movie' | 'tv'; count?: number }>
): Promise<HomeMediaItem[]> {
  const items = await Promise.all(
    ranked.map(async (row) => {
      try {
        if (row.media_type === 'movie') {
          const item = await fetchMovieDetails(Number(row.tmdb_id));
          return { ...item, media_type: 'movie' as const };
        }

        const item = await fetchTvDetails(Number(row.tmdb_id));
        return { ...item, media_type: 'tv' as const };
      } catch {
        return null;
      }
    })
  );

  return items.filter(Boolean) as HomeMediaItem[];
}

/**
 * Because You Watched:
 * tight, direct recs from TMDB for the latest title only,
 * with genre-aware scoring + fallback.
 */
async function getBecauseYouWatchedTight(
  latestWatched: WatchHistoryRow | null
): Promise<HomeMediaItem[]> {
  if (!latestWatched?.tmdb_id || !latestWatched.media_type) {
    return [];
  }

  // 1. Fetch full details for latest watched
  let latestDetails:
    | (HomeMediaItem & { genres?: { id: number; name: string }[] })
    | null = null;

  try {
    if (latestWatched.media_type === 'movie') {
      const details = await fetchMovieDetails(Number(latestWatched.tmdb_id));
      latestDetails = { ...details, media_type: 'movie' as const };
    } else {
      const details = await fetchTvDetails(Number(latestWatched.tmdb_id));
      latestDetails = { ...details, media_type: 'tv' as const };
    }
  } catch {
    return [];
  }

  const latestGenres: number[] =
    latestDetails?.genres?.map((g) => g.id) ?? [];

  // 2. Fetch TMDB recommendations
  let recommendations: HomeMediaItem[] = [];

  try {
    if (latestWatched.media_type === 'movie') {
      const recs = await fetchMovieRecommendations(
        Number(latestWatched.tmdb_id)
      );
      recommendations = withMediaType(
        (recs.results ?? []) as HomeMediaItem[],
        'movie'
      );
    } else {
      const recs = await fetchTvRecommendations(
        Number(latestWatched.tmdb_id)
      );
      recommendations = withMediaType(
        (recs.results ?? []) as HomeMediaItem[],
        'tv'
      );
    }
  } catch {
    return [];
  }

  if (!recommendations.length) return [];

  // 3. Score recommendations
  type Scored = HomeMediaItem & { score: number };

  const scored: Array<Scored | null> = recommendations.map((item, index) => {
    const itemGenres: number[] = item.genre_ids ?? [];

    const overlap = itemGenres.filter((g) =>
      latestGenres.includes(g)
    ).length;

    // Remove obvious mismatches
    if (overlap === 0) {
      return null;
    }

    const genreScore = overlap * 4;
    const ratingScore = (item.vote_average ?? 0) / 2;
    const popularityScore = (item.popularity ?? 0) / 80;
    const tmdbPositionBoost = Math.max(0, 3 - index * 0.15);

    const score =
      genreScore + ratingScore + popularityScore + tmdbPositionBoost;

    return {
      ...item,
      score,
    };
  });

  let filtered = scored.filter((i): i is Scored => i !== null);

  // 4. If too few after filtering, add some top TMDB recs back as fallback
  if (filtered.length < 6) {
    const seen = new Set(
      filtered.map((i) => `${i.media_type}:${i.id}`)
    );

    const fallback = recommendations
      .slice(0, 10)
      .filter((item) => {
        const key = `${item.media_type}:${item.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((item) => ({
        ...item,
        score: 0,
      }));

    filtered = [...filtered, ...fallback];
  }

  // 5. Sort and deduplicate
  filtered.sort((a, b) => b.score - a.score);

  const finalMap = new Map<string, Scored>();

  for (const item of filtered) {
    const key = `${item.media_type}:${item.id}`;
    if (!finalMap.has(key)) {
      finalMap.set(key, item);
    }
  }

  return [...finalMap.values()].slice(0, 10);
}

/**
 * For You:
 * recency‑weighted, completion‑weighted, genre‑based
 * + trending / top rated, diversified.
 */
async function getForYouPersonalized(
  userId: string,
  trendingMovies: TmdbListResponse<TmdbMovie>,
  trendingTv: TmdbListResponse<TmdbMovie>,
  topRatedMovies: TmdbListResponse<TmdbMovie>,
  topRatedTv: TmdbListResponse<TmdbMovie>
): Promise<HomeMediaItem[]> {
  const history = await getFullWatchHistory(userId);
  if (!history.length) return [];

  const uniqueKey = (row: WatchHistoryRow) =>
    `${row.media_type}:${row.tmdb_id}`;

  const uniqueHistoryMap = new Map<string, WatchHistoryRow>();
  for (const row of history) {
    const key = uniqueKey(row);
    if (!uniqueHistoryMap.has(key)) {
      uniqueHistoryMap.set(key, row);
    }
  }
  const uniqueHistory = [...uniqueHistoryMap.values()].slice(0, 40);

  const detailedHistory = await Promise.all(
    uniqueHistory.map(async (row: WatchHistoryRow) => {
      try {
        if (row.media_type === 'movie') {
          const details = await fetchMovieDetails(Number(row.tmdb_id));
          return { row, details: { ...details, media_type: 'movie' as const } };
        }
        const details = await fetchTvDetails(Number(row.tmdb_id));
        return { row, details: { ...details, media_type: 'tv' as const } };
      } catch {
        return null;
      }
    })
  );

  type HistoryItem = {
    row: WatchHistoryRow;
    details: HomeMediaItem & { genres?: { id: number; name: string }[] };
  };

  const historyItems = detailedHistory.filter(
    (item): item is NonNullable<typeof item> => item !== null
  ) as HistoryItem[];

  const genreCounts = new Map<number, number>();

  for (const { row, details } of historyItems) {
    const genres = details.genres ?? [];
    if (!genres.length) continue;

    const daysAgo =
      (Date.now() - new Date(row.updated_at).getTime()) /
      (1000 * 60 * 60 * 24);

    const recencyWeight = Math.max(0.25, 1 - daysAgo / 90);

    const completionWeight = Math.max(
      0.2,
      (row.progress_percent ?? 0) / 100
    );

    const combinedWeight = recencyWeight * completionWeight;

    for (const g of genres) {
      const prev = genreCounts.get(g.id) ?? 0;
      genreCounts.set(g.id, prev + combinedWeight);
    }
  }

  if (!genreCounts.size) {
    return [];
  }

  const topGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  const trendingMoviesItems = withMediaType(
  (trendingMovies.results ?? []) as HomeMediaItem[],
  'movie'
  );
  const trendingTvItems = withMediaType(
    (trendingTv.results ?? []) as HomeMediaItem[],
    'tv'
  );
  const topRatedMoviesItems = withMediaType(
    (topRatedMovies.results ?? []) as HomeMediaItem[],
    'movie'
  );
  const topRatedTvItems = withMediaType(
    (topRatedTv.results ?? []) as HomeMediaItem[],
    'tv'
  );

  const candidatesRaw: HomeMediaItem[] = [
    ...trendingMoviesItems,
    ...trendingTvItems,
    ...topRatedMoviesItems,
    ...topRatedTvItems,
  ];

  if (!candidatesRaw.length) return [];

  const watchedKeySet = new Set(
    history.map((row: WatchHistoryRow) => `${row.media_type}:${row.tmdb_id}`)
  );

  type Scored = HomeMediaItem & { score: number; genres?: number[] };

  const scored: Scored[] = candidatesRaw.map((item) => {
    const key = `${item.media_type}:${item.id}`;
    const alreadyWatched = watchedKeySet.has(key);

    const itemGenreIds: number[] =
      (item.genre_ids as number[] | undefined) ??
      ((item as HomeMediaItem & { genres?: { id: number }[] }).genres?.map(
        (g) => g.id
      ) ?? []);

    const overlap = itemGenreIds.filter((g) => topGenres.includes(g)).length;

    const genreScore = overlap * 1.5;
    const popularityScore = (item.popularity ?? 0) / 50;
    const ratingScore = (item.vote_average ?? 0) / 2;

    let baseScore = genreScore + popularityScore + ratingScore;

    if (alreadyWatched) baseScore -= 5;

    return {
      ...item,
      genres: itemGenreIds,
      score: baseScore,
    };
  });

  const bestByKey = new Map<string, Scored>();
  for (const item of scored) {
    const key = `${item.media_type}:${item.id}`;
    const existing = bestByKey.get(key);
    if (!existing || item.score > existing.score) {
      bestByKey.set(key, item);
    }
  }

  const uniqueScored = [...bestByKey.values()];

  const maxPerGenre = 3;
  const perGenreCount = new Map<number, number>();
  const diversified: Scored[] = [];

  for (const item of uniqueScored.sort((a, b) => b.score - a.score)) {
    const ids = item.genres ?? [];
    if (!ids.length) {
      diversified.push(item);
      continue;
    }

    const dominant =
      ids.find((g) => topGenres.includes(g)) ?? ids[0];

    const count = perGenreCount.get(dominant) ?? 0;
    if (count >= maxPerGenre) continue;

    perGenreCount.set(dominant, count + 1);
    diversified.push(item);
  }

  const finalList = diversified.slice(0, 20);
  const strongCore = finalList.slice(0, 8);

  const explorationCandidates = diversified
    .slice(8)
    .filter((item) => !watchedKeySet.has(`${item.media_type}:${item.id}`))
    .sort((a, b) => b.vote_average - a.vote_average)
    .slice(0, 10);

  const exploration: Scored[] = [];
  while (exploration.length < 2 && explorationCandidates.length > 0) {
    const idx = Math.floor(Math.random() * explorationCandidates.length);
    exploration.push(explorationCandidates[idx]);
    explorationCandidates.splice(idx, 1);
  }

  const combined = [...strongCore, ...exploration];

  const finalMap = new Map<string, Scored>();
  for (const item of combined) {
    const key = `${item.media_type}:${item.id}`;
    if (!finalMap.has(key)) {
      finalMap.set(key, item);
    }
  }

  return [...finalMap.values()].slice(0, 10);
}

export default async function Page() {
  const user = await getSessionUser();
  if (!user) redirect('/auth/sign-in');

  const [
    continueWatching,
    watchlistRows,
    latestWatched,
    nowPlaying,
    trendingAll,
    trendingMovies,
    trendingTv,
    popularMovies,
    popularTv,
    topRatedMovies,
    topRatedTv,
    genres,
    globalMostWatched,
  ] = await Promise.all([
    safe(getContinueWatching(user.id), [] as HomeMediaItem[]),
    safe(getUserWatchlist(), []),
    safe(getLatestWatched(user.id), null),
    safe(fetchNowPlayingMovies(), EMPTY_LIST_RESPONSE),
    safe(fetchTrendingAll('week'), EMPTY_LIST_RESPONSE),
    safe(fetchTrendingMovies('week'), EMPTY_LIST_RESPONSE),
    safe(fetchTrendingTv('week'), EMPTY_LIST_RESPONSE),
    safe(fetchPopularMovies(), EMPTY_LIST_RESPONSE),
    safe(fetchPopularTv(), EMPTY_LIST_RESPONSE),
    safe(fetchTopRatedMovies(), EMPTY_LIST_RESPONSE),
    safe(fetchTopRatedTv(), EMPTY_LIST_RESPONSE),
    safe(fetchMovieGenres(), []),
    safe(getGlobalMostWatchedCandidates(), []),
  ]);

  const latestWatchedDisplay = await getLatestWatchedDisplay(latestWatched);

  // const rankedHeroItems = await hydrateRankedMedia(globalMostWatched);

  // const fallbackHeroPool = mixAndLimit(
  //   14,
  //   withMediaType(nowPlaying.results ?? [], 'movie'),
  //   withMediaType(trendingMovies.results ?? [], 'movie'),
  //   withMediaType(trendingTv.results ?? [], 'tv'),
  //   withMediaType(popularMovies.results ?? [], 'movie'),
  //   withMediaType(popularTv.results ?? [], 'tv')
  // );

  // const heroSource =
  //   rankedHeroItems.length >= 5 ? rankedHeroItems : fallbackHeroPool;

    const heroSource = [
    ...withMediaType(
      trendingMovies.results ?? [],
      'movie'
    ),
    ...withMediaType(
      trendingTv.results ?? [],
      'tv'
    ),
  ]
    .filter((item) => item.backdrop_path)
    .sort(
      (a, b) =>
        (b.popularity ?? 0) -
        (a.popularity ?? 0)
    );

  const uniqueHeroSource = heroSource.filter(
    (item, index, arr) =>
      arr.findIndex(
        (x) => `${x.media_type}:${x.id}` === `${item.media_type}:${item.id}`
      ) === index
  );

  const heroMoviesBase = takeFirst(uniqueHeroSource, 12);
  const heroMovies = await withTrailerKeys(heroMoviesBase, 12);

  const becauseYouWatched = latestWatched
    ? await getBecauseYouWatchedTight(latestWatched)
    : [];

  const forYou = await getForYouPersonalized(
    user.id,
    trendingMovies,
    trendingTv,
    topRatedMovies,
    topRatedTv
  );

  const top10Today = mixAndLimit(
    10,
    withMediaType(topRatedMovies.results ?? [], 'movie'),
    withMediaType(topRatedTv.results ?? [], 'tv')
  );

  const trendingToday =
    (trendingAll.results?.length ?? 0) > 0
      ? ((trendingAll.results ?? []).slice(0, 10) as HomeMediaItem[])
      : mixAndLimit(
          10,
          withMediaType(trendingMovies.results ?? [], 'movie'),
          withMediaType(trendingTv.results ?? [], 'tv')
        );

  const watchlistItems = await getWatchlistItems(
    watchlistRows as WatchlistRow[]
  );

  const watchlistKeySet = new Set(
    (watchlistRows as WatchlistRow[]).map(
      (row) => `${row.media_type}:${row.tmdb_id}`
    )
  );

  return (
    <main className="page-shell">
      <RatingNotice />
      {heroMovies.length > 0 ? (
        <HeroBanner
          movies={heroMovies}
          watchlistKeys={[...watchlistKeySet]}
          navbar={
            <Navbar
              displayName={user.displayName}
              avatarUrl={user.avatarUrl}
              createdAt={user.createdAt}
            />
          }
        />
      ) : (
        <Navbar
          displayName={user.displayName}
          avatarUrl={user.avatarUrl}
          createdAt={user.createdAt}
        />
      )}

      <div style={{ padding: '0 18px 40px' }}>
        {continueWatching.length > 0 && (
          <SectionRow
            title={
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                <span>Continue Watching</span>
                <span 
                  style={{ 
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
                    fontSize: '0.8rem', 
                    fontWeight: 500, 
                    color: '#86868b',
                    letterSpacing: '0.01em',
                    textTransform: 'none'
                  }}
                >
                  (Removal available on desktop)
                </span>
              </div>
            }
            href="/profile/history"
            items={continueWatching}
            showRank={false}
            continueWatchingMode
          />
        )}

        {watchlistItems.length > 0 && (
          <SectionRow
            title="My Watchlist"
            href="/watchlist"
            items={watchlistItems}
            watchlistMode
            showRank={false}
          />
        )}

        {top10Today.length > 0 && (
          <SectionRow
            title="Top 10 Today"
            href="/browse?sort=top-rated"
            items={top10Today}
          />
        )}

        {forYou.length > 0 && (
          <SectionRow
            title="For You"
            href="/browse?filter=for-you"
            items={forYou}
          />
        )}

        {becauseYouWatched.length > 0 && latestWatchedDisplay && (
          <SectionRow
            title={
              <span>
                Because You Watched{' '}
                <span
                  className="
                    font-serif italic text-red-300
                    tracking-wide font-medium
                    drop-shadow-[0_0_12px_rgba(252,165,165,0.35)]
                  "
                >
                  “{getTitle(latestWatchedDisplay)}”
                </span>
              </span>
            }
            href="/browse?filter=because-you-watched"
            items={becauseYouWatched}
          />
        )}

        {trendingToday.length > 0 && (
          <SectionRow
            title="Trending Today"
            href="/trending"
            items={trendingToday}
          />
        )}

        {genres.length > 0 && (
          <GenreSectionRow
            title="Browse by Genre"
            href="/browse"
            genres={genres}
          />
        )}

        <CountrySectionRow
          title="Browse by Country"
          countries={POPULAR_COUNTRIES}
        />
      </div>
    </main>
  );
}