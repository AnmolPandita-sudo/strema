import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { Navbar } from '@/components/navbar';
import { WatchPlayer } from '@/components/watch-player';
import {
  fetchMovieDetails,
  fetchTvDetails,
  fetchMovieTrailer,
  fetchTvTrailer,
} from '@/lib/tmdb';

type MediaType = 'movie' | 'tv';

type WatchPageProps = {
  params: Promise<{
    mediaType: string;
    id: string;
  }>;
  searchParams: Promise<{
    season?: string;
    episode?: string;
    provider?: string;
    server?: string;
  }>;
};

type SessionUser = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string | null;
};

type SubtitleApiResponse = {
  tracks: SubtitleTrack[];
  defaultSubtitleId: string | null;
};

type SubtitleTrack = {
  id: string;
  name: string;
  language: string;
  url: string;
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

async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return {
    id: user.id,
    displayName:
      user.user_metadata?.display_name ??
      user.email?.split('@')[0] ??
      'User',
    avatarUrl: user.user_metadata?.avatar_url ?? null,
    createdAt: user.created_at ?? null,
  };
}

async function getPlaybackPreferences(userId: string) {
  const supabase = await getSupabaseServer();

  const { data } = await supabase
    .from('playback_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  return data ?? null;
}

async function getSavedProgress(
  userId: string,
  mediaType: MediaType,
  tmdbId: number,
  seasonNumber: number,
  episodeNumber: number
) {
  const supabase = await getSupabaseServer();

  const query = supabase
    .from('continue_watching')
    .select('*')
    .eq('user_id', userId)
    .eq('media_type', mediaType)
    .eq('tmdb_id', tmdbId);

  if (mediaType === 'tv') {
    query
      .eq('season_number', seasonNumber)
      .eq('episode_number', episodeNumber);
  }

  const { data } = await query.maybeSingle();
  return data ?? null;
}

function formatYear(date?: string) {
  if (!date) return '';
  return new Date(date).getFullYear().toString();
}

function tmdbImage(path: string | null | undefined, size = 'w780') {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : '/poster-placeholder.png';
}

async function getSubtitles(params: {
  mediaType: MediaType;
  tmdbId: number;
  season?: number;
  episode?: number;
  originalLanguage?: string | null;
  userLanguage?: string | null;
}): Promise<SubtitleApiResponse> {
  const query = new URLSearchParams({
    mediaType: params.mediaType,
    tmdbId: String(params.tmdbId),
    ...(params.originalLanguage ? { originalLanguage: params.originalLanguage } : {}),
    ...(params.userLanguage ? { userLanguage: params.userLanguage } : {}),
    ...(params.season ? { season: String(params.season) } : {}),
    ...(params.episode ? { episode: String(params.episode) } : {}),
  });

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://localhost:3000';

  try {
    const res = await fetch(`${baseUrl}/api/subtitles?${query.toString()}`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      return {
        tracks: [],
        defaultSubtitleId: null,
      };
    }

    return (await res.json()) as SubtitleApiResponse;
  } catch {
    return {
      tracks: [],
      defaultSubtitleId: null,
    };
  }
}

async function getPreferredSubtitleLanguage(userId: string): Promise<string | null> {
  const supabase = await getSupabaseServer();

  const { data } = await supabase
    .from('playback_preferences')
    .select('subtitle_language')
    .eq('user_id', userId)
    .maybeSingle();

  return data?.subtitle_language ?? null;
}

export default async function WatchPage(props: WatchPageProps) {
  const { mediaType, id } = await props.params;
  const query = await props.searchParams;

  if (mediaType !== 'movie' && mediaType !== 'tv') {
    notFound();
  }

  const typedMediaType = mediaType as MediaType;

  const user = await getSessionUser();
  if (!user) redirect('/auth/sign-in');

  const tmdbId = Number(id);
  if (!Number.isFinite(tmdbId)) {
    notFound();
  }

  const details =
    typedMediaType === 'movie'
      ? await fetchMovieDetails(tmdbId).catch(() => null)
      : await fetchTvDetails(tmdbId).catch(() => null);

  if (!details) {
    notFound();
  }

  const trailer =
    typedMediaType === 'movie'
      ? await fetchMovieTrailer(tmdbId).catch(() => null)
      : await fetchTvTrailer(tmdbId).catch(() => null);

  const seasonNumber =
    typedMediaType === 'tv' ? Math.max(1, Number(query.season ?? 1)) : 0;

  const episodeNumber =
    typedMediaType === 'tv' ? Math.max(1, Number(query.episode ?? 1)) : 0;

  const preferences = await getPlaybackPreferences(user.id);
  const savedProgress = await getSavedProgress(
    user.id,
    typedMediaType,
    tmdbId,
    seasonNumber,
    episodeNumber
  );

  const preferredSubtitleLanguage =
    preferences?.subtitle_language ??
    (await getPreferredSubtitleLanguage(user.id));

  const title = typedMediaType === 'movie' ? details.title : details.name;
  const releaseDate =
    typedMediaType === 'movie' ? details.release_date : details.first_air_date;

  const posterPath = details.poster_path ?? null;
  const backdropPath = details.backdrop_path ?? null;
  const originalLanguage = details.original_language ?? null;

  const subtitleData = await getSubtitles({
    mediaType: typedMediaType,
    tmdbId,
    season: typedMediaType === 'tv' ? seasonNumber : undefined,
    episode: typedMediaType === 'tv' ? episodeNumber : undefined,
    originalLanguage,
    userLanguage: preferredSubtitleLanguage,
  });

  // Replace this with your real signed stream URL or CDN playback URL.
  // Option 3 requires a direct video source, not iframe providers.
  const streamUrl =
    typedMediaType === 'movie'
      ? 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
      : 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

  return (
    <main className="page-shell">
      <Navbar
        displayName={user.displayName}
        avatarUrl={user.avatarUrl}
        createdAt={user.createdAt}
      />

      <div style={styles.headerBlock}>
        <div>
          <p style={styles.eyebrow}>{typedMediaType === 'movie' ? 'Movie' : 'TV Show'}</p>
          <h1 style={styles.pageTitle}>{title ?? 'Untitled'}</h1>
          <p style={styles.pageMeta}>
            {formatYear(releaseDate)}
            {details.vote_average ? ` • ${Number(details.vote_average).toFixed(1)}/10` : ''}
            {typedMediaType === 'tv' ? ` • S${seasonNumber} E${episodeNumber}` : ''}
            {subtitleData.tracks.length ? ` • ${subtitleData.tracks.length} subtitle tracks` : ''}
          </p>
        </div>

        {trailer?.key ? (
          <a
            href={`https://www.youtube.com/watch?v=${trailer.key}`}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.trailerButton}
          >
            Watch trailer
          </a>
        ) : null}
      </div>

      <div style={styles.playerWrap}>
        <WatchPlayer
          tmdbId={tmdbId}
          mediaType={typedMediaType}
          title={title ?? 'Untitled'}
          season={typedMediaType === 'tv' ? seasonNumber : undefined}
          episode={typedMediaType === 'tv' ? episodeNumber : undefined}
          poster={tmdbImage(posterPath, 'w780')}
          streamUrl={streamUrl}
          subtitles={subtitleData.tracks}
          defaultSubtitleId={subtitleData.defaultSubtitleId}
        />
      </div>

      <section style={styles.detailsGrid}>
        <article style={styles.infoCard}>
          <h2 style={styles.cardTitle}>Overview</h2>
          <p style={styles.overview}>{details.overview ?? 'No overview available.'}</p>
        </article>

        <article style={styles.infoCard}>
          <h2 style={styles.cardTitle}>Playback</h2>
          <div style={styles.metaList}>
            <div style={styles.metaRow}>
              <span style={styles.metaLabel}>Autoplay</span>
              <span style={styles.metaValue}>{preferences?.autoplay ? 'On' : 'Off'}</span>
            </div>

            <div style={styles.metaRow}>
              <span style={styles.metaLabel}>Saved progress</span>
              <span style={styles.metaValue}>
                {savedProgress?.progress_seconds
                  ? `${Math.floor(savedProgress.progress_seconds)}s`
                  : 'None'}
              </span>
            </div>

            <div style={styles.metaRow}>
              <span style={styles.metaLabel}>Subtitle default</span>
              <span style={styles.metaValue}>
                {subtitleData.defaultSubtitleId
                  ? subtitleData.tracks.find((item) => item.id === subtitleData.defaultSubtitleId)
                      ?.label ?? 'Selected'
                  : 'Unavailable'}
              </span>
            </div>

            <div style={styles.metaRow}>
              <span style={styles.metaLabel}>Original language</span>
              <span style={styles.metaValue}>{originalLanguage?.toUpperCase() ?? 'Unknown'}</span>
            </div>
          </div>
        </article>

        <article style={styles.infoCard}>
          <h2 style={styles.cardTitle}>Artwork</h2>
          <div style={styles.artworkGrid}>
            <img
              src={tmdbImage(posterPath, 'w500')}
              alt={`${title ?? 'Untitled'} poster`}
              style={styles.artworkImage}
            />
            <img
              src={tmdbImage(backdropPath, 'w780')}
              alt={`${title ?? 'Untitled'} backdrop`}
              style={styles.artworkImage}
            />
          </div>
        </article>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  headerBlock: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: '18px',
    padding: '18px 18px 0',
    flexWrap: 'wrap',
  },
  eyebrow: {
    margin: '0 0 8px',
    color: 'rgba(122,240,255,0.78)',
    fontSize: '0.8rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
  },
  pageTitle: {
    margin: '0 0 8px',
    color: '#fff',
    fontSize: 'clamp(1.8rem, 3vw, 3rem)',
    lineHeight: 1.04,
    fontWeight: 800,
    letterSpacing: '-0.04em',
  },
  pageMeta: {
    margin: 0,
    color: 'rgba(245,247,251,0.56)',
    fontSize: '0.96rem',
  },
  trailerButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '46px',
    padding: '0 18px',
    borderRadius: '14px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    textDecoration: 'none',
    fontWeight: 700,
  },
  playerWrap: {
    padding: '18px',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '18px',
    padding: '0 18px 24px',
  },
  infoCard: {
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(18px)',
    padding: '18px',
  },
  cardTitle: {
    margin: '0 0 12px',
    color: '#fff',
    fontSize: '1.05rem',
    fontWeight: 700,
  },
  overview: {
    margin: 0,
    color: 'rgba(245,247,251,0.78)',
    lineHeight: 1.7,
    fontSize: '0.97rem',
  },
  metaList: {
    display: 'grid',
    gap: '10px',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  metaLabel: {
    color: 'rgba(245,247,251,0.58)',
    fontSize: '0.92rem',
  },
  metaValue: {
    color: '#fff',
    fontSize: '0.94rem',
    fontWeight: 600,
  },
  artworkGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '12px',
  },
  artworkImage: {
    width: '100%',
    height: 'auto',
    borderRadius: '14px',
    objectFit: 'cover',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
  },
};