'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  getBackdropUrl,
  getTitle,
  getReleaseDate,
  TmdbMovie,
  getPosterUrl,
} from '@/lib/tmdb';
import { WatchlistButton } from '@/components/watchlist-button';
import Image from 'next/image';

type HeroBannerItem = TmdbMovie & {
  media_type?: 'movie' | 'tv';
  trailerKey?: string | null;
  popularity?: number;
  vote_count?: number;
};

const AUTO_SLIDE_DELAY = 7000;


export const HeroBanner = memo(function HeroBanner({
  movies,
  navbar,
  watchlistKeys = [],
}: {
  movies: HeroBannerItem[];
  navbar?: React.ReactNode;
  watchlistKeys?: string[];
}) {
  const filteredMovies = useMemo(() => {
    return [...movies]
      .filter(
      (item) =>
        (item.backdrop_path || item.poster_path) &&
        (item.media_type === 'movie' ||
          item.media_type === 'tv')
    )
      .sort(
        (a, b) =>
          (b.popularity ?? 0) -
          (a.popularity ?? 0)
      )
      .slice(0, 12);
  }, [movies]);

  const [active, setActive] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const nextSlide = useCallback(() => {
    setActive((prev) => (prev + 1) % filteredMovies.length);
  }, [filteredMovies.length]);

  const prevSlide = useCallback(() => {
    setActive((prev) =>
      prev === 0
        ? filteredMovies.length - 1
        : prev - 1
    );
  }, [filteredMovies.length]);

  const handleTouchStart = (
    e: React.TouchEvent
  ) => {
    touchStartX.current =
      e.touches[0].clientX;
  };

  const handleTouchMove = (
    e: React.TouchEvent
  ) => {
    touchEndX.current =
      e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const distance =
      touchStartX.current -
      touchEndX.current;

    if (Math.abs(distance) < 50) return;

    if (distance > 0) {
      nextSlide();
    } else {
      prevSlide();
    }
  };

  const slideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const watchlistSet = useMemo(
    () => new Set(watchlistKeys),
    [watchlistKeys]
  );

  const clearTimers = useCallback(() => {
    if (slideTimerRef.current) {
      clearTimeout(slideTimerRef.current);
    }
  }, []);

  const resetTimers = useCallback(() => {
    clearTimers();

    if (!filteredMovies.length) return;

    slideTimerRef.current = setTimeout(() => {
      setActive((prev) => (prev + 1) % filteredMovies.length);
    }, AUTO_SLIDE_DELAY);
  }, [clearTimers, filteredMovies.length]);

  useEffect(() => {
    if (!filteredMovies.length) return;

    resetTimers();

    return () => {
      clearTimers();
    };
  }, [active, filteredMovies.length, resetTimers, clearTimers]);

  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;

      ticking = true;

      window.requestAnimationFrame(() => {
        setScrollY(window.scrollY);
        ticking = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
  const update = () => {
    setIsMobile(window.innerWidth <= 768);
  };

  update();

  window.addEventListener('resize', update);

  return () => {
    window.removeEventListener('resize', update);
  };
}, []);

  const goTo = useCallback((index: number) => {
    setActive(index);
  }, []);

  if (!filteredMovies.length) return null;

  const movie = filteredMovies[active];

  const mediaType = movie.media_type === 'tv' ? 'tv' : 'movie';

  const detailHref =
    mediaType === 'tv'
      ? `/tv/${movie.id}`
      : `/movie/${movie.id}`;

  const playHref =
    mediaType === 'tv'
      ? `/watch/tv/${movie.id}?season=1&episode=1`
      : `/watch/movie/${movie.id}`;

  const title = getTitle(movie);

  // const titleLength = title.length;

  // const titleFontSize =
  //   titleLength <= 18
  //     ? 'clamp(3rem, 5vw, 4.8rem)'
  //     : titleLength <= 28
  //     ? 'clamp(2.6rem, 4.4vw, 4rem)'
  //     : titleLength <= 40
  //     ? 'clamp(2.1rem, 3.5vw, 3.3rem)'
  //     : 'clamp(1.75rem, 3vw, 2.7rem)';

  const releaseDate = getReleaseDate(movie);

  const year = releaseDate
    ? new Date(releaseDate).getFullYear()
    : '—';

  const rating = movie.vote_average?.toFixed(1) ?? '0.0';

  const isSaved = watchlistSet.has(`${mediaType}:${movie.id}`);

  const vh =
    typeof window !== 'undefined'
      ? window.innerHeight
      : 900;

  const scrollRatio = Math.min(scrollY / (vh * 0.6), 1);

  const imgOpacity = 1 - scrollRatio * 0.18;

  const blendOpacity = scrollRatio;

  return (
    <section
      style={s.root}
      onMouseEnter={clearTimers}
      onMouseLeave={resetTimers}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <button
        onClick={prevSlide}
        style={s.arrowLeft}
      >
        ❮
      </button>
      {filteredMovies.map((m, i) => {
        const imageSrc =
          isMobile && m.poster_path
            ? getPosterUrl(m.poster_path, 'original')
            : getBackdropUrl(m.backdrop_path, 'original');

        return (
          <Image
            key={`${m.media_type ?? 'movie'}-${m.id}`}
            src={imageSrc}
            alt={getTitle(m) || 'Movie Banner'} // Added fallback just in case getTitle returns undefined
            priority={i === active} // Let Next.js handle eager loading and fetch priority
            draggable={false}
            style={{
              ...s.backdrop,
              opacity: i === active ? imgOpacity : 0,
              objectPosition: isMobile
                ? 'center center'
                : 'center top',
            }}
            height={1080}
            width={1920}
          />
        );
      })}

      <button
        onClick={nextSlide}
        style={s.arrowRight}
      >
        ❯
      </button>

      <div style={s.topShade} />
      <div style={s.sideOverlay} />
      

      <div
        style={{
          ...s.dynamicOverlay,
          opacity: blendOpacity * 0.1,
        }}
      />
      <div style={s.bottomFade} />

      {navbar && <div style={s.navbarSlot}>{navbar}</div>}

      <div
        key={`${mediaType}:${movie.id}`}
        style={{
          ...s.content,
          opacity: Math.max(0, 1 - scrollRatio * 2.2),
          transform: `translateY(${scrollY * 0.16}px)`,
        }}
      >
        <div style={s.badge}>
          <span style={s.badgeTag} className='hidden sm:inline-flex'>Trending This Week</span>

          <span style={s.meta}>
            ★ {rating} &nbsp;·&nbsp; {year}
          </span>
        </div>

        <h1
          style={{
            ...s.title,
            fontSize: 'clamp(1.25rem, 4vw, 6rem)',
            lineHeight: '0.95',
          }}
        >
          {title}
        </h1>

        <p
          style={{
            ...s.overview,
            fontSize: 'clamp(0.9rem, 1.4vw, 1.1rem)',
            lineHeight: '1.7',
          }}
        >
          {movie.overview || 'No description available.'}
        </p>

        <div
          style={{
            ...s.buttons,
            gap: 'clamp(0.5rem, 1vw, 1rem)',
            flexWrap: 'wrap',
          }}
        >
          <Link href={playHref} style={s.btnPrimary}>
            <svg
              width="23"
              height="23"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M8 5v14l11-7z" />
            </svg>

            Play
          </Link>

          <Link href={detailHref} style={s.btnSecondary}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>

            More Info
          </Link>

          <WatchlistButton
            key={`${mediaType}:${movie.id}`}
            tmdbId={movie.id}
            mediaType={mediaType}
            initialSaved={isSaved}
            revalidate={['/']}
            compact
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-md transition-all duration-300 hover:bg-white/20 hover:scale-105 cursor-pointer"
          />
        </div>
      </div>

      <div style={s.dots}>
        {filteredMovies.map((m, i) => (
          <button
            key={`${m.media_type ?? 'movie'}-${m.id}-${i}`}
            onClick={() => goTo(i)}
            aria-label={`Slide ${i + 1}`}
            style={{
              ...s.dot,
              background:
                i === active
                  ? '#ffffff'
                  : 'rgba(255,255,255,0.28)',
              width: i === active ? '30px' : '8px',
              opacity: i === active ? 1 : 0.7,
            }}
          />
        ))}
      </div>
    </section>
  );
});

const s: Record<string, React.CSSProperties> = {
  root: {
    position: 'relative',
    width: '100%',
    height: '95vh',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'flex-end',
    background: `
      linear-gradient(
        to top,
        #0A0B0E 0%,
        rgba(10,11,14,1) 18%,
        rgba(10,11,14,0.95) 32%,
        rgba(10,11,14,0.85) 48%,
        rgba(10,11,14,0.65) 68%,
        rgba(10,11,14,0.35) 86%,
        transparent 100%
      )
    `,
  },

  backdrop: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center top',
    zIndex: 0,
    filter: 'saturate(1.05) contrast(1.04)',
    willChange: 'opacity',
    transition: 'opacity 900ms ease',
    userSelect: 'none',
    pointerEvents: 'none',
  },

  topShade: {
    position: 'absolute',
    inset: 0,
    zIndex: 2,
    pointerEvents: 'none',
    background:
      'linear-gradient(to bottom, rgba(10,11,14,0.70) 0%, rgba(10,11,14,0.24) 18%, rgba(10,11,14,0) 38%)',
  },

  sideOverlay: {
    position: 'absolute',
    inset: 0,
    zIndex: 3,
    pointerEvents: 'none',
    background:
      'linear-gradient(to right, rgba(10,11,14,0.92) 10%, rgba(10,11,14,0.68) 28%, rgba(10,11,14,0.30) 48%, rgba(10,11,14,0.08) 70%, rgba(10,11,14,0) 88%)',
  },

  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '20%',
    zIndex: 4,
    pointerEvents: 'none',
    background: `
      linear-gradient(
        to top,
        #0A0B0E 0%,
        rgba(10,11,14,0.98) 12%,
        rgba(10,11,14,0.92) 24%,
        rgba(10,11,14,0.74) 42%,
        rgba(10,11,14,0.42) 66%,
        rgba(10,11,14,0.12) 84%,
        transparent 100%
      )
    `,
  },

  dynamicOverlay: {
    position: 'absolute',
    inset: 0,
    zIndex: 5,
    background: '#04060a',
    pointerEvents: 'none',
    transition: 'opacity 80ms linear',
  },

  navbarSlot: {
    position: 'absolute',
    insetInline: 0,
    top: 0,
    zIndex: 20,
  },

  content: {
    position: 'relative',
    zIndex: 10,
    width: '100%',
    maxWidth: '620px',
    padding: '0 20px 80px',
    transition:
      'transform 80ms linear, opacity 80ms linear',
    willChange: 'transform, opacity',
  },

  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '18px',
    flexWrap: 'wrap',
  },

  badgeTag: {
    background: '#E53935',
    color: '#ffffff',
    fontWeight: 800,
    fontSize: '0.72rem',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    padding: '6px 11px',
    borderRadius: '999px',
    boxShadow: '0 6px 18px rgba(229,57,53,0.28)',
  },

  meta: {
    color: 'rgba(245,247,251,0.68)',
    fontSize: '0.92rem',
    fontWeight: 500,
  },

  title: {
    margin: '0 0 18px',
    fontWeight: 950,
    lineHeight: 0.94,
    letterSpacing: '-0.05em',
    color: '#ffffff',
    textTransform: 'uppercase',
    textWrap: 'balance',
    maxWidth: '12ch',
    textShadow: '0 10px 28px rgba(0,0,0,0.45)',
  },

  overview: {
    margin: '0 0 24px',
    color: 'rgba(245,247,251,0.78)',
    fontSize: '1.02rem',
    lineHeight: 1.75,
    maxWidth: '56ch',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },

  buttons: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    flexWrap: 'wrap',
  },

  btnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    height: '54px',
    padding: '0 20px',
    borderRadius: '999px',
    background: '#ffffff',
    color: '#07101c',
    fontWeight: 800,
    fontSize: '1rem',
    textDecoration: 'none',
    boxShadow: '0 14px 34px rgba(0,0,0,0.34)',
    transition: 'transform 220ms ease, opacity 220ms ease',
    whiteSpace: 'nowrap',
  },

  btnSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    height: '54px',
    padding: '0 20px',
    borderRadius: '999px',
    background: 'rgba(255,255,255,0.10)',
    color: '#ffffff',
    fontWeight: 700,
    fontSize: '0.96rem',
    textDecoration: 'none',
    border: '1px solid rgba(255,255,255,0.16)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    transition: 'all 220ms ease',
    whiteSpace: 'nowrap',
  },

  dots: {
    position: 'absolute',
    bottom: '34px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 12,
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
  },

  dot: {
    height: '8px',
    borderRadius: '999px',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    transition:
      'width 260ms ease, background 260ms ease, opacity 260ms ease',
  },
  arrowLeft: {
  position: 'absolute',
  left: '20px',
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 20,
  width: '48px',
  height: '48px',
  borderRadius: '999px',
  border: 'none',
  background: 'rgba(0,0,0,0.4)',
  color: '#fff',
  cursor: 'pointer',
},

arrowRight: {
  position: 'absolute',
  right: '20px',
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 20,
  width: '48px',
  height: '48px',
  borderRadius: '999px',
  border: 'none',
  background: 'rgba(0,0,0,0.4)',
  color: '#fff',
  cursor: 'pointer',
},
};