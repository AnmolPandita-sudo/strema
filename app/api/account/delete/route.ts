import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const AVATAR_BUCKET = 'avatars';

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  try {
    const userId = user.id;

    const { data: avatarFiles } = await admin.storage
      .from(AVATAR_BUCKET)
      .list(userId, {
        limit: 100,
      });

    if (avatarFiles?.length) {
      const filePaths = avatarFiles.map((file) => `${userId}/${file.name}`);
      await admin.storage.from(AVATAR_BUCKET).remove(filePaths);
    }

    await admin.from('watch_history').delete().eq('user_id', userId);
    await admin.from('watchlist').delete().eq('user_id', userId);
    await admin.from('profiles').delete().eq('id', userId);

    const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      return NextResponse.json(
        { error: deleteUserError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to delete account',
      },
      { status: 500 }
    );
  }
}