'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { UserMenu } from '@/components/user-menu';
import { SearchClient } from '@/app/search/search-client';

export function Navbar({
  displayName,
  avatarUrl,
  createdAt,
}: {
  displayName: string;
  avatarUrl?: string | null;
  createdAt?: string | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, []);

  return (
    <>
      <header className="nav-liquid flex flex-col items-center justify-between px-4 py-2">
        <div className="nav-left">
          <Link href="/" className="brand-mark" aria-label="Strema home">
            <div className="h-3 w-3 rounded-full bg-red-500 ring-4 ring-red-500/20 shadow-[0_0_22px_rgba(239,68,68,0.95)]" />
            <span className="brand-mark__text">Strema</span>
          </Link>
        </div>

        <nav className="nav-center" aria-label="Primary">
          <Link href="/" className="nav-icon" aria-label="Home">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5.5a1 1 0 0 1-1-1v-4.5h-3V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
            </svg>
          </Link>

          <Link href="/browse" className="nav-icon" aria-label="Browse">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 5h16v4H4zm0 5h10v4H4zm0 5h16v4H4z" />
            </svg>
          </Link>

          <button
            type="button"
            className="nav-icon"
            aria-label="Search"
            onClick={() => setSearchOpen(true)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10.5 4a6.5 6.5 0 1 0 4.11 11.56l4.41 4.41 1.41-1.41-4.41-4.41A6.5 6.5 0 0 0 10.5 4m0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9" />
            </svg>
          </button>
        </nav>

        <div className="nav-right" ref={menuRef}>
          <button
            className="avatar-button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Open profile menu"
            aria-expanded={menuOpen}
            type="button"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={`${displayName} avatar`} />
            ) : (
              <span>{displayName.slice(0, 1).toUpperCase()}</span>
            )}
          </button>

          <div className={`menu-pop ${menuOpen ? 'menu-pop--open' : ''}`}>
            <UserMenu
              displayName={displayName}
              avatarUrl={avatarUrl}
              createdAt={createdAt}
              onClose={() => setMenuOpen(false)}
            />
          </div>
        </div>
      </header>

      {mounted && searchOpen ? (
        <SearchClient overlay onClose={() => setSearchOpen(false)} />
      ) : null}
    </>
  );
}