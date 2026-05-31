import { createClient } from '@/lib/supabase/server';

export type SessionUser = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, created_at')
    .eq('id', user.id)
    .maybeSingle();

  return {
    id: user.id,
    displayName:
      profile?.display_name ??
      (user.user_metadata as any)?.display_name ??
      user.email?.split('@')[0] ??
      'User',
    avatarUrl:
      profile?.avatar_url ??
      (user.user_metadata as any)?.avatar_url ??
      null,
    createdAt: profile?.created_at ?? user.created_at ?? null,
  };
}