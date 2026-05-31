import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

type PreferencesPayload = {
  preferredProvider?: string | null;
  preferredServer?: string | null;
  subtitleLanguage?: string | null;
  audioLanguage?: string | null;
  playbackSpeed?: number | null;
  autoplay?: boolean | null;
};

async function getSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );
}

export async function GET() {
  try {
    const supabase = await getSupabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('playback_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      preferences: data ?? {
        user_id: user.id,
        preferred_provider: null,
        preferred_server: null,
        subtitle_language: null,
        audio_language: null,
        playback_speed: 1,
        autoplay: false,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as PreferencesPayload;

    const payload = {
      user_id: user.id,
      preferred_provider: body.preferredProvider ?? null,
      preferred_server: body.preferredServer ?? null,
      subtitle_language: body.subtitleLanguage ?? null,
      audio_language: body.audioLanguage ?? null,
      playback_speed:
        typeof body.playbackSpeed === 'number' && body.playbackSpeed > 0
          ? body.playbackSpeed
          : 1,
      autoplay: Boolean(body.autoplay ?? false),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('playback_preferences')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to save preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, preferences: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected server error' },
      { status: 500 }
    );
  }
}