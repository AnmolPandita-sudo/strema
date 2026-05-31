'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toggleWatchlist } from '@/app/actions/watchlist';

export function WatchlistButton({
  tmdbId,
  mediaType,
  initialSaved = false,
  revalidate = [],
  className = '',
  filledLabel = 'In Watchlist',
  emptyLabel = 'Watchlist',
  compact = false,
}: {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  initialSaved?: boolean;
  revalidate?: string[];
  className?: string;
  filledLabel?: string;
  emptyLabel?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setSaved(initialSaved);
  }, [initialSaved]);

  const handleClick = () => {
    startTransition(async () => {
      const previous = saved;
      setSaved(!previous);

      try {
        const result = await toggleWatchlist({
          tmdbId,
          mediaType,
          revalidate,
        });

        setSaved(result.saved);
        router.refresh();
      } catch {
        setSaved(previous);
      }
    });
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-label={saved ? 'Remove from watchlist' : 'Add to watchlist'}
        className={
          className ||
          'inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 font-bold text-white transition hover:bg-white/20 active:scale-95 disabled:opacity-60'
        }
      >
        {saved ? '✓' : '+'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={
        className ||
        'inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-7 py-3 font-bold text-white transition hover:bg-white/20 active:scale-95 disabled:opacity-60'
      }
    >
      <span>{saved ? '✓' : '+'}</span>
      <span>{saved ? filledLabel : emptyLabel}</span>
    </button>
  );
}