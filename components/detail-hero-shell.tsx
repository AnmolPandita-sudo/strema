'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { HeroTopControls } from '@/components/hero-top-controls';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

type DetailHeroShellProps = {
  imageSrc: string;
  imageAlt: string;
  trailerUrl?: string | null;
  children: React.ReactNode;
};

function extractYouTubeVideoId(url?: string | null) {
  if (!url) return null;

  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.replace('/', '');
    }

    if (parsed.pathname.includes('/embed/')) {
      return parsed.pathname.split('/embed/')[1];
    }

    return parsed.searchParams.get('v');
  } catch {
    return null;
  }
}

function loadYouTubeApi(): Promise<any> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }

    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }

    const existingScript = document.getElementById('youtube-iframe-api');

    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'youtube-iframe-api';
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.body.appendChild(script);
    }

    window.onYouTubeIframeAPIReady = () => {
      resolve(window.YT);
    };
  });
}

export function DetailHeroShell({
  imageSrc,
  imageAlt,
  trailerUrl,
  children,
}: DetailHeroShellProps) {
  const [muted, setMuted] = useState(true);
  const [videoReady, setVideoReady] = useState(false);

  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);

  const videoId = useMemo(() => {
    return extractYouTubeVideoId(trailerUrl);
  }, [trailerUrl]);

  useEffect(() => {
    if (!videoId || !playerContainerRef.current) return;

    let mounted = true;

    const init = async () => {
      try {
        const YT = await loadYouTubeApi();

        if (!mounted || !YT?.Player || !playerContainerRef.current) return;

        if (playerRef.current) {
          try {
            playerRef.current.destroy();
          } catch {}
        }

        playerRef.current = new YT.Player(playerContainerRef.current, {
          videoId,
          playerVars: {
            autoplay: 1,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            mute: 1,
            loop: 1,
            playlist: videoId,
            playsinline: 1,
            iv_load_policy: 3,
            fs: 0,
          },
          events: {
            onReady: (event: any) => {
              try {
                event.target.mute();
                event.target.playVideo();
              } catch {}

              if (mounted) {
                setVideoReady(true);
              }
            },

            onStateChange: (event: any) => {
              if (!window.YT) return;

              if (event.data === window.YT.PlayerState.PLAYING) {
                setVideoReady(true);
              }
            },

            onError: () => {
              if (mounted) {
                setVideoReady(false);
              }
            },
          },
        });
      } catch {
        setVideoReady(false);
      }
    };

    init();

    return () => {
      mounted = false;

      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {}
      }
    };
  }, [videoId]);

  useEffect(() => {
    const player = playerRef.current;

    if (!player) return;

    try {
      if (muted) {
        player.mute();
      } else {
        player.unMute();
      }
    } catch {}
  }, [muted]);

  return (
    <section className="relative min-h-[720px] overflow-hidden bg-[#0b0b0f]">
      <div className="absolute inset-0 z-0">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </div>

      {videoId && (
        <div className="absolute inset-0 z-[1] overflow-hidden">
          <div
            className={`absolute left-1/2 top-1/2 h-[120%] w-[140vw] min-w-[1200px] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-700 md:w-[120vw] ${
              videoReady ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div
              ref={playerContainerRef}
              className="h-full w-full scale-[1.22]"
            />
          </div>
        </div>
      )}

      <HeroTopControls
        muted={muted}
        onToggleMute={() => setMuted((prev) => !prev)}
      />

      <div className="absolute inset-0 z-[2] bg-black/30" />

      <div
        className="pointer-events-none absolute inset-0 z-[3]"
        style={{
          background:
            'linear-gradient(to right, rgba(11,11,15,0.92) 0%, rgba(11,11,15,0.80) 18%, rgba(11,11,15,0.52) 40%, rgba(11,11,15,0.18) 62%, rgba(11,11,15,0.02) 82%)',
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 z-[4]"
        style={{
          background:
            'linear-gradient(to bottom, rgba(11,11,15,0.10) 0%, rgba(11,11,15,0.06) 14%, rgba(11,11,15,0.16) 30%, rgba(11,11,15,0.42) 54%, rgba(11,11,15,0.74) 73%, rgba(11,11,15,0.94) 88%, #0b0b0f 100%)',
        }}
      />

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-[320px]"
        style={{
          background:
            'linear-gradient(to bottom, rgba(11,11,15,0) 0%, rgba(11,11,15,0.12) 14%, rgba(11,11,15,0.34) 34%, rgba(11,11,15,0.68) 58%, rgba(11,11,15,0.92) 80%, #0b0b0f 100%)',
        }}
      />

      <div className="relative z-10 flex min-h-[720px] items-end">
        <div className="mx-auto w-full max-w-7xl px-6 pb-20 md:px-10 md:pb-24">
          <div className="max-w-3xl">{children}</div>
        </div>
      </div>
    </section>
  );
}