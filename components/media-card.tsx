'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useOptimistic, useState, useTransition, useRef } from 'react';
import { Play, Plus, X } from 'lucide-react';
import { toggleWatchlist } from '@/app/actions/watchlist';
import { createClient } from '@/lib/supabase/client';
import {
  getPosterUrl,
  getReleaseDate,
  getTitle,
  getYoutubeEmbedUrl,
  TmdbMovie,
} from '@/lib/tmdb';

type MediaCardItem = TmdbMovie & {
  media_type?: 'movie' | 'tv';
  trailerKey?: string | null;
  season?: number | null;
  episode?: number | null;
  progress?: number | null;
};

export function MediaCard({
  item,
  href,
  rank,
  mediaType = 'Movie',
  watchlistMode = false,
  disablePreview = false,
  continueWatchingMode = false,
}: {
  item: MediaCardItem;
  href: string;
  rank?: number;
  mediaType?: 'Movie' | 'TV Show';
  watchlistMode?: boolean;
  disablePreview?: boolean;
  continueWatchingMode?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isHovered, setIsHovered] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const [optimisticSaved, setOptimisticSaved] = useOptimistic(
    watchlistMode,
    (_currentState, nextState: boolean) => nextState
  );

  const title = getTitle(item);
  const releaseDate = getReleaseDate(item);
  const year = releaseDate ? new Date(releaseDate).getFullYear() : '—';
  const rating = item.vote_average ? item.vote_average.toFixed(1) : '0.0';
  const resolvedMediaType = item.media_type === 'tv' ? 'tv' : 'movie';

  const playHref =
    resolvedMediaType === 'tv'
      ? `/watch/tv/${item.id}?season=${Number(item.season ?? 1)}&episode=${Number(item.episode ?? 1)}`
      : `/watch/movie/${item.id}`;

  useEffect(() => {
    if (continueWatchingMode || disablePreview || !isHovered || !item.trailerKey) {
      setShowPreview(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowPreview(true);
    }, 3000);

    return () => {
      clearTimeout(timer);
      setShowPreview(false);
    };
  }, [continueWatchingMode, disablePreview, isHovered, item.trailerKey]);

  const handlePlay = () => {
    router.push(playHref);
  };

  const handleWatchlist = () => {
    startTransition(async () => {
      const nextSaved = !optimisticSaved;
      setOptimisticSaved(nextSaved);

      try {
        await toggleWatchlist({
          tmdbId: item.id,
          mediaType: resolvedMediaType,
        });
      } catch {
        setOptimisticSaved(!nextSaved);
      }
    });
  };

  const handleRemoveFromContinueWatching = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      setIsRemoving(true);
      
      // 🔥 SMOOTH ANIMATION: Target the wrapper div from SectionRow and collapse it
      if (cardRef.current && cardRef.current.parentElement) {
        const wrapper = cardRef.current.parentElement;
        wrapper.style.transition = 'all 350ms cubic-bezier(0.25, 1, 0.5, 1)';
        wrapper.style.opacity = '0';
        wrapper.style.transform = 'scale(0.85)';
        wrapper.style.flex = '0 0 0px'; // Collapse the width
        wrapper.style.marginRight = '-18px'; // Counteract the 18px gap in SectionRow
        wrapper.style.overflow = 'hidden';
      }

      // We no longer need setIsDeleted(true) because the CSS animation hides it perfectly!

      const supabase = createClient();

      let query = supabase
        .from('continue_watching')
        .delete()
        .eq('tmdb_id', item.id)
        .eq('media_type', resolvedMediaType);

      if (resolvedMediaType === 'tv') {
        query = query
          .eq('season_number', Number(item.season ?? 1))
          .eq('episode_number', Number(item.episode ?? 1));
      }

      const { error } = await query;

      if (error) {
        console.error('Failed to remove from continue watching:', error.message);
        return;
      }

      router.refresh();
    } finally {
      // Keep isRemoving true so they can't spam click it while it animates away
    }
  };

  const previewUrl =
    !continueWatchingMode && !disablePreview && item.trailerKey && showPreview
      ? getYoutubeEmbedUrl(item.trailerKey, true, true)
      : null;

  const overlayVisible = continueWatchingMode ? isHovered : isHovered;

  if (isDeleted) {
    return null;
  }

  return (
    <div
      ref={cardRef}
      style={{
        ...styles.card,
        transition: 'opacity 150ms ease',
        opacity: isRemoving ? 0.5 : 1,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowPreview(false);
      }}
    >
      <div style={styles.posterShell}>
        <Link href={href} style={styles.posterLink} aria-label={title}>
          <div
            style={{
              ...styles.posterWrap,
              transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
            }}
          >
            {typeof rank === 'number' ? (
              <div style={styles.rank}>
                TOP
                <br />
                {String(rank).padStart(2, '0')}
              </div>
            ) : null}

            <img
              src={getPosterUrl(item.poster_path, 'w500')}
              alt={title}
              style={styles.poster}
            />

            {previewUrl ? (
              <div style={styles.previewLayer}>
                <iframe
                  src={previewUrl}
                  title={`${title} preview`}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  style={styles.previewFrame}
                />
              </div>
            ) : null}

            <div
              style={{
                ...styles.fade,
                opacity: previewUrl ? 0.92 : 1,
              }}
            />
          </div>
        </Link>

        <div
          style={{
            ...styles.actionsOverlay,
            opacity: overlayVisible ? 1 : 0,
            transform: overlayVisible ? 'translateY(0)' : 'translateY(10px)',
            pointerEvents: overlayVisible ? 'auto' : 'none',
          }}
        >
          {continueWatchingMode ? (
            <>
              <button
                type="button"
                onClick={handlePlay}
                aria-label={`Play ${title}`}
                style={styles.continuePlayButton}
              >
                <Play size={18} fill="currentColor" />
                <span>Play</span>
              </button>

              <button
                type="button"
                onClick={handleRemoveFromContinueWatching}
                aria-label={`Remove ${title} from continue watching`}
                disabled={isRemoving}
                style={{
                  ...styles.actionButtonSecondary,
                  opacity: isRemoving ? 0.6 : 1,
                  cursor: isRemoving ? 'not-allowed' : 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handlePlay}
                aria-label={`Play ${title}`}
                style={styles.actionButtonPrimary}
              >
                <Play size={18} fill="currentColor" />
              </button>

              <button
                type="button"
                onClick={handleWatchlist}
                aria-label={
                  optimisticSaved
                    ? `Remove ${title} from watchlist`
                    : `Add ${title} to watchlist`
                }
                disabled={isPending}
                style={{
                  ...styles.actionButtonSecondary,
                  opacity: isPending ? 0.6 : 1,
                  cursor: isPending ? 'not-allowed' : 'pointer',
                }}
              >
                {optimisticSaved ? <X size={18} /> : <Plus size={18} />}
              </button>
            </>
          )}
        </div>
      </div>

      <Link href={href} style={styles.bodyLink}>
        <div style={styles.body}>
          <h3
            style={{
              ...styles.title,
              color: isHovered ? '#e53935' : 'rgba(245,247,251,0.95)',
            }}
          >
            {title}
          </h3>

          <div
            style={{
              ...styles.meta,
              color: isHovered ? 'rgba(229,57,53,0.92)' : 'rgba(245,247,251,0.60)',
            }}
          >
            <span
              style={{
                ...styles.rating,
                color: isHovered ? '#ff6b66' : 'rgba(245,247,251,0.78)',
              }}
            >
              <span style={styles.star}>★</span> {rating}
            </span>

            <span
              style={{
                ...styles.dot,
                color: isHovered ? 'rgba(255,107,102,0.92)' : 'rgba(245,247,251,0.60)',
              }}
            >
              {year}
            </span>

            <span
              style={{
                ...styles.dot,
                color: isHovered ? 'rgba(255,107,102,0.92)' : 'rgba(245,247,251,0.60)',
              }}
            >
              {mediaType}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: 'grid',
    gap: '10px',
    color: 'inherit',
    textDecoration: 'none',
  },
  posterShell: {
    position: 'relative',
  },
  posterLink: {
    display: 'block',
    color: 'inherit',
    textDecoration: 'none',
  },
  posterWrap: {
    position: 'relative',
    aspectRatio: '0.72 / 1',
    borderRadius: '16px',
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.04)',
    boxShadow: '0 18px 50px rgba(0,0,0,0.38)',
    transition: 'transform 220ms cubic-bezier(.22,1,.36,1)',
  },
  poster: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  previewLayer: {
    position: 'absolute',
    inset: 0,
    zIndex: 1,
    overflow: 'hidden',
    pointerEvents: 'none',
    background: '#000',
  },
  previewFrame: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '220%',
    height: '120%',
    transform: 'translate(-50%, -50%)',
    border: 'none',
    pointerEvents: 'none',
  },
  fade: {
    position: 'absolute',
    inset: 0,
    zIndex: 2,
    background: 'linear-gradient(180deg, rgba(5,8,15,0) 48%, rgba(5,8,15,0.7) 100%)',
    transition: 'opacity 240ms ease',
  },
  actionsOverlay: {
    position: 'absolute',
    left: '12px',
    right: '12px',
    bottom: '12px',
    zIndex: 5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    transition: 'opacity 180ms ease, transform 180ms ease',
  },
  actionButtonPrimary: {
    width: '42px',
    height: '42px',
    border: 'none',
    borderRadius: '999px',
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(255,255,255,0.96)',
    color: '#0b1020',
    cursor: 'pointer',
    boxShadow: '0 10px 24px rgba(0,0,0,0.28)',
  },
  continuePlayButton: {
    height: '42px',
    minWidth: '98px',
    padding: '0 16px',
    border: 'none',
    borderRadius: '999px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    background: 'rgba(255,255,255,0.96)',
    color: '#0b1020',
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 10px 24px rgba(0,0,0,0.28)',
  },
  actionButtonSecondary: {
    width: '42px',
    height: '42px',
    border: '1px solid rgba(255,255,255,0.22)',
    borderRadius: '999px',
    display: 'grid',
    placeItems: 'center',
    background: 'rgba(10,14,24,0.72)',
    color: '#fff',
    cursor: 'pointer',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    boxShadow: '0 10px 24px rgba(0,0,0,0.22)',
    flexShrink: 0,
  },
  rank: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 4,
    background: '#e53935',
    color: '#fff',
    fontWeight: 800,
    fontSize: '0.7rem',
    lineHeight: 1,
    padding: '8px 8px 10px',
    borderBottomRightRadius: '14px',
    textAlign: 'left',
    letterSpacing: '0.02em',
    boxShadow: '0 10px 25px rgba(229,57,53,.25)',
  },
  bodyLink: {
    color: 'inherit',
    textDecoration: 'none',
  },
  body: {
    display: 'grid',
    gap: '8px',
    padding: '0 2px',
  },
  title: {
    margin: 0,
    fontSize: '0.98rem',
    lineHeight: 1.35,
    letterSpacing: '-0.02em',
    color: 'rgba(245,247,251,0.95)',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '5px',
    flexWrap: 'wrap',
    color: 'rgba(245,247,251,0.60)',
    fontSize: '0.70rem',
    marginLeft: '7px',
    marginRight: '7px',
  },
  rating: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    color: 'rgba(245,247,251,0.78)',
  },
  star: {
    color: '#e53935',
  },
  dot: {
    display: 'inline-flex',
    alignItems: 'center',
  },
};