'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type MediaType = 'movie' | 'tv';

type WatchPlayerClientProps = {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  overview?: string | null;
  posterPath?: string | null;
  backdropPath?: string | null;
  seasonNumber?: number;
  episodeNumber?: number;
  initialProvider?: string | null;
  initialServer?: string | null;
  initialProgressSeconds?: number;
  initialDurationSeconds?: number;
  autoplay?: boolean;
  availableProviders?: Array<{
    providerKey: string;
    displayName: string;
  }>;
  availableServers?: Array<{
    providerKey: string;
    serverKey: string;
    displayName: string;
  }>;
};

const DEFAULT_PROVIDERS = [
  { providerKey: 'vidsrc', displayName: 'VidSrc' },
  { providerKey: 'embed-su', displayName: 'EmbedSu' },
];

const DEFAULT_SERVERS = [
  { providerKey: 'vidsrc', serverKey: 'default', displayName: 'Default' },
  { providerKey: 'vidsrc', serverKey: 'auto', displayName: 'Auto' },
  { providerKey: 'embed-su', serverKey: 'default', displayName: 'Default' },
];

function buildEmbedUrl({
  mediaType,
  tmdbId,
  seasonNumber,
  episodeNumber,
  provider,
  server,
}: {
  mediaType: MediaType;
  tmdbId: number;
  seasonNumber: number;
  episodeNumber: number;
  provider: string;
  server: string;
}) {
  if (provider === 'embed-su') {
    if (mediaType === 'movie') return `https://embed.su/movie/${tmdbId}`;
    return `https://embed.su/tv/${tmdbId}/${seasonNumber}/${episodeNumber}`;
  }

  if (mediaType === 'movie') {
    return `https://vidsrc.xyz/embed/movie/${tmdbId}${server !== 'default' ? `?server=${encodeURIComponent(server)}` : ''}`;
  }

  return `https://vidsrc.xyz/embed/tv/${tmdbId}/${seasonNumber}-${episodeNumber}${
    server !== 'default' ? `?server=${encodeURIComponent(server)}` : ''
  }`;
}

export function WatchPlayerClient({
  tmdbId,
  mediaType,
  title,
  overview,
  posterPath,
  backdropPath,
  seasonNumber = 0,
  episodeNumber = 0,
  initialProvider = 'vidsrc',
  initialServer = 'default',
  initialProgressSeconds = 0,
  initialDurationSeconds = 5400,
  autoplay = false,
  availableProviders = DEFAULT_PROVIDERS,
  availableServers = DEFAULT_SERVERS,
}: WatchPlayerClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const [provider, setProvider] = useState(initialProvider || 'vidsrc');
  const [server, setServer] = useState(initialServer || 'default');
  const [progressSeconds, setProgressSeconds] = useState(initialProgressSeconds);
  const [durationSeconds] = useState(initialDurationSeconds || 5400);
  const [status, setStatus] = useState<'playing' | 'paused' | 'completed'>(
    autoplay ? 'playing' : 'paused'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDetails, setShowDetails] = useState(true);

  const progressPercent = useMemo(() => {
    if (!durationSeconds) return 0;
    return Math.max(0, Math.min(100, (progressSeconds / durationSeconds) * 100));
  }, [progressSeconds, durationSeconds]);

  const filteredServers = useMemo(() => {
    const items = availableServers.filter((item) => item.providerKey === provider);
    return items.length > 0
      ? items
      : [{ providerKey: provider, serverKey: 'default', displayName: 'Default' }];
  }, [availableServers, provider]);

  const embedUrl = useMemo(() => {
    return buildEmbedUrl({
      mediaType,
      tmdbId,
      seasonNumber,
      episodeNumber,
      provider,
      server,
    });
  }, [mediaType, tmdbId, seasonNumber, episodeNumber, provider, server]);

  const savePreferences = useCallback(
    async (nextProvider: string, nextServer: string) => {
      try {
        await fetch('/api/watch/preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            preferredProvider: nextProvider,
            preferredServer: nextServer,
            autoplay,
            playbackSpeed: 1,
          }),
        });
      } catch {}
    },
    [autoplay]
  );

  const saveProgress = useCallback(
    async (nextStatus: 'playing' | 'paused' | 'completed') => {
      setIsSaving(true);

      try {
        await fetch('/api/watch/progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tmdbId,
            mediaType,
            title,
            posterPath,
            backdropPath,
            seasonNumber,
            episodeNumber,
            providerKey: provider,
            serverKey: server,
            progressSeconds,
            durationSeconds,
            status: nextStatus,
          }),
        });
      } catch {
      } finally {
        setIsSaving(false);
      }
    },
    [
      tmdbId,
      mediaType,
      title,
      posterPath,
      backdropPath,
      seasonNumber,
      episodeNumber,
      provider,
      server,
      progressSeconds,
      durationSeconds,
    ]
  );

  const updateUrl = useCallback(
    (nextProvider: string, nextServer: string) => {
      const params = new URLSearchParams(searchParams.toString());

      params.set('provider', nextProvider);
      params.set('server', nextServer);

      if (mediaType === 'tv') {
        params.set('season', String(seasonNumber));
        params.set('episode', String(episodeNumber));
      }

      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, mediaType, seasonNumber, episodeNumber]
  );

  const toggleFullscreen = async () => {
    const element = iframeRef.current?.parentElement;
    if (!element) return;

    try {
      if (!document.fullscreenElement) {
        await element.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {}
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFullscreen();
      }

      if (e.key === ' ') {
        e.preventDefault();
        setStatus((prev) => {
          const next = prev === 'playing' ? 'paused' : 'playing';
          void saveProgress(next);
          return next;
        });
      }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [saveProgress]);

  useEffect(() => {
    if (status !== 'playing') return;

    const interval = window.setInterval(() => {
      setProgressSeconds((prev) => {
        const next = prev + 15;
        if (next >= durationSeconds * 0.95) {
          void saveProgress('completed');
          setStatus('completed');
          return durationSeconds;
        }
        void saveProgress('playing');
        return next;
      });
    }, 15000);

    return () => window.clearInterval(interval);
  }, [status, durationSeconds, saveProgress]);

  useEffect(() => {
    const onBeforeUnload = () => {
      const payload = {
        tmdbId,
        mediaType,
        title,
        posterPath,
        backdropPath,
        seasonNumber,
        episodeNumber,
        providerKey: provider,
        serverKey: server,
        progressSeconds,
        durationSeconds,
        status: status === 'completed' ? 'completed' : 'paused',
      };

      navigator.sendBeacon(
        '/api/watch/progress',
        new Blob([JSON.stringify(payload)], { type: 'application/json' })
      );
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [
    tmdbId,
    mediaType,
    title,
    posterPath,
    backdropPath,
    seasonNumber,
    episodeNumber,
    provider,
    server,
    progressSeconds,
    durationSeconds,
    status,
  ]);

  useEffect(() => {
    const allowedOrigin = (() => {
      try {
        return new URL(embedUrl).origin;
      } catch {
        return '';
      }
    })();

    const onMessage = (event: MessageEvent) => {
      if (!allowedOrigin || event.origin !== allowedOrigin) return;
      if (!event.data) return;
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [embedUrl]);

  return (
    <div style={styles.shell}>
      <div style={styles.playerSection}>
        <div style={styles.playerFrameWrap}>
          <iframe
            ref={iframeRef}
            src={embedUrl}
            title={title}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="origin-when-cross-origin"
            style={styles.iframe}
          />
        </div>

        <div style={styles.controls}>
          <div style={styles.leftControls}>
            <button
              onClick={() => {
                const next = status === 'playing' ? 'paused' : 'playing';
                setStatus(next);
                void saveProgress(next);
              }}
              style={styles.primaryButton}
            >
              {status === 'playing' ? 'Pause' : 'Play'}
            </button>

            <button onClick={() => void saveProgress('completed')} style={styles.secondaryButton}>
              Mark watched
            </button>

            <button onClick={toggleFullscreen} style={styles.secondaryButton}>
              {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            </button>
          </div>

          <div style={styles.rightControls}>
            <span style={styles.metaText}>{isSaving ? 'Saving…' : 'Synced'}</span>
          </div>
        </div>

        <div style={styles.progressWrap}>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progressPercent}%` }} />
          </div>
          <div style={styles.progressMeta}>
            <span>{Math.floor(progressSeconds)}s watched</span>
            <span>{Math.floor(progressPercent)}%</span>
          </div>
        </div>
      </div>

      <aside style={styles.sidebar}>
        <div style={styles.card}>
          <p style={styles.kicker}>{mediaType === 'movie' ? 'Movie' : 'TV episode'}</p>
          <h1 style={styles.title}>{title}</h1>
          {overview ? <p style={styles.overview}>{overview}</p> : null}
        </div>

        <div style={styles.card}>
          <div style={styles.sectionHead}>
            <h2 style={styles.sectionTitle}>Playback settings</h2>
            <button onClick={() => setShowDetails((prev) => !prev)} style={styles.textButton}>
              {showDetails ? 'Hide' : 'Show'}
            </button>
          </div>

          {showDetails && (
            <div style={styles.settingsGrid}>
              <label style={styles.field}>
                <span style={styles.label}>Provider</span>
                <select
                  value={provider}
                  onChange={async (e) => {
                    const nextProvider = e.target.value;
                    const nextServer =
                      availableServers.find((x) => x.providerKey === nextProvider)?.serverKey ?? 'default';
                    setProvider(nextProvider);
                    setServer(nextServer);
                    updateUrl(nextProvider, nextServer);
                    await savePreferences(nextProvider, nextServer);
                  }}
                  style={styles.select}
                >
                  {availableProviders.map((item) => (
                    <option key={item.providerKey} value={item.providerKey}>
                      {item.displayName}
                    </option>
                  ))}
                </select>
              </label>

              <label style={styles.field}>
                <span style={styles.label}>Server</span>
                <select
                  value={server}
                  onChange={async (e) => {
                    const nextServer = e.target.value;
                    setServer(nextServer);
                    updateUrl(provider, nextServer);
                    await savePreferences(provider, nextServer);
                  }}
                  style={styles.select}
                >
                  {filteredServers.map((item) => (
                    <option key={`${item.providerKey}-${item.serverKey}`} value={item.serverKey}>
                      {item.displayName}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>Session</h2>
          <ul style={styles.list}>
            <li>Status: {status}</li>
            <li>Provider: {provider}</li>
            <li>Server: {server}</li>
            {mediaType === 'tv' && <li>Season: {seasonNumber}</li>}
            {mediaType === 'tv' && <li>Episode: {episodeNumber}</li>}
          </ul>
        </div>
      </aside>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.6fr) minmax(320px, 0.8fr)',
    gap: '24px',
    padding: '18px',
  },
  playerSection: {
    minWidth: 0,
  },
  playerFrameWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: '16 / 9',
    borderRadius: '22px',
    overflow: 'hidden',
    background: '#000',
    boxShadow: '0 20px 60px rgba(0,0,0,0.36)',
  },
  iframe: {
    width: '100%',
    height: '100%',
    border: 'none',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
    marginTop: '16px',
  },
  leftControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  rightControls: {
    display: 'flex',
    alignItems: 'center',
  },
  primaryButton: {
    height: '46px',
    padding: '0 18px',
    borderRadius: '14px',
    border: 'none',
    background: '#ffffff',
    color: '#07101c',
    fontWeight: 800,
    cursor: 'pointer',
  },
  secondaryButton: {
    height: '46px',
    padding: '0 16px',
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
  },
  metaText: {
    color: 'rgba(245,247,251,0.58)',
    fontSize: '0.92rem',
  },
  progressWrap: {
    marginTop: '16px',
  },
  progressBar: {
    height: '8px',
    borderRadius: '999px',
    background: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '999px',
    background: 'linear-gradient(90deg, #7af0ff 0%, #ffffff 100%)',
  },
  progressMeta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '8px',
    color: 'rgba(245,247,251,0.56)',
    fontSize: '0.9rem',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  card: {
    borderRadius: '18px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(10px)',
    padding: '18px',
  },
  kicker: {
    margin: '0 0 8px',
    color: 'rgba(122,240,255,0.78)',
    fontSize: '0.78rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    fontWeight: 700,
  },
  title: {
    margin: '0 0 10px',
    color: '#fff',
    fontSize: '1.65rem',
    fontWeight: 800,
    lineHeight: 1.08,
  },
  overview: {
    margin: 0,
    color: 'rgba(245,247,251,0.78)',
    lineHeight: 1.65,
    fontSize: '0.97rem',
  },
  sectionHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '12px',
  },
  sectionTitle: {
    margin: 0,
    color: '#fff',
    fontSize: '1.04rem',
    fontWeight: 700,
  },
  textButton: {
    border: 'none',
    background: 'transparent',
    color: 'rgba(122,240,255,0.86)',
    cursor: 'pointer',
    fontWeight: 700,
  },
  settingsGrid: {
    display: 'grid',
    gap: '12px',
  },
  field: {
    display: 'grid',
    gap: '6px',
  },
  label: {
    color: 'rgba(245,247,251,0.58)',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  select: {
    height: '46px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(8,12,20,0.88)',
    color: '#fff',
    padding: '0 12px',
    outline: 'none',
  },
  list: {
    margin: 0,
    paddingLeft: '18px',
    color: 'rgba(245,247,251,0.78)',
    lineHeight: 1.8,
  },
};