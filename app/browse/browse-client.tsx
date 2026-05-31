'use client';

import { useState, useTransition } from 'react';
import { MediaCard } from '@/components/media-card';
import { TmdbGenre, TmdbMovie, TmdbListResponse } from '@/lib/tmdb';

type MediaTab = 'movie' | 'tv';

export function BrowseClient({
  movieGenres,
  tvGenres,
  initialItems,
  initialTotalPages,
}: {
  movieGenres: TmdbGenre[];
  tvGenres: TmdbGenre[];
  initialItems: TmdbMovie[];
  initialTotalPages: number;
}) {
  const [tab, setTab] = useState<MediaTab>('movie');
  const [genreId, setGenreId] = useState<number | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<TmdbMovie[]>(initialItems);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [isPending, startTransition] = useTransition();
  const [isReplacing, setIsReplacing] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('');
  
  const genres = tab === 'movie' ? movieGenres : tvGenres;

  const load = async (
    newTab: MediaTab,
    newGenre: number | undefined,
    newPage: number,
    replace = true
  ) => {
    const params = new URLSearchParams({ type: newTab, page: String(newPage) });
    if (typeof newGenre === 'number') params.set('genre', String(newGenre));

    if (replace) {
      setIsReplacing(true);
      setLoadingLabel(
        `Loading ${newTab === 'movie' ? 'movies' : 'TV shows'}...`
      );
      setItems([]);
      setPage(1);
      setTotalPages(1);
    }

    try {
      const res = await fetch(`/api/discover?${params.toString()}`);
      const data: TmdbListResponse<TmdbMovie> = await res.json();

      setItems((prev) => {
        const merged = replace
          ? (data.results ?? [])
          : [...prev, ...(data.results ?? [])];

        const unique = merged.filter(
          (item, index, self) =>
            index ===
            self.findIndex(
              (m) =>
                m.id === item.id &&
                (m.media_type ?? newTab) ===
                  (item.media_type ?? newTab)
            )
        );

        return unique;
      });
      setTotalPages(data.total_pages ?? 1);
      setPage(newPage);
    } finally {
      if (replace) {
        setIsReplacing(false);
        setLoadingLabel('');
      }
    }
  };

  const handleTab = (next: MediaTab) => {
    if (next === tab) return;
    setTab(next);
    setGenreId(undefined);
    setSearch('');
    startTransition(() => {
      load(next, undefined, 1, true);
    });
  };

  const handleGenre = (id: number | undefined) => {
    setGenreId(id);
    setSearch('');
    startTransition(() => {
      load(tab, id, 1, true);
    });
  };

  const handleLoadMore = () => {
    if (page >= totalPages) return;
    startTransition(() => {
      load(tab, genreId, page + 1, false);
    });
  };

  const filtered = search.trim()
    ? items.filter((m) =>
        (m.title ?? m.name ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : items;

  const showSkeletonGrid = isReplacing && items.length === 0;
  const skeletonCount = 12;

  return (
    <div style={s.root}>
      <div style={s.header}>
        <h1 style={s.heading}>Browse</h1>
      </div>

      {/* Movie / TV toggle */}
      <div style={s.tabs}>
        {(['movie', 'tv'] as MediaTab[]).map((t) => (
          <button
            key={t}
            onClick={() => handleTab(t)}
            style={{
              ...s.tab,
              background:
                tab === t ? '#ffffff' : 'rgba(255,255,255,0.06)',
              color:
                tab === t ? '#020617' : 'rgba(245,247,251,0.82)',
              border:
                tab === t
                  ? '1px solid transparent'
                  : '1px solid rgba(255,255,255,0.10)',
              boxShadow:
                tab === t
                  ? '0 14px 38px rgba(15,23,42,0.65)'
                  : 'none',
              transform: tab === t ? 'translateY(-1px)' : 'none',
              transition:
                'background 160ms ease-out, color 160ms ease-out, box-shadow 160ms ease-out, transform 160ms ease-out',
            }}
          >
            {t === 'movie' ? '🎬 Movies' : '📺 TV Shows'}
          </button>
        ))}
      </div>

      {/* Genre chips */}
      <div style={s.chips}>
        <button
          onClick={() => handleGenre(undefined)}
          style={{
            ...s.chip,
            background: !genreId
              ? 'rgba(122,240,255,0.16)'
              : 'rgba(255,255,255,0.05)',
            borderColor: !genreId
              ? 'rgba(122,240,255,0.38)'
              : 'rgba(255,255,255,0.10)',
            color: !genreId
              ? '#f9fafb'
              : 'rgba(248,250,252,0.78)',
          }}
        >
          All
        </button>
        {genres.map((g) => (
          <button
            key={g.id}
            onClick={() => handleGenre(g.id)}
            style={{
              ...s.chip,
              background: genreId === g.id
                ? 'rgba(122,240,255,0.16)'
                : 'rgba(255,255,255,0.05)',
              borderColor: genreId === g.id
                ? 'rgba(122,240,255,0.38)'
                : 'rgba(255,255,255,0.10)',
              color: genreId === g.id
                ? '#f9fafb'
                : 'rgba(248,250,252,0.78)',
            }}
          >
            {g.name}
          </button>
        ))}
      </div>

      {/* Loading label */}
      {isReplacing && (
        <div style={s.loadingState}>
          <div style={s.loadingDot} />
          <span style={s.loadingText}>
            {loadingLabel ||
              `Loading ${tab === 'movie' ? 'movies' : 'TV shows'}...`}
          </span>
        </div>
      )}

      <p style={s.count}>
        {isPending && !isReplacing
          ? 'Loading...'
          : `${filtered.length} titles`}
      </p>

      {/* GRID: skeletons vs real cards */}
      <div style={s.grid}>
        {showSkeletonGrid
          ? Array.from({ length: skeletonCount }).map((_, idx) => (
              <div key={idx} style={s.skeletonCard}>
                <div style={s.skeletonPoster} />
                <div style={s.skeletonTitleRow}>
                  <div style={s.skeletonTitle} />
                  <div style={s.skeletonBadge} />
                </div>
                <div style={s.skeletonMetaRow}>
                  <div style={s.skeletonMetaShort} />
                  <div style={s.skeletonMetaLong} />
                </div>
              </div>
            ))
          : filtered.map((item) => (
              <MediaCard
                key={`${tab}-${item.id}`}
                item={item}
                href={`/${tab}/${item.id}`}
                mediaType={tab === 'movie' ? 'Movie' : 'TV Show'}
              />
            ))}
      </div>

      {!search && page < totalPages && (
        <div style={s.loadMoreWrap}>
          <button
            onClick={handleLoadMore}
            disabled={isPending}
            style={s.loadMore}
          >
            {isPending && !isReplacing ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}

const shimmerBase = {
  position: 'relative' as const,
  overflow: 'hidden',
  backgroundColor: 'rgba(15,23,42,0.95)',
  backgroundImage:
    'linear-gradient(120deg, rgba(15,23,42,0.9) 0%, rgba(51,65,85,0.95) 20%, rgba(148,163,184,0.65) 40%, rgba(51,65,85,0.95) 60%, rgba(15,23,42,0.9) 100%)',
  backgroundSize: '200% 100%',
  animation: 'browseShimmer 1.25s ease-in-out infinite',
};

const s: Record<string, React.CSSProperties> = {
  root: {
    maxWidth: '1440px',
    margin: '0 auto',
    paddingBottom: '60px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '24px',
  },
  heading: {
    margin: 0,
    fontSize: 'clamp(1.8rem, 3vw, 2.8rem)',
    fontWeight: 900,
    letterSpacing: '-0.05em',
    color: '#f9fafb',
  },
  searchWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  searchIcon: {
    position: 'absolute',
    left: '14px',
    width: '18px',
    height: '18px',
    color: 'rgba(148,163,184,0.9)',
    pointerEvents: 'none',
  },
  searchInput: {
    height: '46px',
    width: '280px',
    paddingLeft: '42px',
    paddingRight: '16px',
    borderRadius: '999px',
    border: '1px solid rgba(148,163,184,0.4)',
    background:
      'radial-gradient(circle at top left, rgba(15,23,42,0.95), rgba(15,23,42,0.85))',
    color: '#e5e7eb',
    fontSize: '0.94rem',
    outline: 'none',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  },
  tabs: { display: 'flex', gap: '10px', marginBottom: '20px' },
  tab: {
    height: '42px',
    padding: '0 22px',
    borderRadius: '999px',
    fontWeight: 700,
    fontSize: '0.94rem',
    cursor: 'pointer',
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '24px',
  },
  chip: {
    height: '36px',
    padding: '0 16px',
    borderRadius: '999px',
    border: '1px solid',
    fontSize: '0.86rem',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  loadingState: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '14px',
    padding: '8px 12px',
    borderRadius: '14px',
    border: '1px solid rgba(148,163,184,0.55)',
    background:
      'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,64,175,0.45))',
  },
  loadingDot: {
    width: '10px',
    height: '10px',
    borderRadius: '999px',
    background: '#7af0ff',
    boxShadow: '0 0 0 0 rgba(122,240,255,0.7)',
    animation: 'searchPulse 1.15s ease-in-out infinite',
  },
  loadingText: {
    color: 'rgba(241,245,249,0.92)',
    fontSize: '0.9rem',
    fontWeight: 600,
  },

  count: {
    margin: '0 0 18px',
    color: 'rgba(148,163,184,0.9)',
    fontSize: '0.88rem',
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))',
    gap: '20px',
  },

  // Skeleton card = empty media card
  skeletonCard: {
    borderRadius: '24px',
    padding: '10px',
    background:
      'radial-gradient(circle at top, rgba(15,23,42,1), rgba(15,23,42,0.96))',
    border: '1px solid rgba(15,23,42,1)',
    boxShadow: '0 18px 45px rgba(0,0,0,0.45)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    animation: 'browsePulse 2.4s ease-in-out infinite',
  },
  skeletonPoster: {
    ...shimmerBase,
    borderRadius: '18px',
    width: '100%',
    aspectRatio: '2 / 3',
  },
  skeletonTitleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  skeletonTitle: {
    ...shimmerBase,
    borderRadius: '999px',
    height: '12px',
    width: '70%',
  },
  skeletonBadge: {
    ...shimmerBase,
    borderRadius: '999px',
    height: '10px',
    width: '18%',
  },
  skeletonMetaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  skeletonMetaShort: {
    ...shimmerBase,
    borderRadius: '999px',
    height: '9px',
    width: '22%',
  },
  skeletonMetaLong: {
    ...shimmerBase,
    borderRadius: '999px',
    height: '9px',
    width: '40%',
  },

  loadMoreWrap: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '36px',
  },
  loadMore: {
    height: '48px',
    padding: '0 36px',
    borderRadius: '14px',
    border: '1px solid rgba(148,163,184,0.5)',
    background: 'rgba(15,23,42,0.98)',
    color: '#e5e7eb',
    fontWeight: 700,
    fontSize: '0.96rem',
    cursor: 'pointer',
  },
};