'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function SignInCard() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError('');

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      setError(error.message);
    } else {
      router.push('/');
    }

    setLoading(false);
  }

  return (
    <div style={s.page}>
      {/* Ambient cinematic glow */}
      <div style={s.redGlowOne} />
      <div style={s.redGlowTwo} />
      <div style={s.whiteGlow} />

      <form style={s.card} onSubmit={onSubmit}>
        {/* Border glow */}
        <div style={s.borderGlow} />

        <div style={s.topRow}>
          <div style={s.netflixMark} />
          <span style={s.brand}>STREMA</span>
        </div>

        <div style={s.badge}>
          WELCOME BACK
        </div>

        <h1 style={s.title}>
          Continue watching
        </h1>

        <p style={s.subtitle}>
          Sign in to continue your cinematic
          experience on Strema.
        </p>

        <div style={s.fieldWrap}>
          <label style={s.label}>
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            placeholder="you@example.com"
            required
            style={s.input}
          />
        </div>

        <div style={s.fieldWrap}>
          <label style={s.label}>
            Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="••••••••"
            required
            style={s.input}
          />
        </div>

        {error && (
          <div style={s.error}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={s.primaryButton}
        >
          {loading
            ? 'Signing in...'
            : 'Sign in'}
        </button>

        <a
          href="/auth/sign-up"
          style={s.link}
        >
          Create account
        </a>
      </form>
    </div>
  );
}

export function SignUpCard() {
  const router = useRouter();
  const supabase = createClient();

  const [displayName, setDisplayName] =
    useState('');
  const [email, setEmail] =
    useState('');
  const [password, setPassword] =
    useState('');
  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState('');

  async function onSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setLoading(true);
    setError('');

    const { error } =
      await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      });

    if (error) {
      setError(error.message);
    } else {
      router.push('/auth/sign-in');
    }

    setLoading(false);
  }

  return (
    <div style={s.page}>
      {/* Ambient cinematic glow */}
      <div style={s.redGlowOne} />
      <div style={s.redGlowTwo} />
      <div style={s.whiteGlow} />

      <form style={s.card} onSubmit={onSubmit}>
        {/* Border glow */}
        <div style={s.borderGlow} />

        <div style={s.topRow}>
          <div style={s.netflixMark} />
          <span style={s.brand}>STREMA</span>
        </div>

        <div style={s.badge}>
          CREATE ACCOUNT
        </div>

        <h1 style={s.title}>
          Start your journey
        </h1>

        <p style={s.subtitle}>
          Create your account and enter the
          world of movies & TV shows.
        </p>

        <div style={s.fieldWrap}>
          <label style={s.label}>
            Display Name
          </label>

          <input
            value={displayName}
            onChange={(e) =>
              setDisplayName(
                e.target.value
              )
            }
            placeholder="Anmol"
            required
            style={s.input}
          />
        </div>

        <div style={s.fieldWrap}>
          <label style={s.label}>
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            placeholder="you@example.com"
            required
            style={s.input}
          />
        </div>

        <div style={s.fieldWrap}>
          <label style={s.label}>
            Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
            placeholder="••••••••"
            required
            style={s.input}
          />
        </div>

        {error && (
          <div style={s.error}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={s.primaryButton}
        >
          {loading
            ? 'Creating account...'
            : 'Create account'}
        </button>

        <a
          href="/auth/sign-in"
          style={s.link}
        >
          I already have an account
        </a>
      </form>
    </div>
  );
}

const glass =
  'linear-gradient(180deg, rgba(17,17,17,0.86), rgba(5,5,5,0.96))';

const s: Record<string, React.CSSProperties> =
  {
    page: {
    position: 'relative',
    height: '100vh',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: '30px',
    background:
      'radial-gradient(circle at top, rgba(120,0,0,0.18), rgba(0,0,0,0.94) 58%)',
  },

    redGlowOne: {
      position: 'absolute',
      top: '-120px',
      left: '-120px',
      width: '360px',
      height: '360px',
      borderRadius: '999px',
      background:
        'rgba(229,9,20,0.24)',
      filter: 'blur(140px)',
      pointerEvents: 'none',
    },

    redGlowTwo: {
      position: 'absolute',
      bottom: '-180px',
      right: '-120px',
      width: '440px',
      height: '440px',
      borderRadius: '999px',
      background:
        'rgba(255,0,85,0.14)',
      filter: 'blur(160px)',
      pointerEvents: 'none',
    },

    whiteGlow: {
      position: 'absolute',
      top: '20%',
      right: '15%',
      width: '240px',
      height: '240px',
      borderRadius: '999px',
      background:
        'rgba(255,255,255,0.05)',
      filter: 'blur(120px)',
      pointerEvents: 'none',
    },

    ccard: {
      position: 'relative',
      width: '100%',
      maxWidth: '460px',
      borderRadius: '32px',
      padding: '30px',
      overflow: 'hidden',
      background: glass,
      border:
        '1px solid rgba(255,255,255,0.08)',
      boxShadow:
        '0 30px 120px rgba(0,0,0,0.78), inset 0 1px 0 rgba(255,255,255,0.08)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter:
        'blur(24px)',
    },

    // borderGlow: {
    //   position: 'absolute',
    //   inset: '-1px',
    //   borderRadius: '36px',
    //   padding: '1px',
    //   background:
    //     'linear-gradient(135deg, rgba(229,9,20,0.72), rgba(255,255,255,0.08), rgba(229,9,20,0.22))',
    //   WebkitMask:
    //     'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    //   WebkitMaskComposite: 'xor',
    //   pointerEvents: 'none',
    // },

    topRow: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '22px',
    },

    netflixMark: {
      width: '13px',
      height: '13px',
      borderRadius: '999px',
      background: '#E50914',
      boxShadow:
        '0 0 20px rgba(229,9,20,0.95)',
    },

    brand: {
      color: '#ffffff',
      fontWeight: 900,
      letterSpacing: '0.26em',
      fontSize: '0.76rem',
    },

    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '8px 15px',
      borderRadius: '999px',
      background:
        'linear-gradient(135deg, rgba(229,9,20,0.18), rgba(255,255,255,0.06))',
      border:
        '1px solid rgba(255,255,255,0.06)',
      color: '#fca5a5',
      fontWeight: 700,
      fontSize: '0.72rem',
      letterSpacing: '0.12em',
      marginBottom: '20px',
      backdropFilter: 'blur(14px)',
    },

    title: {
      margin: '0 0 16px',
      color: '#ffffff',
      fontWeight: 950,
      lineHeight: 0.95,
      letterSpacing: '-0.02em',
      fontSize:
        'clamp(1.9rem, 4vw, 3rem)',
      textShadow:
        '0 10px 40px rgba(0,0,0,0.45)',
    },

    subtitle: {
      margin: '0 0 28px',
      color: 'rgba(255,255,255,0.72)',
      fontSize: '1rem',
      lineHeight: 1.8,
    },

    fieldWrap: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      marginBottom: '14px',
    },

    label: {
      color: '#ffffff',
      fontSize: '0.92rem',
      fontWeight: 600,
      paddingLeft: '4px',
    },

    input: {
      width: '100%',
      height: '58px',
      borderRadius: '18px',
      border:
        '1px solid rgba(255,255,255,0.08)',
      background:
        'rgba(255,255,255,0.04)',
      padding: '0 18px',
      color: '#ffffff',
      fontSize: '0.96rem',
      outline: 'none',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter:
        'blur(16px)',
      transition:
        'border 0.22s ease, background 0.22s ease',
    },

    error: {
      marginTop: '4px',
      marginBottom: '18px',
      padding: '14px 16px',
      borderRadius: '16px',
      background:
        'rgba(239,68,68,0.12)',
      border:
        '1px solid rgba(239,68,68,0.18)',
      color: '#fca5a5',
      fontSize: '0.9rem',
      lineHeight: 1.6,
    },

    primaryButton: {
      width: '100%',
      height: '58px',
      borderRadius: '20px',
      border: 'none',
      background:
        'linear-gradient(135deg, #E50914 0%, #ff3341 100%)',
      color: '#ffffff',
      fontWeight: 800,
      fontSize: '0.98rem',
      cursor: 'pointer',
      marginTop: '8px',
      boxShadow:
        '0 20px 45px rgba(229,9,20,0.34)',
      transition:
        'transform 0.22s ease',
    },

    link: {
      display: 'block',
      marginTop: '22px',
      textAlign: 'center',
      color: 'rgba(255,255,255,0.72)',
      textDecoration: 'none',
      fontSize: '0.94rem',
      fontWeight: 500,
    },
  };