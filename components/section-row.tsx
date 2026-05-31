import { ReactNode } from 'react';
import { MediaCard } from '@/components/media-card';
import { TmdbMovie } from '@/lib/tmdb';

type MixedMediaItem = TmdbMovie & {
  media_type?: 'movie' | 'tv';
  href?: string;
  season?: number | null;
  episode?: number | null;
  progress?: number | null;
};

export function SectionRow({
  title,
  href,
  items,
  mediaType = 'Movie',
  watchlistMode = false,
  continueWatchingMode = false,
  headerRight,
  hideHeader = false,
  sectionStyle,
  disablePreview = true,
  showRank = true,
}: {
  title: ReactNode;
  href?: string;
  items: MixedMediaItem[];
  mediaType?: 'Movie' | 'TV Show';
  watchlistMode?: boolean;
  continueWatchingMode?: boolean;
  headerRight?: ReactNode;
  hideHeader?: boolean;
  sectionStyle?: React.CSSProperties;
  disablePreview?: boolean;
  showRank?: boolean;
}) {
  return (
    <section style={{ ...styles.section, ...sectionStyle }}>
      {!hideHeader ? (
        <div style={styles.head}>
          <div style={styles.leftGroup}>
            <h2 style={styles.title}>{title}</h2>
            {headerRight ? (
              <div style={styles.headerRight}>{headerRight}</div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div style={styles.track}>
        {items.map((item, index) => {
          const itemHref =
            item.href ??
            (item.media_type === 'tv' ? `/tv/${item.id}` : `/movie/${item.id}`);

          const itemMediaType =
            item.media_type === 'tv' ? 'TV Show' : 'Movie';

          return (
            <div
              key={`${item.media_type ?? 'movie'}-${item.id}`}
              style={styles.item}
            >
              <MediaCard
                item={item}
                href={itemHref}
                rank={showRank ? index + 1 : undefined}
                mediaType={itemMediaType}
                watchlistMode={watchlistMode}
                continueWatchingMode={continueWatchingMode}
                disablePreview={disablePreview}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    maxWidth: '1440px',
    marginTop: 0,
    marginRight: 'auto',
    marginBottom: '34px',
    marginLeft: 'auto',
  },
  head: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '16px',
  },
  leftGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    minWidth: 0,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  title: {
    margin: 0,
    fontSize: '1.55rem',
    fontWeight: 800,
    letterSpacing: '-0.04em',
    color: 'rgba(255,255,255,0.96)',
  },
  more: {
    marginLeft: 'auto',
    color: 'rgba(245,247,251,0.62)',
    fontSize: '0.92rem',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  },
  track: {
    display: 'flex',
    gap: '18px',
    overflowX: 'auto',
    padding: '2px 2px 10px',
    scrollSnapType: 'x proximity',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
  },
  item: {
    flex: '0 0 168px',
    scrollSnapAlign: 'start',
  },
};