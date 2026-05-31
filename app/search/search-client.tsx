'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MediaCard } from '@/components/media-card';
import type { TmdbMovie, TmdbListResponse } from '@/lib/tmdb';

type MediaTab = 'movie' | 'tv';
const RECENT_KEY = 'strema_recent_searches';
const MAX_RECENT = 6;

export function SearchClient({
  overlay = false,
  onClose,
}: {
  overlay?: boolean;
  onClose?: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQ = searchParams.get('q') ?? '';
  const initialType = (searchParams.get('type') as MediaTab | null) ?? 'movie';

  const [query, setQuery] = useState(initialQ);
  const [tab, setTab] = useState<MediaTab>(initialType === 'tv' ? 'tv' : 'movie');
  const [results, setResults] = useState<TmdbMovie[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [pendingLabel, setPendingLabel] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isTyping, setIsTyping] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(RECENT_KEY);
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch {}
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (initialQ.trim()) {
      runSearch(initialQ.trim(), tab, 1, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!overlay) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [overlay, onClose]);

  const saveRecent = (q: string) => {
    if (!q.trim()) return;
    setRecentSearches((prev) => {
      const updated = [q, ...prev.filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, MAX_RECENT);
      try {
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const buildSearchHref = (q: string, t: MediaTab, pg = 1) => {
    const params = new URLSearchParams({
      q,
      type: t,
      page: String(pg),
    });
    return `/search?${params.toString()}`;
  };

  const runSearch = async (q: string, t: MediaTab, pg: number, replace: boolean) => {
    if (!q.trim()) {
      setResults([]);
      setTotalPages(0);
      setPage(1);
      setIsSearching(false);
      setPendingLabel('');
      return;
    }

    const params = new URLSearchParams({
      q: q.trim(),
      type: t,
      page: String(pg),
    });

    if (replace) {
      setIsSearching(true);
      setPendingLabel(`Searching ${t === 'movie' ? 'movies' : 'TV shows'}...`);
      setResults([]);
      setTotalPages(0);
      setPage(1);
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/search?${params.toString()}`, {
          method: 'GET',
          cache: 'no-store',
        });

        if (!res.ok) throw new Error('Search failed');

        const data: TmdbListResponse<TmdbMovie> = await res.json();

        setResults((prev) =>
          replace ? (data.results ?? []) : [...prev, ...(data.results ?? [])]
        );
        setTotalPages(data.total_pages ?? 0);
        setPage(pg);
      } catch {
        if (replace) {
          setResults([]);
          setTotalPages(0);
          setPage(1);
        }
      } finally {
        if (replace) {
          setIsSearching(false);
          setPendingLabel('');
        }
      }
    });
  };

  const handleInput = (val: string) => {
    setQuery(val);
    setIsTyping(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setIsTyping(false);

      const trimmed = val.trim();
      if (!trimmed) {
        setResults([]);
        setTotalPages(0);
        setPage(1);
        if (!overlay) router.replace('/search');
        return;
      }

      saveRecent(trimmed);
      runSearch(trimmed, tab, 1, true);

      if (!overlay) {
        router.replace(buildSearchHref(trimmed, tab, 1), { scroll: false });
      }
    }, 400);
  };

  const handleTab = (nextTab: MediaTab) => {
    setTab(nextTab);

    if (!query.trim()) return;

    runSearch(query.trim(), nextTab, 1, true);

    if (!overlay) {
      router.replace(buildSearchHref(query.trim(), nextTab, 1), { scroll: false });
    }
  };

  const handleRecent = (q: string) => {
    setQuery(q);
    runSearch(q, tab, 1, true);

    if (!overlay) {
      router.replace(buildSearchHref(q, tab, 1), { scroll: false });
    }
  };

  const clearRecent = () => {
    setRecentSearches([]);
    try {
      window.localStorage.removeItem(RECENT_KEY);
    } catch {}
  };

  const handleLoadMore = () => {
    if (!query.trim() || page >= totalPages) return;
    runSearch(query.trim(), tab, page + 1, false);

    if (!overlay) {
      router.replace(buildSearchHref(query.trim(), tab, page + 1), { scroll: false });
    }
  };

  const handleOpenItem = (item: TmdbMovie) => {
    const href = `/${tab}/${item.id}`;
    if (overlay) {
      onClose?.();
      router.push(href);
      return;
    }
    router.push(href);
  };

  const showEmpty = !isPending && !isTyping && query.trim() !== '' && results.length === 0;
  const showSkeleton = (isSearching || isPending || isTyping) && results.length === 0;
  const headingText = useMemo(() => {
    if (!query.trim()) return 'Search';
    return `Results for “${query.trim()}”`;
  }, [query]);

  const content = (
    <div style={overlay ? s.overlayShell : s.root}>
      {overlay && (
        <div style={s.overlayHeader}>
          <div>
            <p style={s.kicker}>Discover</p>
            <h2 style={s.overlayTitle}>{headingText}</h2>
          </div>
          <button onClick={onClose} style={s.overlayClose} aria-label="Close search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.41L10.59 13.4 4.29 19.7 2.88 18.29 9.17 12 2.88 5.71 4.29 4.29l6.3 6.3 6.29-6.3z" />
            </svg>
          </button>
        </div>
      )}

      <div style={s.searchBar}>
        <svg style={s.searchIcon} viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          placeholder="Search movies and TV shows"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          style={s.input}
          autoComplete="off"
          spellCheck={false}
        />

        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              setTotalPages(0);
              setPage(1);
              if (!overlay) router.replace('/search', { scroll: false });
            }}
            style={s.clearBtn}
            aria-label="Clear"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        )}
      </div>

      {!query && recentSearches.length > 0 && (
        <div style={s.panel}>
          <div style={s.recentHead}>
            <span style={s.recentLabel}>Recent searches</span>
            <button onClick={clearRecent} style={s.recentClear}>Clear all</button>
          </div>

          <div style={overlay ? s.recentList : s.recentChips}>
            {recentSearches.map((r) => (
              <button
                key={r}
                onClick={() => handleRecent(r)}
                style={overlay ? s.recentRow : s.recentChip}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.48 }}>
                  <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18z" />
                </svg>
                <span>{r}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {query.trim() && (
        <div style={s.tabs}>
          {(['movie', 'tv'] as MediaTab[]).map((t) => (
            <button
              key={t}
              onClick={() => handleTab(t)}
              style={{
                ...s.tab,
                background: tab === t ? '#ffffff' : 'rgba(255,255,255,0.05)',
                color: tab === t ? '#07101c' : 'rgba(245,247,251,0.82)',
                border: tab === t ? '1px solid transparent' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {t === 'movie' ? 'Movies' : 'TV Shows'}
            </button>
          ))}

          {!isPending && results.length > 0 && (
            <span style={s.resultCount}>
              {results.length} result{results.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {isSearching && query.trim() && (
        <div style={s.searchingState}>
          <div style={s.searchingDot} />
          <span style={s.searchingText}>{pendingLabel}</span>
        </div>
      )}

      {showSkeleton && (
        <div
          style={overlay ? s.overlayGrid : s.grid}
          className={overlay ? 'search-scroll' : undefined}
        >
          {Array.from({ length: overlay ? 8 : 12 }).map((_, i) => (
            <div key={i} style={s.skeleton} />
          ))}
        </div>
      )}

      {!showSkeleton && results.length > 0 && (
        <div
          style={overlay ? s.overlayGrid : s.grid}
          className={overlay ? 'search-scroll' : undefined}
        >
          {results.map((item) => (
            <div
              key={item.id}
              onClick={() => handleOpenItem(item)}
              style={s.cardButton}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleOpenItem(item);
                }
              }}
              aria-label={`Open ${'title' in item ? item.title : item.name}`}
            >
              <MediaCard
                item={item}
                href={`/${tab}/${item.id}`}
                mediaType={tab === 'movie' ? 'Movie' : 'TV Show'}
              />
            </div>
          ))}
        </div>
      )}

      {!showSkeleton && results.length > 0 && page < totalPages && !overlay && (
        <div style={s.loadMoreWrap}>
          <button onClick={handleLoadMore} disabled={isPending} style={s.loadMore}>
            {isPending ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}

      {showEmpty && (
        <div style={s.empty}>
          <span style={s.emptyEmoji}>🎬</span>
          <p style={s.emptyTitle}>No results for “{query}”</p>
          <p style={s.emptyHint}>Try another title, shorter wording, or switch between Movies and TV Shows.</p>
        </div>
      )}

      {!query && recentSearches.length === 0 && (
        <div style={s.empty}>
          <span style={s.emptyEmoji}>🔎</span>
          <p style={s.emptyTitle}>Search the full catalogue</p>
          <p style={s.emptyHint}>Find movies and TV shows, then jump straight into watching.</p>
        </div>
      )}
    </div>
  );

  if (!overlay) return content;

  return (
    <div style={s.overlayBackdrop} onClick={onClose}>
      <div style={s.overlayWrap} onClick={(e) => e.stopPropagation()}>
        {content}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: {
    maxWidth: '1440px',
    margin: '0 auto',
    padding: '6px 18px 60px',
  },
  overlayBackdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 180,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: '24px',
    background: 'rgba(2,6,12,0.56)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    overflow: 'hidden',
  },
  overlayWrap: {
    width: '100%',
    maxWidth: '860px',
    height: 'calc(100vh - 48px)',
    display: 'flex',
  },
  overlayShell: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '28px',
    border: '1px solid rgba(255,255,255,0.08)',
    background:
      'linear-gradient(180deg, rgba(10,14,24,0.96) 0%, rgba(7,10,18,0.94) 100%)',
    boxShadow: '0 30px 90px rgba(0,0,0,0.45)',
    padding: '18px',
    overflow: 'hidden',
  },
  overlayHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '18px',
    marginBottom: '14px',
  },
  kicker: {
    margin: '0 0 4px',
    color: 'rgba(122,240,255,0.78)',
    fontSize: '0.78rem',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    fontWeight: 700,
  },
  overlayTitle: {
    margin: 0,
    color: '#fff',
    fontSize: '1.8rem',
    lineHeight: 1.05,
    fontWeight: 800,
    letterSpacing: '-0.04em',
  },
  overlayClose: {
    width: '42px',
    height: '42px',
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
  searchBar: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    marginBottom: '18px',
  },
  searchIcon: {
    position: 'absolute',
    left: '20px',
    width: '22px',
    height: '22px',
    color: 'rgba(245,247,251,0.42)',
    pointerEvents: 'none',
    zIndex: 1,
  },
  input: {
    width: '100%',
    height: '62px',
    paddingLeft: '56px',
    paddingRight: '52px',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: '1.05rem',
    fontWeight: 500,
    outline: 'none',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    boxShadow: '0 14px 40px rgba(0,0,0,0.22)',
    boxSizing: 'border-box',
  },
  clearBtn: {
    position: 'absolute',
    right: '16px',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(255,255,255,0.08)',
    color: 'rgba(245,247,251,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  panel: {
    marginBottom: '18px',
    borderRadius: '18px',
    border: '1px solid rgba(255,255,255,0.07)',
    background: 'rgba(255,255,255,0.035)',
    padding: '14px',
  },
  recentHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '10px',
  },
  recentLabel: {
    color: 'rgba(245,247,251,0.56)',
    fontSize: '0.84rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  recentClear: {
    background: 'none',
    border: 'none',
    color: 'rgba(122,240,255,0.84)',
    fontSize: '0.86rem',
    cursor: 'pointer',
  },
  recentChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  recentList: {
    display: 'grid',
    gap: '6px',
  },
  recentChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    minHeight: '38px',
    padding: '0 16px',
    borderRadius: '999px',
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(245,247,251,0.82)',
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  recentRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minHeight: '42px',
    width: '100%',
    padding: '0 8px',
    borderRadius: '12px',
    border: 'none',
    background: 'transparent',
    color: 'rgba(245,247,251,0.82)',
    textAlign: 'left',
    cursor: 'pointer',
  },
  tabs: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  tab: {
    height: '42px',
    padding: '0 22px',
    borderRadius: '999px',
    fontWeight: 700,
    fontSize: '0.94rem',
    cursor: 'pointer',
  },
  resultCount: {
    marginLeft: 'auto',
    color: 'rgba(245,247,251,0.48)',
    fontSize: '0.88rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))',
    gap: '20px',
  },
  overlayGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '16px',
    flex: 1,
    overflowY: 'auto',
    paddingRight: '4px',
    paddingBottom: '18px',
    overscrollBehavior: 'contain',
  },
  cardButton: {
    display: 'block',
    width: '100%',
    background: 'transparent',
    border: 'none',
    padding: 0,
    textAlign: 'inherit',
    cursor: 'pointer',
  },
  skeleton: {
    aspectRatio: '0.72 / 1',
    borderRadius: '16px',
    background:
      'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite',
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
    border: '1px solid rgba(255,255,255,0.16)',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    fontWeight: 700,
    fontSize: '0.96rem',
    cursor: 'pointer',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '72px 24px',
    textAlign: 'center',
  },
  emptyEmoji: {
    fontSize: '3rem',
    marginBottom: '14px',
  },
  emptyTitle: {
    margin: '0 0 10px',
    fontSize: '1.28rem',
    fontWeight: 700,
    color: 'rgba(245,247,251,0.92)',
  },
  emptyHint: {
    margin: 0,
    color: 'rgba(245,247,251,0.5)',
    fontSize: '0.96rem',
    maxWidth: '40ch',
    lineHeight: 1.6,
  },
  searchingState: {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  marginBottom: '16px',
  padding: '10px 14px',
  borderRadius: '14px',
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.04)',
  },
  searchingDot: {
    width: '10px',
    height: '10px',
    borderRadius: '999px',
    background: '#7af0ff',
    boxShadow: '0 0 0 0 rgba(122,240,255,0.7)',
    animation: 'searchPulse 1.15s ease-in-out infinite',
  },

  searchingText: {
    color: 'rgba(245,247,251,0.82)',
    fontSize: '0.92rem',
    fontWeight: 600,
  },
};