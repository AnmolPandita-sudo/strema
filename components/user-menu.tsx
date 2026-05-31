'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function UserMenu({
  displayName,
  avatarUrl,
  createdAt,
  onClose,
}: {
  displayName: string;
  avatarUrl?: string | null;
  createdAt?: string | null;
  onClose?: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    onClose?.();
    router.push('/auth/sign-in');
    router.refresh();
  }

  return (
    <div className="profile-menu glass-panel">
      <div className="profile-menu__top">
        <strong>{displayName}</strong>
        <span suppressHydrationWarning>
          {createdAt
            ? `Member since ${new Date(createdAt).toISOString().slice(0, 10)}`
            : 'Member since —'}
        </span>
      </div>

      <Link href="/profile" className="menu-row" onClick={onClose}>
        Profile settings
      </Link>

      <Link href="/insights" className="menu-row" onClick={onClose}>
        Account Analytics
      </Link>

      <button className="menu-row menu-danger" onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}