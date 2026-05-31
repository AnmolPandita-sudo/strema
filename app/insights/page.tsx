// app/insights/page.tsx
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { Navbar } from '@/components/navbar';
import { getTitle, fetchMovieDetails, fetchTvDetails } from '@/lib/tmdb';
import Link from 'next/link';

type WatchHistoryRow = {
  user_id: string;
  tmdb_id: number;
  media_type: 'movie' | 'tv';
  progress_percent: number | null;
  updated_at: string;
  season_number: number | null;
  episode_number: number | null;
};

type UserProfile = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string | null;
};

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

async function getSessionUser(): Promise<UserProfile | null> {
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

async function getWatchHistory(userId: string): Promise<WatchHistoryRow[]> {
  const supabase = await getSupabaseServer();

  const { data } = await supabase
    .from('watch_history')
    .select('user_id, tmdb_id, media_type, progress_percent, updated_at, season_number, episode_number')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(200);

  return (data ?? []) as WatchHistoryRow[];
}

type InsightsMetrics = {
  totalTitles: number;
  moviesWatched: number;
  tvWatched: number;
  estimatedHours: number;
  avgCompletion: number;
  totalSessions: number;
  favoriteGenres: string[];
  preferredType: 'movie' | 'tv' | 'mixed';
  bingeTendency: 'low' | 'medium' | 'high';
  activeTimeOfDay: 'morning' | 'afternoon' | 'evening' | 'late-night' | null;
};

async function computeInsights(history: WatchHistoryRow[]): Promise<InsightsMetrics> {
  if (!history.length) {
    return {
      totalTitles: 0,
      moviesWatched: 0,
      tvWatched: 0,
      estimatedHours: 0,
      avgCompletion: 0,
      totalSessions: 0,
      favoriteGenres: [],
      preferredType: 'mixed',
      bingeTendency: 'low',
      activeTimeOfDay: null,
    };
  }

  const movieCount = history.filter((h) => h.media_type === 'movie').length;
  const tvCount = history.filter((h) => h.media_type === 'tv').length;

  const avgCompletion =
    history.reduce(
      (sum, h) => sum + (h.progress_percent ?? 0),
      0
    ) / history.length;

  // Rough heuristic: assume 2 hours per movie, 45 minutes per TV episode
  const estimatedHours =
    history.reduce((sum, h) => {
      if (h.media_type === 'movie') {
        return sum + 2 * ((h.progress_percent ?? 0) / 100);
      }
      return sum + 0.75 * ((h.progress_percent ?? 0) / 100);
    }, 0);

  const totalSessions = history.length;

  // Time‑of‑day buckets
  const buckets = {
    morning: 0,
    afternoon: 0,
    evening: 0,
    'late-night': 0,
  } as const;

  const timeBuckets: Record<keyof typeof buckets, number> = {
    morning: 0,
    afternoon: 0,
    evening: 0,
    'late-night': 0,
  };

  for (const h of history) {
    const hour = new Date(h.updated_at).getHours();
    if (hour >= 5 && hour < 12) timeBuckets.morning += 1;
    else if (hour >= 12 && hour < 18) timeBuckets.afternoon += 1;
    else if (hour >= 18 && hour < 23) timeBuckets.evening += 1;
    else timeBuckets['late-night'] += 1;
  }

  let activeTimeOfDay: InsightsMetrics['activeTimeOfDay'] = null;
  const entries = Object.entries(timeBuckets) as [InsightsMetrics['activeTimeOfDay'], number][];
  const sortedTime = entries.sort((a, b) => b[1] - a[1]);
  if (sortedTime[0][1] > 0) {
    activeTimeOfDay = sortedTime[0][0];
  }

  // Binge tendency based on average sessions per day in last 30 days
  const now = Date.now();
  const last30 = history.filter(
    (h) =>
      now - new Date(h.updated_at).getTime() <= 30 * 24 * 60 * 60 * 1000
  );
  const sessionsPerDay = last30.length / 30;
  let bingeTendency: InsightsMetrics['bingeTendency'] = 'low';
  if (sessionsPerDay > 1.5) bingeTendency = 'high';
  else if (sessionsPerDay > 0.5) bingeTendency = 'medium';

  // Basic content type preference
  let preferredType: InsightsMetrics['preferredType'] = 'mixed';
  if (movieCount > tvCount * 1.3) preferredType = 'movie';
  else if (tvCount > movieCount * 1.3) preferredType = 'tv';

  // Favorite genres: simple heuristic (requires a few detail calls)
  // To keep it light, just sample the latest 15 items and pull their genres
  const sample = history.slice(0, 15);
  const genreCounts = new Map<number, number>();
  const genreNames = new Map<number, string>();

  await Promise.all(
    sample.map(async (h) => {
      try {
        const details =
          h.media_type === 'movie'
            ? await fetchMovieDetails(h.tmdb_id)
            : await fetchTvDetails(h.tmdb_id);

        const genres = (details as any).genres as { id: number; name: string }[] | undefined;
        if (!genres) return;

        for (const g of genres) {
          genreCounts.set(g.id, (genreCounts.get(g.id) ?? 0) + 1);
          if (!genreNames.has(g.id)) {
            genreNames.set(g.id, g.name);
          }
        }
      } catch {
        // ignore failed TMDB calls for insights
      }
    })
  );

  const favoriteGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([id]) => genreNames.get(id) ?? 'Unknown');

  return {
    totalTitles: new Set(history.map((h) => `${h.media_type}:${h.tmdb_id}`)).size,
    moviesWatched: movieCount,
    tvWatched: tvCount,
    estimatedHours: Number(estimatedHours.toFixed(1)),
    avgCompletion: Number(avgCompletion.toFixed(1)),
    totalSessions,
    favoriteGenres,
    preferredType,
    bingeTendency,
    activeTimeOfDay,
  };
}

function formatTimeOfDay(label: InsightsMetrics['activeTimeOfDay']): string {
  if (!label) return 'No dominant time yet';
  if (label === 'late-night') return 'Late Night';
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default async function InsightsPage() {
  const user = await getSessionUser();
  if (!user) redirect('/auth/sign-in');

  const history = await getWatchHistory(user.id);
  const insights = await computeInsights(history);

  const recentHistory = history.slice(0, 8);

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-[#050308] to-black text-slate-100">
      {/* Floating background glows */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-32 h-80 w-80 rounded-full bg-red-500/30 blur-3xl" />
        <div className="absolute top-40 -right-24 h-72 w-72 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute bottom-[-6rem] left-1/2 h-96 w-[32rem] -translate-x-1/2 rounded-[999px] bg-gradient-to-r from-red-500/25 via-fuchsia-500/10 to-emerald-400/15 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        {/* Top nav + back button */}
        <header className="mb-6 flex items-center justify-between gap-3">
            <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 shadow-lg shadow-black/40 backdrop-blur-xl transition hover:border-red-400/60 hover:bg-white/10 hover:text-white hover:shadow-red-500/30"
            >
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(248,113,113,0.8)]" />
                Back to Home
            </Link>
        </header>

        {/* Hero header */}
        <section className="mb-8 rounded-[28px] border border-white/10 bg-gradient-to-br from-white/5 via-white/0 to-white/5 p-[1px] shadow-[0_18px_60px_rgba(0,0,0,0.75)]">
          <div className="relative flex flex-col gap-5 rounded-[27px] bg-gradient-to-r from-black/70 via-black/60 to-black/40 px-5 py-5 backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-red-400/40 bg-black/60 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-red-200 shadow-[0_0_22px_rgba(248,113,113,0.45)]">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.9)]" />
                Streaming Intelligence
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl md:text-[2.6rem]">
                  Your <span className="text-red-400">Insights</span>
                </h1>
                <p className="mt-2 max-w-xl text-sm text-slate-300/80 sm:text-[15px]">
                  A cinematic snapshot of how you watch – what you love, when you binge,
                  and the stories that keep you up past midnight.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start gap-2 text-xs text-slate-300/80 sm:items-end sm:text-right">
              <p className="font-medium text-slate-200">
                {history.length > 0 ? 'Streaming personality unlocked' : 'Start watching to unlock insights'}
              </p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                {insights.totalTitles} unique titles • {insights.estimatedHours} hrs watched
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-7 lg:grid-cols-3">
          {/* Left column: metrics + taste */}
          <div className="space-y-7 lg:col-span-2">
            {/* Analytics cards grid */}
            <section className="rounded-[30px] border border-white/10 bg-white/5 p-[1px] shadow-[0_18px_60px_rgba(0,0,0,0.75)]">
              <div className="rounded-[29px] bg-gradient-to-br from-black/70 via-black/55 to-black/70 p-5 backdrop-blur-2xl sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
                    Core Stats
                  </h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {/* Total Titles */}
                  <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/0 px-4 py-4 shadow-[0_14px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/15 via-transparent to-fuchsia-500/10 opacity-0 transition group-hover:opacity-100" />
                    <div className="relative flex flex-col gap-2">
                      <div className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
                        <span className="h-6 w-6 rounded-full bg-red-500/20 text-red-300 shadow-[0_0_15px_rgba(248,113,113,0.7)] ring-1 ring-red-500/40 flex items-center justify-center text-xs">
                          ▲
                        </span>
                        Total Titles
                      </div>
                      <p className="text-2xl font-semibold text-slate-50">
                        {insights.totalTitles}
                      </p>
                      <p className="text-xs text-slate-400">
                        Unique movies and shows in your universe.
                      </p>
                    </div>
                  </div>

                  {/* Movies Watched */}
                  <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/0 px-4 py-4 shadow-[0_14px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-rose-500/15 via-transparent to-red-500/10 opacity-0 transition group-hover:opacity-100" />
                    <div className="relative flex flex-col gap-2">
                      <div className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
                        <span className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center text-[11px]">
                          🎬
                        </span>
                        Movies Watched
                      </div>
                      <p className="text-2xl font-semibold text-slate-50">
                        {insights.moviesWatched}
                      </p>
                      <p className="text-xs text-slate-400">
                        Feature‑length escapes you’ve started.
                      </p>
                    </div>
                  </div>

                  {/* TV Shows Watched */}
                  <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/0 px-4 py-4 shadow-[0_14px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/15 via-transparent to-sky-500/10 opacity-0 transition group-hover:opacity-100" />
                    <div className="relative flex flex-col gap-2">
                      <div className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
                        <span className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center text-[11px]">
                          📺
                        </span>
                        TV Shows Watched
                      </div>
                      <p className="text-2xl font-semibold text-slate-50">
                        {insights.tvWatched}
                      </p>
                      <p className="text-xs text-slate-400">
                        Series that pulled you into new worlds.
                      </p>
                    </div>
                  </div>

                  {/* Estimated Watch Hours */}
                  <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/0 px-4 py-4 shadow-[0_14px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/15 via-transparent to-orange-500/10 opacity-0 transition group-hover:opacity-100" />
                    <div className="relative flex flex-col gap-2">
                      <div className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
                        <span className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center text-[11px]">
                          ⏱
                        </span>
                        Estimated Hours
                      </div>
                      <p className="text-2xl font-semibold text-slate-50">
                        {insights.estimatedHours}
                      </p>
                      <p className="text-xs text-slate-400">
                        Approximate time spent in your cinematic universe.
                      </p>
                    </div>
                  </div>

                  {/* Average Completion */}
                  <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/0 px-4 py-4 shadow-[0_14px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/15 via-transparent to-teal-500/10 opacity-0 transition group-hover:opacity-100" />
                    <div className="relative flex flex-col gap-2">
                      <div className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
                        <span className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center text-[11px]">
                          ✔
                        </span>
                        Avg Completion
                      </div>
                      <p className="text-2xl font-semibold text-slate-50">
                        {insights.avgCompletion}%
                      </p>
                      <p className="text-xs text-slate-400">
                        How often you stay until the end credits.
                      </p>
                    </div>
                  </div>

                  {/* Sessions */}
                  <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/0 px-4 py-4 shadow-[0_14px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/15 via-transparent to-red-500/10 opacity-0 transition group-hover:opacity-100" />
                    <div className="relative flex flex-col gap-2">
                      <div className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
                        <span className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center text-[11px]">
                          ⚡
                        </span>
                        Total Sessions
                      </div>
                      <p className="text-2xl font-semibold text-slate-50">
                        {insights.totalSessions}
                      </p>
                      <p className="text-xs text-slate-400">
                        Individual viewing sessions you’ve started.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Taste profile */}
            <section className="rounded-[30px] border border-white/10 bg-white/5 p-[1px] shadow-[0_18px_60px_rgba(0,0,0,0.75)]">
              <div className="rounded-[29px] bg-gradient-to-br from-black/70 via-black/55 to-black/70 p-5 backdrop-blur-2xl sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
                    Taste Profile
                  </h2>
                  <span className="rounded-full bg-red-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-red-200">
                    Personalized
                  </span>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                      Favorite Genres
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {insights.favoriteGenres.length ? (
                        insights.favoriteGenres.map((g) => (
                          <span
                            key={g}
                            className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-200"
                          >
                            {g}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500">
                          Watch a bit more to reveal your top genres.
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                      Preferred Format
                    </p>
                    <p className="text-sm font-medium text-slate-100">
                      {insights.preferredType === 'movie'
                        ? 'Feature‑length Stories'
                        : insights.preferredType === 'tv'
                        ? 'Series & Long‑form Worlds'
                        : 'Balanced between Movies & Series'}
                    </p>
                    <p className="text-xs text-slate-400">
                      Your sessions lean slightly toward{' '}
                      <span className="text-slate-100">
                        {insights.preferredType === 'movie'
                          ? 'films'
                          : insights.preferredType === 'tv'
                          ? 'shows'
                          : 'both formats equally'}
                      </span>
                      .
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                      Binge Tendency
                    </p>
                    <p className="text-sm font-medium text-slate-100">
                      {insights.bingeTendency === 'high'
                        ? 'Certified Binge‑Watcher'
                        : insights.bingeTendency === 'medium'
                        ? 'Controlled Marathoner'
                        : 'Slow & Selective'}
                    </p>
                    <p className="text-xs text-slate-400">
                      Most active during{' '}
                      <span className="text-slate-100">
                        {formatTimeOfDay(insights.activeTimeOfDay)}
                      </span>
                      .
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-gradient-to-r from-red-500/15 via-transparent to-purple-500/10 px-4 py-3 text-xs text-slate-200">
                  {insights.favoriteGenres.length > 0 ? (
                    <p>
                      You tend to gravitate toward{' '}
                      <span className="font-semibold">
                        {insights.favoriteGenres.join(', ')}
                      </span>{' '}
                      with a{' '}
                      <span className="font-semibold">
                        {insights.bingeTendency === 'high'
                          ? 'strong binge streak'
                          : insights.bingeTendency === 'medium'
                          ? 'steady viewing rhythm'
                          : 'focused, selective approach'}
                      </span>
                      . Your screen lights up most often in the{' '}
                      <span className="font-semibold">
                        {formatTimeOfDay(insights.activeTimeOfDay)}
                      </span>
                      .
                    </p>
                  ) : (
                    <p>
                      Once you’ve spent a bit more time here, this space will transform
                      into a cinematic map of your streaming personality.
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* Right column: activity + viewing behavior */}
          <div className="space-y-7">
            {/* Recent Activity */}
            <section className="rounded-[30px] border border-white/10 bg-white/5 p-[1px] shadow-[0_18px_60px_rgba(0,0,0,0.8)]">
              <div className="rounded-[29px] bg-gradient-to-br from-black/75 via-black/60 to-black/75 p-5 backdrop-blur-2xl sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
                    Recent Activity
                  </h2>
                </div>

                {recentHistory.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Your latest watches will appear here as you explore more stories.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {await Promise.all(
                      recentHistory.map(async (h) => {
                        try {
                          const details =
                            h.media_type === 'movie'
                              ? await fetchMovieDetails(h.tmdb_id)
                              : await fetchTvDetails(h.tmdb_id);
                          const title = getTitle(details as any);
                          const date = new Date(h.updated_at);
                          const progress = h.progress_percent ?? 0;

                          return (
                            <li
                              key={`${h.media_type}:${h.tmdb_id}:${h.updated_at}`}
                              className="group flex items-center gap-3 overflow-hidden rounded-2xl border border-white/5 bg-white/5 px-3 py-2.5 text-xs text-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.65)] backdrop-blur-2xl transition hover:border-red-400/60 hover:bg-white/10 hover:shadow-red-500/25"
                            >
                              <div className="h-10 w-7 shrink-0 overflow-hidden rounded-lg bg-slate-700/60" />
                              <div className="flex flex-1 flex-col gap-0.5">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="truncate text-[13px] font-medium">
                                    {title}
                                  </p>
                                  <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-300">
                                    {h.media_type === 'movie' ? 'Movie' : 'Series'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-[11px] text-slate-400">
                                    Last watched{' '}
                                    {date.toLocaleDateString(undefined, {
                                      month: 'short',
                                      day: 'numeric',
                                    })}{' '}
                                    at{' '}
                                    {date.toLocaleTimeString(undefined, {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                  <span className="text-[11px] text-slate-300">
                                    {progress.toFixed(0)}%
                                  </span>
                                </div>
                                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800/80">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-red-500 via-rose-500 to-orange-400 shadow-[0_0_12px_rgba(248,113,113,0.8)] transition-[width]"
                                    style={{ width: `${Math.min(progress, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </li>
                          );
                        } catch {
                          return null;
                        }
                      })
                    )}
                  </ul>
                )}
              </div>
            </section>

            {/* Viewing behavior summary */}
            <section className="rounded-[30px] border border-white/10 bg-white/5 p-[1px] shadow-[0_18px_60px_rgba(0,0,0,0.8)]">
              <div className="rounded-[29px] bg-gradient-to-br from-black/78 via-black/65 to-black/80 p-5 backdrop-blur-2xl sm:p-6">
                <h2 className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
                  Viewing Behavior
                </h2>
                <ul className="space-y-2.5 text-xs text-slate-200">
                  <li className="flex gap-2">
                    <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.8)]" />
                    <p>
                      You{' '}
                      <span className="font-semibold">
                        {insights.preferredType === 'movie'
                          ? 'lean toward cinematic, one‑sitting stories.'
                          : insights.preferredType === 'tv'
                          ? 'tend to live inside long‑form series worlds.'
                          : 'balance movies and series in your watch list.'}
                      </span>
                    </p>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400/90" />
                    <p>
                      Most of your sessions happen around{' '}
                      <span className="font-semibold">
                        {formatTimeOfDay(insights.activeTimeOfDay)}.
                      </span>{' '}
                      That’s when your streaming universe really lights up.
                    </p>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/90" />
                    <p>
                      Your average completion rate of{' '}
                      <span className="font-semibold">{insights.avgCompletion}%</span>{' '}
                      suggests you{' '}
                      <span className="font-semibold">
                        {insights.avgCompletion >= 80
                          ? 'stay loyal to your stories.'
                          : insights.avgCompletion >= 50
                          ? 'give most titles a fair chance.'
                          : 'are highly selective and quick to move on.'}
                      </span>
                    </p>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-fuchsia-400/90" />
                    <p>
                      With roughly{' '}
                      <span className="font-semibold">
                        {insights.totalSessions} sessions
                      </span>{' '}
                      logged, your watch history is quietly training a smarter,
                      more personalized home screen.
                    </p>
                  </li>
                </ul>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}