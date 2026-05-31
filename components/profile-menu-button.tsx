'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { UserMenu } from '@/components/user-menu';

export function ProfileMenuButton({
  displayName,
  avatarUrl,
  createdAt,
  className = '',
}: {
  displayName?: string | null;
  avatarUrl?: string | null;
  createdAt?: string | null;
  className?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const safeDisplayName = useMemo(() => {
    const value = displayName?.trim();
    return value && value.length > 0 ? value : 'User';
  }, [displayName]);

  const initial = safeDisplayName.slice(0, 1).toUpperCase();

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
    <div ref={menuRef} className={className}>
      <button
        className="avatar-button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Open profile menu"
        aria-expanded={menuOpen}
        type="button"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={`${safeDisplayName} avatar`} />
        ) : (
          <span>{initial}</span>
        )}
      </button>

      <div className={`menu-pop ${menuOpen ? 'menu-pop--open' : ''}`}>
        <UserMenu
          displayName={safeDisplayName}
          avatarUrl={avatarUrl}
          createdAt={createdAt}
          onClose={() => setMenuOpen(false)}
        />
      </div>
    </div>
  );
}