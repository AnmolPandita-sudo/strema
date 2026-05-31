'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut({ scope: 'local' });
    router.push('/auth/sign-in');
    router.refresh();
  }

  return <button className="nav-logout" onClick={handleSignOut}>Logout</button>;
}