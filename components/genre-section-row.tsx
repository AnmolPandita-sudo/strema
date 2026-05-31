'use client';

import { useEffect, useRef, useState } from 'react';
import { SectionRow } from '@/components/section-row';
import { TmdbMovie } from '@/lib/tmdb';

type Genre = {
  id: number;
  name: string;
};

type MixedMediaItem = TmdbMovie & {
  media_type?: 'movie' | 'tv';
};

export function GenreSectionRow({
  title,
  href,
  genres,
}: {
  title: string;
  href?: string;
  genres: Genre[];
}) {
  const [selectedGenre, setSelectedGenre] = useState<number | null>(genres[0]?.id ?? null);
  const [selectedGenreName, setSelectedGenreName] = useState<string>(genres[0]?.name ?? 'Genre');
  const [items, setItems] = useState<MixedMediaItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!selectedGenre) return;

    let ignore = false;

    async function loadGenreItems() {
      setLoading(true);

      try {
        const res = await fetch(`/api/genre/mixed?genreId=${selectedGenre}`);
        const data = await res.json();

        if (!ignore) {
          setItems(data.results ?? []);
        }
      } catch {
        if (!ignore) {
          setItems([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadGenreItems();

    return () => {
      ignore = true;
    };
  }, [selectedGenre]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const genreDropdown = (
    <div style={styles.dropdownWrap} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={styles.dropdownButton}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selectedGenreName}
        <span style={styles.chevron}>▾</span>
      </button>

      {open ? (
        <div style={styles.dropdownMenu} role="listbox">
          {genres.map((genre) => (
            <button
              key={genre.id}
              type="button"
              onClick={() => {
                setSelectedGenre(genre.id);
                setSelectedGenreName(genre.name);
                setOpen(false);
              }}
              style={styles.dropdownItem}
            >
              {genre.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );

  if (loading) {
    return (
      <SectionRow
        title={title}
        href={href}
        items={[]}
        headerRight={genreDropdown}
      />
    );
  }

  return (
    <SectionRow
      title={title}
      href={href}
      items={items}
      headerRight={genreDropdown}
    />
  );
}

const styles: Record<string, React.CSSProperties> = {
  dropdownWrap: {
    position: 'relative',
  },
  dropdownButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderRadius: '999px',
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.06)',
    color: 'white',
    fontSize: '0.92rem',
    cursor: 'pointer',
  },
  chevron: {
    opacity: 0.72,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    left: 0,
    width: '240px',
    maxHeight: '280px',
    overflowY: 'auto',
    padding: '8px',
    borderRadius: '18px',
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(15,15,18,0.96)',
    backdropFilter: 'blur(18px)',
    zIndex: 50,
    boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
  },
  dropdownItem: {
    display: 'block',
    width: '100%',
    padding: '10px 12px',
    border: 'none',
    borderRadius: '12px',
    background: 'transparent',
    color: 'white',
    textAlign: 'left',
    cursor: 'pointer',
  },
};