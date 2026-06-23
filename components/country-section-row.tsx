'use client';

import Link from 'next/link';
import { ReactNode, useState } from 'react';

export type CountryItem = {
  iso: string;
  name: string;
  flag: string;
};

export function CountrySectionRow({
  title,
  countries,
  sectionStyle,
}: {
  title: ReactNode;
  countries: CountryItem[];
  sectionStyle?: React.CSSProperties;
}) {
  return (
    <section style={{ ...styles.section, ...sectionStyle }}>
      <div style={styles.head}>
        <div style={styles.leftGroup}>
          <h2 style={styles.title}>{title}</h2>
        </div>
      </div>

      <div style={styles.track}>
        {countries.map((country) => (
          <div key={country.iso} style={styles.item}>
            <CountryCard country={country} />
          </div>
        ))}
      </div>
    </section>
  );
}

// Extracted to handle individual hover states cleanly
function CountryCard({ country }: { country: CountryItem }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link
      href={`/browse?country=${country.iso}`}
      style={{
        ...styles.card,
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        background: isHovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
        borderColor: isHovered ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span
        style={{
          ...styles.flag,
          transform: isHovered ? 'scale(1.15)' : 'scale(1)',
        }}
      >
        {country.flag}
      </span>
      <span
        style={{
          ...styles.name,
          color: isHovered ? '#e53935' : 'rgba(245,247,251,0.95)',
        }}
      >
        {country.name}
      </span>
    </Link>
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
  title: {
    margin: 0,
    fontSize: '1.55rem',
    fontWeight: 800,
    letterSpacing: '-0.04em',
    color: 'rgba(255,255,255,0.96)',
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
    flex: '0 0 168px', // Matches your media card width exactly
    scrollSnapAlign: 'start',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '110px', // Nice compact size for text/icons
    borderRadius: '16px',
    border: '1px solid',
    color: 'inherit',
    textDecoration: 'none',
    transition: 'all 220ms cubic-bezier(.22,1,.36,1)',
    boxShadow: '0 10px 24px rgba(0,0,0,0.22)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  },
  flag: {
    fontSize: '2.2rem',
    marginBottom: '8px',
    transition: 'transform 220ms ease',
    filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))',
  },
  name: {
    fontSize: '0.98rem',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    transition: 'color 220ms ease',
  },
};