'use client';

import { useEffect, useState } from 'react';

export function RatingNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const STORAGE_KEY = 'strema-rating-notice-last-shown';

    try {
      const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
      const lastShown = localStorage.getItem(STORAGE_KEY);

      if (lastShown === today) {
        // already shown today -> keep closed
        setOpen(false);
      } else {
        // first visit today -> show and record
        setOpen(true);
        localStorage.setItem(STORAGE_KEY, today);
      }
    } catch {
      // if localStorage fails, fall back to showing it
      setOpen(true);
    }
  }, []);

  if (!open) return null;

  return (
    <div style={s.overlay}>
      {/* Ambient cinematic glows */}
      <div style={s.redGlowOne} />
      <div style={s.redGlowTwo} />
      <div style={s.whiteGlow} />

      <div
        className="rating-notice-card"
        style={s.card}>
        {/* Premium border glow */}
        <div style={s.borderGlow} />

        <button
          onClick={() => setOpen(false)}
          style={s.close}
          aria-label="Close"
        >
          ✕
        </button>

        {/* Top branding */}
        <div style={s.topRow}>
          <div style={s.netflixMark} />
          <span style={s.brand}>STREMA</span>
        </div>

        {/* Floating badge */}
        <div style={s.badge}>
          TMDB POWERED
        </div>

        {/* Hero title */}
        <h2 style={s.title}>
          Ratings may differ
          <br />
          from IMDb
        </h2>

        {/* Description */}
        <p style={s.text}>
          Strema currently uses TMDB ratings, popularity
          scores, and metadata.
          <br />
          <br />
          Some movies and TV show ratings may not exactly
          match IMDb ratings.
        </p>

        {/* Footer glass panel */}
        <div style={s.footerCard}>
          <div style={s.footerDot} />
          <span style={s.footerText}>
            Cinematic experience optimized for speed &
            discovery
          </span>
        </div>

        {/* Buttons */}
        <div style={s.buttonRow}>
          <button
            onClick={() => setOpen(false)}
            style={s.primaryButton}
          >
            Continue Watching
          </button>

          <button
            onClick={() => setOpen(false)}
            style={s.secondaryButton}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

const glass =
  'linear-gradient(180deg, rgba(17,17,17,0.86), rgba(5,5,5,0.96))';

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 999999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',

    overflow: 'hidden',

    padding:
      'max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))',

    background:
      'radial-gradient(circle at top, rgba(120,0,0,.18), rgba(0,0,0,.92) 58%)',

    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',

    animation: 'fadeIn .35s ease',
  },

  redGlowOne: {
    position: 'absolute',
    top: '-10%',
    left: '-5%',

    width: 'clamp(220px, 32vw, 420px)',
    height: 'clamp(220px, 32vw, 420px)',

    borderRadius: '999px',
    background: 'rgba(229,9,20,.22)',
    filter: 'blur(140px)',

    pointerEvents: 'none',
  },

  redGlowTwo: {
    position: 'absolute',
    bottom: '-15%',
    right: '-5%',

    width: 'clamp(260px, 38vw, 520px)',
    height: 'clamp(260px, 38vw, 520px)',

    borderRadius: '999px',
    background: 'rgba(255,0,85,.14)',
    filter: 'blur(160px)',

    pointerEvents: 'none',
  },

  whiteGlow: {
    position: 'absolute',
    top: '20%',
    right: '15%',

    width: 'clamp(180px, 24vw, 280px)',
    height: 'clamp(180px, 24vw, 280px)',

    borderRadius: '999px',
    background: 'rgba(255,255,255,.06)',
    filter: 'blur(120px)',

    pointerEvents: 'none',
  },

  card: {
    position: 'relative',

    width: 'clamp(320px, 92vw, 560px)',

    maxHeight: '90vh',

    overflowX: 'hidden',
    overflowY: 'auto',

    WebkitOverflowScrolling: 'touch',

    borderRadius: 'clamp(24px, 3vw, 38px)',

    padding: 'clamp(18px, 5vw, 42px)',

    background:
      'linear-gradient(180deg, rgba(17,17,17,.86), rgba(5,5,5,.96))',

    border: '1px solid rgba(255,255,255,.08)',

    boxShadow:
      '0 30px 120px rgba(0,0,0,.78), inset 0 1px 0 rgba(255,255,255,.08)',

    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',

    animation:
      'fadeUp .45s cubic-bezier(.22,1,.36,1)',

    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  },

  borderGlow: {
    position: 'absolute',

    inset: 0,

    borderRadius: 'inherit',

    padding: '1px',

    background:
      'linear-gradient(135deg, rgba(229,9,20,.72), rgba(255,255,255,.08), rgba(229,9,20,.22))',

    WebkitMask:
      'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',

    WebkitMaskComposite: 'xor',

    pointerEvents: 'none',
  },

  close: {
    position: 'absolute',

    top: 'clamp(14px, 2vw, 18px)',
    right: 'clamp(14px, 2vw, 18px)',

    width: 'clamp(36px, 8vw, 48px)',
    height: 'clamp(36px, 8vw, 48px)',

    borderRadius: '999px',

    border: '1px solid rgba(255,255,255,.08)',

    background: 'rgba(255,255,255,.05)',

    color: '#fff',

    cursor: 'pointer',

    fontSize: 'clamp(.85rem, 2vw, 1rem)',
    fontWeight: 700,

    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  },

  topRow: {
    display: 'flex',
    alignItems: 'center',

    gap: '10px',

    marginBottom: 'clamp(16px, 2vw, 20px)',
  },

  netflixMark: {
    width: '12px',
    height: '12px',

    borderRadius: '999px',

    background: '#E50914',

    boxShadow:
      '0 0 20px rgba(229,9,20,.95)',
  },

  brand: {
    color: '#fff',

    fontWeight: 900,

    letterSpacing: '.24em',

    fontSize: 'clamp(.72rem, 1vw, .85rem)',
  },

  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',

    padding:
      'clamp(7px,1vw,10px) clamp(12px,2vw,16px)',

    borderRadius: '999px',

    background:
      'linear-gradient(135deg, rgba(229,9,20,.18), rgba(255,255,255,.06))',

    border: '1px solid rgba(255,255,255,.06)',

    color: '#fca5a5',

    fontWeight: 700,

    fontSize: 'clamp(.68rem,1vw,.78rem)',

    letterSpacing: '.12em',

    marginBottom: 'clamp(18px,2vw,22px)',

    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
  },

  title: {
    margin: '0 0 18px',

    color: '#fff',

    fontWeight: 660,

    lineHeight: .95,

    letterSpacing: '-.07em',

    fontSize: 'clamp(1.8rem, 5vw, 2rem)',

    textShadow:
      '0 10px 40px rgba(0,0,0,.45)',
  },

  text: {
    margin: '0 0 clamp(24px,3vw,30px)',

    color: 'rgba(255,255,255,.72)',

    fontSize: 'clamp(.9rem,2vw,1.05rem)',

    lineHeight: 1.8,

    fontWeight: 400,
  },

  footerCard: {
    display: 'flex',
    alignItems: 'flex-start',

    gap: '12px',

    padding: 'clamp(14px,2vw,18px)',

    marginBottom: 'clamp(24px,3vw,30px)',

    borderRadius: '22px',

    background:
      'linear-gradient(135deg, rgba(255,255,255,.05), rgba(255,255,255,.03))',

    border: '1px solid rgba(255,255,255,.06)',

    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
  },

  footerDot: {
    width: '10px',
    height: '10px',

    marginTop: '5px',

    borderRadius: '999px',

    background: '#E50914',

    flexShrink: 0,

    boxShadow:
      '0 0 14px rgba(229,9,20,.8)',
  },

  footerText: {
    color: 'rgba(255,255,255,.68)',

    fontSize: 'clamp(.82rem,1.5vw,.95rem)',

    lineHeight: 1.7,
  },

  buttonRow: {
    display: 'grid',

    gridTemplateColumns:
      'repeat(auto-fit,minmax(180px,1fr))',

    gap: '12px',

    width: '100%',
  },

  primaryButton: {
    width: '100%',

    height: 'clamp(48px,6vw,56px)',

    borderRadius: '20px',

    border: 'none',

    background:
      'linear-gradient(135deg,#E50914 0%,#ff3341 100%)',

    color: '#fff',

    fontWeight: 800,

    fontSize: 'clamp(.92rem,1vw,1rem)',

    cursor: 'pointer',

    boxShadow:
      '0 20px 45px rgba(229,9,20,.34)',
  },

  secondaryButton: {
    width: '100%',

    height: 'clamp(48px,6vw,56px)',

    borderRadius: '20px',

    border: '1px solid rgba(255,255,255,.08)',

    background: 'rgba(255,255,255,.05)',

    color: '#fff',

    fontWeight: 700,

    fontSize: 'clamp(.9rem,1vw,.96rem)',

    cursor: 'pointer',

    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
  },
};