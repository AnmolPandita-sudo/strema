'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MonitorPlay,
  Play,
  Tv,
  Film,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  buildPlayerUrl,
  type PlayerProviderKey,
  type MediaType as CoreMediaType,
} from '@/lib/player';

// type Provider = 'vidking' | 'vidsrc';
// type MediaType = 'movie' | 'tv';

type  Provider = PlayerProviderKey;
type MediaType = CoreMediaType;

type WatchPlayerProps = {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  season?: number;
  episode?: number;
  initialProvider?: Provider;
};

type PlayerEventPayload = {
  event?: 'timeupdate' | 'play' | 'pause' | 'ended' | 'seeked';
  currentTime?: number;
  duration?: number;
  progress?: number;
  season?: number;
  episode?: number;
};

const PROVIDERS: Provider[] = ['vidking', 'vidsrc'];



function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function buildEpisodeNumbers(max = 20) {
  return Array.from({ length: max }, (_, i) => i + 1);
}

export function WatchPlayer({
  tmdbId,
  mediaType,
  title,
  season = 1,
  episode = 1,
  initialProvider = 'vidking',
}: WatchPlayerProps) {
  const router = useRouter();

  const [provider, setProvider] = useState<Provider>(initialProvider);
  const [playerEvent, setPlayerEvent] = useState<PlayerEventPayload | null>(null);
  const [isFrameLoading, setIsFrameLoading] = useState(true);
  const [syncState, setSyncState] =
    useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<number | null>(null);

  const playerShellRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const hasSeenPlaybackRef = useRef(false);
  const lastSentRef = useRef<{
    progressSeconds: number;
    durationSeconds: number;
    progressPercent: number;
    status: 'playing' | 'paused' | 'completed';
  } | null>(null);
  const lastProgressSendRef = useRef<number>(0); // throttle progress sync

  const lastEpisodeRef = useRef<{ season: number | null; episode: number | null } | null>(null);

  const src = useMemo(() => {
    return buildPlayerUrl({
      provider,
      mediaType,
      tmdbId,
      season,
      episode,
      autoplay: true,
      subtitleLanguage: 'en',
    });
  }, [provider, tmdbId, mediaType, season, episode]);

  const progressValue = Math.min(
    Math.max(Number(playerEvent?.progress ?? 0), 0),
    100
  );

  const focusIframe = () => {
    try {
      iframeRef.current?.focus();
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    setIsFrameLoading(true);
    setPlayerEvent(null);
    hasSeenPlaybackRef.current = false;
    lastSentRef.current = null;
  }, [src]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const raw = event.data;

      if (!raw) return;
      if (
        event.origin === 'https://www.vidking.net' &&
        typeof raw === 'object' &&
        raw !== null &&
        'type' in raw &&
        (raw as any).type === 'MEDIA_DATA' &&
        'data' in raw &&
        (raw as any).data?.progress
      ) {
        const progress = (raw as any).data.progress;

        const normalized: PlayerEventPayload = {
          event: progress.completed ? 'ended' : 'timeupdate',
          currentTime: Number(progress.watched ?? 0),
          duration: Number(progress.duration ?? 0),
          progress: Number(progress.percent ?? 0),
        };

        setPlayerEvent(normalized);

        if ((normalized.currentTime ?? 0) > 0) {
          hasSeenPlaybackRef.current = true;
        }

        return;
      }

      // Standard PLAYER_EVENT messages
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);

          if (parsed?.type !== 'PLAYER_EVENT') return;

          const payload = parsed.data as PlayerEventPayload;

          // Instant URL sync when Vidking moves to another episode
          if (
            mediaType === 'tv' &&
            typeof payload.season === 'number' &&
            typeof payload.episode === 'number' &&
            (payload.season !== season || payload.episode !== episode)
          ) {
            router.replace(
              `/watch/tv/${tmdbId}?season=${payload.season}&episode=${payload.episode}`,
              { scroll: false }
            );
          }

          setPlayerEvent(payload);

          switch (payload.event) {
            case 'play':
              hasSeenPlaybackRef.current = true;
              break;
            case 'timeupdate':
              if (Number(payload.currentTime ?? 0) > 0) {
                hasSeenPlaybackRef.current = true;
              }
              break;
            case 'pause':
            case 'ended':
            case 'seeked':
            default:
              break;
          }
        } catch {
          // ignore malformed messages
        }
      }
    };

    window.addEventListener('message', handler);
    return () => {
      window.removeEventListener('message', handler);
    };
  }, [mediaType, season, episode, router, tmdbId]);

  useEffect(() => {
    if (!playerEvent) return;

    const progressSeconds = Math.max(
      0,
      Math.floor(Number(playerEvent.currentTime ?? 0))
    );
    const durationSeconds = Math.max(
      0,
      Math.floor(Number(playerEvent.duration ?? 0))
    );

    const calculatedPercent =
      durationSeconds > 0
        ? clampNumber((progressSeconds / durationSeconds) * 100, 0, 100)
        : 0;

    const progressPercent = Number(
      clampNumber(
        Number(playerEvent.progress ?? calculatedPercent),
        0,
        100
      ).toFixed(2)
    );

    const status: 'playing' | 'paused' | 'completed' =
      playerEvent.event === 'ended' || progressPercent >= 95
        ? 'completed'
        : playerEvent.event === 'pause'
        ? 'paused'
        : 'playing';

    const effectiveSeason =
      mediaType === 'tv'
        ? Number(playerEvent.season ?? season)
        : null;

    const effectiveEpisode =
      mediaType === 'tv'
        ? Number(playerEvent.episode ?? episode)
        : null;

    // NEW: detect episode change and reset throttle
    const lastEp = lastEpisodeRef.current;
    const isNewEpisode =
      mediaType === 'tv' &&
      (lastEp?.season !== effectiveSeason || lastEp?.episode !== effectiveEpisode);

    if (isNewEpisode) {
      // allow immediate sync for the new episode
      lastProgressSendRef.current = 0;
    }
    lastEpisodeRef.current = { season: effectiveSeason, episode: effectiveEpisode };

    if (progressSeconds <= 0 && durationSeconds <= 0 && progressPercent <= 0) {
      return;
    }

    const previous = lastSentRef.current;

    const isCompletion = status === 'completed' || progressPercent >= 95;

    const now = Date.now();
    const tooSoon =
      !isCompletion && now - lastProgressSendRef.current < 10_000; // 10 seconds

    if (tooSoon) {
      return;
    }

    // const shouldSkipSmallDiff =
    //   previous &&
    //   Math.abs(previous.progressPercent - progressPercent) < 1 &&
    //   previous.status === status &&
    //   Math.abs(previous.progressSeconds - progressSeconds) < 15 &&
    //   previous.durationSeconds === durationSeconds;

    // if (shouldSkipSmallDiff) {
    //   return;
    // }

    lastProgressSendRef.current = now;

    const controller = new AbortController();

    async function sendProgress() {
      try {
        setSyncState('saving');

        const response = await fetch('/api/watch/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tmdbId,
            mediaType,
            title,
            seasonNumber: effectiveSeason,
            episodeNumber: effectiveEpisode,
            providerKey: provider,
            serverKey: null,
            progressSeconds,
            durationSeconds,
            progressPercent,
            status,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          setSyncState('error');
          return;
        }

        lastSentRef.current = {
          progressSeconds,
          durationSeconds,
          progressPercent,
          status,
        };

        setSyncState('saved');
        setLastSaved(Date.now());
      } catch {
        if (!controller.signal.aborted) {
          setSyncState('error');
        }
      }
    }

    void sendProgress();
    return () => {
      controller.abort();
    };
  }, [playerEvent, tmdbId, mediaType, title, season, episode, provider]);

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-2xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_18px_rgba(239,68,68,0.95)]" />
              <span className="text-xs font-bold uppercase tracking-[0.28em] text-red-400">
                Strema Player
              </span>
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-tight text-white">
              {title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-400">
              <span className="inline-flex items-center gap-1.5">
                {mediaType === 'movie' ? <Film size={15} /> : <Tv size={15} />}
                {mediaType === 'movie'
                  ? 'Movie'
                  : `Season ${season} · Episode ${episode}`}
              </span>

              <span className="h-1 w-1 rounded-full bg-gray-600" />

              <span className="inline-flex items-center gap-1.5">
                <MonitorPlay size={15} />
                {provider.toUpperCase()}
              </span>
            </div>

            <span className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-400 uppercase tracking-[0.28em]">
              <h1>To convert your srt subtitles to vtt format go to down the page</h1>
            </span>

            <span className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-400 uppercase tracking-[0.28em]">
              <h1>
                If your video is not playing, please change the server inside Video
                Player
              </h1>
            </span>
            {mediaType === 'tv' && (
              <div className="mt-4 space-y-2">
                {/* Label + current episode (nice on mobile) */}
                <div className="flex items-center justify-between">
                  <span className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-gray-400">
                    Episodes · Season {season}
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[0.7rem] font-semibold text-gray-100">
                    Current: E{episode}
                  </span>
                </div>

                {/* Scrollable pill row — same on all breakpoints, tuned for mobile */}
                <div
                  className="
                    flex gap-2
                    overflow-x-auto
                    pt-1 pb-2
                    scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent
                  "
                >
                  {buildEpisodeNumbers(20).map((ep) => {
                    const active = ep === episode;

                    return (
                      <a
                        key={ep}
                        href={`/watch/tv/${tmdbId}?season=${season}&episode=${ep}`}
                        className={`
                          flex-shrink-0
                          rounded-full px-3 py-1.5
                          text-[0.7rem] font-semibold
                          transition
                          scroll-mx-2
                          ${
                            active
                              ? 'bg-red-500 text-white shadow-[0_8px_22px_rgba(239,68,68,0.45)]'
                              : 'border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                          }
                        `}
                      >
                        E{ep}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {PROVIDERS.map((item) => {
              const active = item === provider;

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setProvider(item)}
                  className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 ${
                    active
                      ? 'bg-red-500 text-white shadow-[0_10px_35px_rgba(239,68,68,0.45)]'
                      : 'border border-white/10 bg-white/[0.04] text-gray-300 hover:border-white/20 hover:bg-white/[0.08]'
                  }`}
                >
                  {item === 'vidking' ? 'Vidking' : 'VidSrc'}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div
        ref={playerShellRef}
        className="group relative overflow-hidden rounded-[34px] border border-white/10 bg-black shadow-[0_30px_100px_rgba(0,0,0,0.8)]"
        onClick={focusIframe}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-32 bg-gradient-to-b from-black/90 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-32 bg-gradient-to-t from-black/90 to-transparent" />

        <div className="pointer-events-none absolute left-5 top-5 z-30 flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-red-500 shadow-[0_0_18px_rgba(239,68,68,0.9)]" />
          <span className="hidden md:inline-block text-sm font-bold tracking-[0.28em] text-white">
            STREMA
          </span>
        </div>

        <div className="relative aspect-video w-full bg-black">
          <iframe
            ref={iframeRef}
            key={src}
            src={src}
            title={`${title} player`}
            className="absolute inset-0 h-full w-full border-0"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
            referrerPolicy="origin-when-cross-origin"
            tabIndex={0}
            onLoad={() => {
              setIsFrameLoading(false);

              setTimeout(() => {
                focusIframe();
              }, 150);
            }}
          />
        </div>

        {isFrameLoading && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="rounded-2xl border border-white/10 bg-black/50 px-6 py-5 text-center backdrop-blur-xl">
              <LoaderCircle
                className="mx-auto mb-3 animate-spin text-red-400"
                size={28}
              />
              <p className="text-sm font-medium text-white">Loading player...</p>
              <p className="mt-1 text-xs text-gray-400">
                Initializing {provider}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl">
          <div className="flex items-center gap-2">
            <Play size={18} className="text-red-400" />
            <h2 className="text-lg font-bold text-white">Now Playing</h2>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-gray-500">
                Provider
              </p>
              <p className="mt-2 text-lg font-bold text-white">
                {provider.toUpperCase()}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-gray-500">
                TMDB ID
              </p>
              <p className="mt-2 text-lg font-bold text-white">{tmdbId}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl">
          <h2 className="text-lg font-bold text-white">Watch Progress</h2>

          <div className="mt-5">
            <div className="overflow-hidden rounded-full bg:white/10">
              <div
                className="h-2 rounded-full bg-red-500 transition-all duration-500"
                style={{ width: `${progressValue}%` }}
              />
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Sync Status</span>

                <div className="flex items-center gap-2">
                  {syncState === 'saved' ? (
                    <>
                      <CheckCircle2 size={16} className="text-green-400" />
                      <span className="text-sm font-medium text-green-400">
                        Synced
                      </span>
                    </>
                  ) : syncState === 'saving' ? (
                    <>
                      <LoaderCircle
                        size={16}
                        className="animate-spin text-gray-300"
                      />
                      <span className="text-sm font-medium text-gray-300">
                        Saving...
                      </span>
                    </>
                  ) : syncState === 'error' ? (
                    <>
                      <AlertCircle size={16} className="text-red-400" />
                      <span className="text-sm font-medium text-red-400">
                        Error
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-gray-300">Idle</span>
                  )}
                </div>
              </div>

              {lastSaved ? (
                <p className="mt-3 text-xs text-gray-500">
                  Updated at {new Date(lastSaved).toLocaleTimeString()}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}